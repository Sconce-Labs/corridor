# Corridor — Architecture (Stellar-native; issuer-signed statements)

_Last updated: 2026-09-10. Supersedes the shared-Merkle-root "hybrid" design in
earlier commits — see [`docs/CREDENTIAL_ACCUMULATOR.md`](./docs/CREDENTIAL_ACCUMULATOR.md)
for why it was dropped (BLS12-381 vs BN254 field mismatch, non-functional
revocation)._

Corridor is a **portable proof of eligibility** for cross-border payment
corridors. A holder proves once — to a regulated issuer — that they are KYC/AML
cleared, then reuses a zero-knowledge proof of that fact across any number of
payment providers ("corridors") **without re-uploading documents and without
revealing their identity**.

> **Status of this document:** it describes the **Option B** design, which is
> implemented across the circuit, SDK and Soroban contracts (25 + 18 + 23 tests
> green). Still mocked: on-chain ZK verification (M3). Still unbuilt: the
> fee-sponsoring tx-relayer (M6) and a frontend (M6). The testnet deployment
> predates Option B and needs a redeploy (M2).

The design is **Stellar-native**. The only cross-network dependency is a plain
public **issuer directory** on Midnight — no shared roots, no state sync, no
relayer between the chains.

| Layer | Where | Role |
|-------|-------|------|
| **KYC & credential issuance** | Issuer (off-chain) + optionally Midnight | The issuer runs KYC once, then **signs** a short-lived statement about the holder with a Grumpkin key. Nothing per-credential is stored on any chain. |
| **Eligibility proof** | **Noir → UltraHonk** (client-side) | The holder proves knowledge of a valid issuer signature over a statement meeting the corridor's policy, plus a per-corridor nullifier — revealing nothing else. |
| **Policy, verification, attestation, settlement** | **Stellar / Soroban** (Rust) | Corridor operators register policy. The proof is verified on-chain via Protocol 25 primitives (real verifier = M3; a mock stands in today). A pass is attested, the nullifier is burned, and payment is gated on the result. |
| **Issuer transparency** | **Midnight** (Compact) | A public registry: the licensed issuers and each issuer's current credential epoch (the bulk-revocation dial). No holder data. |

---

## 1. Actors

- **Issuer** — a bank, licensed KYC provider, or NGO. Runs KYC once off-chain,
  then signs credential statements with a Grumpkin key. Never becomes a data
  custodian for downstream corridors.
- **Holder** — the migrant worker / aid recipient / remittance sender. Holds one
  signed statement, presents many proofs.
- **Corridor operator** — a remittance anchor, lending pool, or aid-disbursement
  program on Stellar. Registers a policy, consumes proofs, gates payouts.
- **Auditor** — a regulator with a warrant. Can, for a *specific* flagged pass,
  learn the disclosed attributes — and nothing about anyone else.
- **Tx-relayer** (M6, see §6) — submits `enter` transactions on the holder's
  behalf so the holder's Stellar account is never linked to a pass. This is the
  *only* "relayer" in the design; the old root-sync relayer is gone.

---

## 2. Data model

### The credential — an issuer signature, held by the holder

The issuer, after KYC, computes

```
holder_binding  = Poseidon2([holder_secret, salt])           // issuer never sees holder_secret
statement       = Poseidon2([holder_binding, tier, expiry, cred_epoch])
(s, e)          = Schnorr_sign(issuer_grumpkin_sk, statement) // noir-lang/schnorr v0.4.0
```

and hands the holder `{ tier, expiry, cred_epoch, salt, issuer_pubkey, (s, e) }`.
The holder keeps `holder_secret` (CSPRNG, 32 bytes) private and never shares it —
it is load-bearing for both hiding and cross-corridor unlinkability.

Nothing here is written to a chain. "Portable" means *re-present the signed
statement*, not *prove tree membership*.

### On Midnight (`corridor.compact`, public ledger)

| Field | Type | Meaning |
|-------|------|---------|
| `admin` | `Bytes<32>` | governance key hash |
| `issuers` | `Set<Bytes<32>>` | registered issuer ids; `issuer_id = Poseidon2(pk.x, pk.y)` |
| `issuerAuth` | `Map<Bytes<32>, Bytes<32>>` | issuer id → hash of the issuer's Midnight control secret |
| `issuerEpoch` | `Map<Bytes<32>, Uint<64>>` | issuer id → current credential epoch (monotonic, starts at 1) |
| `attested` | `Counter` | total statements issuers report signing (transparency only) |

### On Stellar (Soroban storage)

`corridor_registry`:

| Key | Value |
|-----|-------|
| `Policy(corridor_id)` | `CorridorPolicy { operator, accepted_issuers, min_tier, required_disclosures, min_cred_epoch, verifier, vk_hash, auditor_pubkey, now_tolerance_secs, paused }` |
| `Admin` / `PendingAdmin` | registry admin (two-step transfer) |

`accepted_issuers` holds `Poseidon2(pk.x, pk.y)` ids — the same ids the circuit
binds and Midnight registers.

`corridor_attestation`:

| Key | Value |
|-----|-------|
| `Nullifier(corridor_id, nullifier)` | `PassRecord { tag, ledger, timestamp, auditor_blob }` |
| `Passes(corridor_id)` | `u64` aggregate count |
| `Registry` | address of `corridor_registry` |

---

## 3. Flows

### 3.1 Issuance (off-chain)

```
Holder ──KYC docs──▶ Issuer  (off-chain, one time)
Issuer:  holder_binding = Poseidon2([holder_secret, salt])       (holder supplies holder_binding, not holder_secret)
         statement      = Poseidon2([holder_binding, tier, expiry, cred_epoch])
         (s, e)         = Schnorr_sign(issuer_sk, statement)
Issuer ──▶ Holder: { tier, expiry, cred_epoch, salt, issuer_pubkey, (s, e) }
```

No transaction. Optionally the issuer bumps `attested` on Midnight for public
volume transparency.

### 3.2 Issuer registration (Midnight, one time per issuer)

```
Admin ──registerIssuer(adminSk, issuer_id, ctlHash)──▶ corridor.compact
Operator ──register(corridor_id, CorridorPolicy{ accepted_issuers: [issuer_id, ...], ... })──▶ corridor_registry (Stellar)
```

### 3.3 Entering a corridor (the core flow)

```
Holder opens the corridor operator's app, picks corridor C.

1. App fetches Policy(C) from corridor_registry →
   { accepted_issuers, min_tier, min_cred_epoch, auditor_pubkey, verifier,
     vk_hash, now_tolerance_secs, paused }.

2. The SDK builds the Noir witness locally (buildWitness):
     private: holder_secret, tier, expiry, cred_epoch, salt,
              issuer_pk_x, issuer_pk_y, sig_s_lo/hi, sig_e_lo/hi, auditor_nonce
     public:  corridor_id, min_tier, now, nullifier, disclosed_tag,
              issuer_id, min_cred_epoch, auditor_pubkey, auditor_blob
   buildWitness re-runs every circuit check first (verifyWitnessLocally) and
   fails locally before proving if anything is wrong.

3. Circuit proves (§4). UltraHonk proof generated locally.

4. App submits corridor_attestation.enter(corridor_id, proof, public_inputs):
     a. load Policy(corridor_id); assert not paused
     b. assert pi.corridor_id     == corridor_id
        && pi.min_tier            == policy.min_tier
        && pi.issuer_id           ∈  policy.accepted_issuers
        && pi.min_cred_epoch      == policy.min_cred_epoch
        && pi.auditor_pubkey      == policy.auditor_pubkey
        && |ledger.timestamp - pi.now| <= policy.now_tolerance_secs
     c. verifier.verify(policy.vk_hash, proof, public_inputs)   ← Protocol 25 BN254 pairing (M3)
     d. assert Nullifier(corridor_id, nullifier) not present
     e. store Nullifier(corridor_id, nullifier) = PassRecord{ tag, ledger, timestamp, auditor_blob }
     f. Passes(corridor_id) += 1
     g. emit PASS_GRANTED(corridor_id, tag, nullifier)

5. Corridor operator's payout contract calls
   corridor_attestation.is_cleared(corridor_id, nullifier) → true, releases funds.
```

What a Stellar observer sees: corridor C granted a pass tagged `"tier-2-remit"`;
`passes` went up by 1; a random-looking nullifier was burned. **Not** the
holder's Stellar address (submitted via the tx-relayer, §6), tier, issuer, or
identity.

### 3.4 Revocation

Two mechanisms, no accumulator:

1. **Short expiry (primary).** `expiry` is days, not years. The issuer simply
   stops re-signing a revoked holder. The circuit enforces `expiry > now`.
2. **Epoch floor (bulk).** The issuer publishes a higher `cred_epoch` — on
   Midnight via `corridor.compact.bumpEpoch`, and operators raise their policy's
   `min_cred_epoch` on Stellar via `corridor_registry.set_min_cred_epoch`
   (monotonic; regressions rejected). The circuit enforces
   `cred_epoch >= min_cred_epoch` and `enter()` binds the public value to the
   policy. This invalidates every statement signed under an older epoch.

Targeted single-credential revocation (a small on-Stellar IMT) is designed in
`docs/CREDENTIAL_ACCUMULATOR.md` but deferred — short expiry covers the pilot.

Already-granted passes are not retroactively revoked; operators re-check
`is_cleared` for continuous assurance.

### 3.5 Audit

At proof time the holder binds `auditor_blob = Poseidon2([auditor_pubkey, tier,
issuer_id, nullifier, auditor_nonce])` and passes it as a public input (stored
in the `PassRecord`). `auditor_pubkey` is a **policy field** the contract binds —
the holder cannot substitute their own. A regulator holding the auditor secret
can recover `{tier, issuer_id}` for exactly the records they have a warrant for
(by re-deriving the blob over the candidate values). No global unmasking, no
issuer involvement.

> The current `auditor_blob` is a binding commitment, not an encryption. A
> production build would use a proper encryption-to-`auditor_pubkey` here; the
> commitment already prevents holder-chosen or cross-record forgery.

---

## 4. The Noir circuit (repo: [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits))

**Private inputs:** `holder_secret, tier, expiry, cred_epoch, salt,
issuer_pk_x, issuer_pk_y, sig_s_lo, sig_s_hi, sig_e_lo, sig_e_hi, auditor_nonce`

**Public inputs (9):** `corridor_id, min_tier, now, nullifier, disclosed_tag,
issuer_id, min_cred_epoch, auditor_pubkey, auditor_blob`

**Constraints** (`eligibility::check`):

1. `holder_binding   = Poseidon2([holder_secret, salt])`
2. `statement        = Poseidon2([holder_binding, tier, expiry, cred_epoch])`
3. `schnorr::verify_signature(pk, (s, e), statement)` — Grumpkin, Poseidon2
   challenge, `DST = poseidon2_hash_bytes("schnorr_grumpkin_poseidon2")`
4. `Poseidon2([issuer_pk_x, issuer_pk_y]) == issuer_id`
5. `tier >= min_tier`
6. `expiry > now`
7. `cred_epoch >= min_cred_epoch`
8. `nullifier == Poseidon2([holder_secret, corridor_id])`
9. `disclosed_tag < MAX_TAG`
10. `auditor_blob == Poseidon2([auditor_pubkey, tier, issuer_id, nullifier, auditor_nonce])`

`issuer_id ∈ accepted_issuers` is checked **on Soroban** against the policy (a
short list), not in-circuit, to keep the circuit fixed-size across corridors.

Grumpkin is Barretenberg's embedded curve for BN254, so the signature check is
native — no non-native field arithmetic. Cost: **73 ACIR opcodes** (the
Merkle-inclusion design was ~3200). Proving system: **UltraHonk**, verified by
the `ultrahonk_verifier` Soroban contract (M3); `vk_hash` on the policy pins
which VK a corridor trusts.

---

## 5. Soroban contracts (repo: [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts))

```
corridor-contracts/
├── Cargo.toml                         workspace, soroban-sdk 25.3
├── ABI.md                             source of truth for the PI_* public-input layout
├── crates/corridor_types/             shared types: CorridorPolicy, PassRecord, PublicInputs, errors
├── contracts/corridor_registry/       policy CRUD + set_min_cred_epoch + two-step admin
├── contracts/corridor_attestation/    enter(), is_cleared(), nullifier ledger, events
├── contracts/ultrahonk_verifier/      real verifier skeleton (M3)
└── contracts/verifier_mock/           implements the Verifier interface for tests + staged rollout
```

**Verifier interface** (`corridor_types::VerifierClient`): a single
`verify(vk_hash: BytesN<32>, proof: Bytes, public_inputs: Vec<BytesN<32>>) -> bool`.
`verifier_mock` returns a configurable answer; the real UltraHonk verifier is a
drop-in with the same signature. `corridor_attestation` never hard-codes a
verifier — it calls whatever address the policy names.

**`corridor_registry` surface:** `__constructor`, `admin`, `propose_admin` /
`accept_admin`, `register`, `get_policy`, `update_policy` (preserves the
operator), `set_paused`, `set_min_cred_epoch` (operator-gated, monotonic).
No `post_root`, no relayer allowlist.

**Payment gating** — two integration modes for corridor operators:

- **Pull**: operator's existing payout contract calls
  `corridor_attestation.is_cleared(corridor_id, nullifier)` before paying. Zero
  coupling. This is the MVP.
- **Push**: operator registers a Stellar Asset Contract + recipient rule;
  `enter()` performs the `transfer` in the same transaction. Later milestone.

---

## 6. Trust assumptions (stated plainly)

| Assumption | Risk | Hardening path |
|-----------|------|----------------|
| Issuer key security | Compromise mints bad statements | Per-issuer allowlist per corridor; issuer rotates its key + bumps `cred_epoch` to bulk-revoke; corridor drops the issuer instantly; short expiry caps exposure |
| Issuer honesty at KYC | A dishonest issuer signs for an ineligible holder | Same as any credential system — licence, audit trail (`attested`), corridor's choice of accepted issuers |
| Tx-relayer availability | Can censor / delay `enter`, cannot forge | Multiple relayers; holder can always self-submit (losing account-unlinkability, not safety) |
| `now` in proof vs ledger time | Small clock skew | `now_tolerance_secs` window on the policy (default 300s); a just-expired credential can pass within that window (documented, acceptable) |
| Auditor key custody | Key loss = no audit; key leak = warranted data exposed | Threshold key (t-of-n regulators); rotate per epoch; `auditor_pubkey` is per-policy |
| UltraHonk verifier correctness | Soundness bug = fake passes | Use the audited reference verifier; pin `vk_hash`; `paused` switch on every policy |

Corridor is **not** a trustless bridge and is not pitched as one. Under Option B
there is no bridge to trust-minimize — the only federated element is the
tx-relayer, which cannot forge a pass.

---

## 7. Privacy analysis

**A Stellar observer sees:** a pass was granted on corridor C, a tag index, an
aggregate counter incremented, a nullifier burned. If the holder submits `enter`
from their own account they link it — so the reference flow submits via a
**fee-sponsoring tx-relayer** (M6) and the SDK defaults to that.

**A Midnight observer sees:** the set of licensed issuers and each issuer's
current credential epoch. Nothing per-credential, nothing per-holder.

**Nobody sees, on either chain:** the holder's identity, KYC documents, tier,
expiry, issuer-holder linkage, or cross-corridor linkage (nullifiers are
per-corridor: `Poseidon2([holder_secret, corridor_id])`, unlinkable across
corridors).

**The auditor sees:** only `{tier, issuer_id}` for the specific nullifiers they
hold a warrant for, by re-deriving `auditor_blob`.

---

## 8. Repository layout

Corridor is split across repos ([`COMPONENTS.md`](./COMPONENTS.md)):

```
Sconce-Labs/corridor            ← hub: this file, README, PROPOSAL, ROADMAP,
│                                  HANDOFF, DRIPS, docs/
├── contracts/corridor.compact  ← Midnight issuer registry
└── midnight/                   ← Midnight wallet + deploy tooling (predates Option B)

Sconce-Labs/corridor-contracts  ← Soroban workspace (Rust); owns ABI.md
Sconce-Labs/corridor-circuits   ← Noir corridor_eligibility circuit
Sconce-Labs/corridor-sdk        ← @corridor/verify TypeScript SDK (incl. the Grumpkin signer)
Sconce-Labs/corridor-relayer    ← ARCHIVED (Option B removed root sync)
```

---

## 9. Milestone sequencing

See [`ROADMAP.md`](./ROADMAP.md). Short version:

1. **M1 — Soroban core** (registry + attestation + mock verifier + tests) ✅
2. **M2 — Circuit + testnet redeploy** (Option B circuit ✅; redeploy contracts + refresh `deployments/testnet.json`)
3. **M3 — Real verifier** (wire `ultrahonk_verifier`, end-to-end proof → verify on testnet)
4. **M4 — Midnight** (`corridor.compact` issuer registry ✅ compiles; simulator tests + Preprod deploy)
5. **M5 — Issuer SDK & tooling** (KYC → sign flow, CSPRNG enforcement, key management)
6. **M6 — Tx-relayer + frontend** (`docs/TX_RELAYER.md`; holder + operator UIs)
7. **M7 — Pilot** (one real corridor operator on testnet, auditor mode live)
