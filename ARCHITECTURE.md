# Corridor — Architecture (Hybrid: Midnight + Stellar)

_Last updated: 2026-09-10. Supersedes the single-chain design in earlier commits._

Corridor is a **portable proof of eligibility** for cross-border payment
corridors. A holder proves once — to a regulated issuer — that they are KYC/AML
cleared, then reuses a zero-knowledge proof of that fact across any number of
payment providers ("corridors") **without re-uploading documents and without
revealing their identity**.

The system spans **two networks by design**, each doing the job it is best at:

| Layer | Network | Role |
|-------|---------|------|
| **Credential custody & issuance** | **Midnight** (Compact) | A regulated issuer writes a credential the holder privately owns. Confidential persistent state — attribute values live in the holder's Midnight private state, never on any transparent ledger. |
| **Eligibility proof** | **Noir → UltraHonk** (client-side) | The holder generates a succinct proof that they hold a valid, unexpired, unrevoked credential of sufficient tier for a specific corridor, plus a per-corridor nullifier. |
| **Policy, verification, attestation, settlement** | **Stellar / Soroban** (Rust) | Corridor operators register policy. The proof is verified on-chain via Protocol 25 primitives. A pass is attested, the nullifier is burned, and payment can be gated on the result. |

Neither network is asked to do the other's job. Midnight is not good at being a
payments rail; Stellar's base layer is not good at holding confidential
credential state. Corridor puts each where it belongs and bridges them with a
portable proof.

---

## 1. Actors

- **Issuer** — a bank, licensed KYC provider, or NGO. Runs KYC once off-chain,
  then issues a credential on Midnight. Never becomes a data custodian for
  downstream corridors.
- **Holder** — the migrant worker / aid recipient / remittance sender. Owns one
  credential, presents many proofs.
- **Corridor operator** — a remittance anchor, lending pool, or aid-disbursement
  program on Stellar. Registers a policy, consumes proofs, gates payouts.
- **Auditor** — a regulator with a warrant. Can, for a *specific* flagged pass,
  learn the disclosed attributes — and nothing about anyone else.
- **Relayer** (trust-minimized, see §6) — syncs Midnight credential/revocation
  roots to the Stellar registry.

---

## 2. Data model

### On Midnight (public ledger)

| Field | Type | Meaning |
|-------|------|---------|
| `issuerRegistry` | map(issuerId → IssuerMeta) | Allowlisted issuers, their verifying keys, status |
| `credentialRoot` | Field (Merkle root) | Accumulator of all issued credential **commitments** |
| `revocationRoot` | Field (Merkle root) | Accumulator of revoked credential commitments |
| `epoch` | Uint | Monotonic counter bumped on every root update |

### On Midnight (holder private state — never on-chain)

| Field | Meaning |
|-------|---------|
| `holderSecret` | 32-byte secret, the root of the holder's identity in Corridor |
| `tier` | KYC tier (1–4) |
| `expiry` | Unix timestamp the credential lapses |
| `issuerId` | Which issuer signed it |
| `salt` | Per-credential randomness |
| `merklePath` | Inclusion path for the commitment under `credentialRoot` |

The credential **commitment** is
`C = Poseidon2(holderSecret, tier, expiry, issuerId, salt)`.
Only `C` is ever public. Given `C`, an observer learns nothing about the holder
or the attributes.

### On Stellar (Soroban storage)

`corridor_registry`:

| Key | Value |
|-----|-------|
| `Policy(corridor_id)` | `CorridorPolicy { operator, accepted_issuers, min_tier, required_disclosures, credential_root, revocation_root, root_epoch, verifier, vk_hash, now_tolerance_secs, paused }` |
| `Admin` | registry admin address |

`corridor_attestation`:

| Key | Value |
|-----|-------|
| `Nullifier(corridor_id, nullifier)` | `PassRecord { tag, ledger, auditor_blob }` |
| `Passes(corridor_id)` | `u64` aggregate count |
| `Registry` | address of `corridor_registry` |

---

## 3. Flows

### 3.1 Issuance (Midnight)

```
Holder ──KYC docs──▶ Issuer  (off-chain, one time)
Issuer:  commitment C = Poseidon2(holderSecret, tier, expiry, issuerId, salt)
Issuer ──issueCredential(C, issuerSig)──▶ Midnight Corridor contract
         └─ contract verifies issuerSig, appends C to credentialRoot, bumps epoch
Holder stores {holderSecret, tier, expiry, issuerId, salt, merklePath} in Midnight private state
```

An on-chain observer sees: issuer X added *a* credential at epoch N. Not who, not
what tier.

### 3.2 Root sync (bridge)

```
Relayer watches Midnight credentialRoot / revocationRoot / epoch
Relayer ──postRoot(corridor_id or global, root, revocationRoot, epoch, midnightHeight)──▶ corridor_registry
         └─ registry stores (root, revocationRoot, root_epoch) on the policy
```

MVP trust assumption: the relayer posts an honest root. See §6 for the
hardening path.

### 3.3 Entering a corridor (the core flow)

```
Holder opens corridor operator's app, picks corridor C, wants to send money.

1. App fetches Policy(C) from corridor_registry → { min_tier, credential_root,
   revocation_root, root_epoch, accepted_issuers, verifier, now_tolerance }.

2. Holder's wallet builds the Noir witness from private state:
     private: holderSecret, tier, expiry, issuerId, salt, merklePath, nonRevPath
     public:  credential_root, revocation_root, corridor_id, min_tier,
              now, nullifier, disclosed_tag, [auditor_pubkey, auditor_blob]

3. Circuit proves (see §4). UltraHonk proof generated locally (bb / wallet prover).

4. App submits corridor_attestation.enter(corridor_id, proof, public_inputs):
     a. load Policy(corridor_id); assert not paused
     b. assert public_inputs.credential_root == policy.credential_root
        && public_inputs.revocation_root == policy.revocation_root
        && public_inputs.corridor_id == corridor_id
        && public_inputs.min_tier == policy.min_tier
        && |ledger.timestamp - public_inputs.now| <= policy.now_tolerance_secs
     c. verifier.verify(policy.vk_hash, proof, public_inputs)   ← Protocol 25 BN254 pairing
     d. assert Nullifier(corridor_id, nullifier) not present
     e. store Nullifier(corridor_id, nullifier) = PassRecord{ tag, ledger, auditor_blob }
     f. Passes(corridor_id) += 1
     g. emit PASS_GRANTED(corridor_id, tag, nullifier)

5. Corridor operator's payout contract calls
   corridor_attestation.is_cleared(corridor_id, nullifier) → true, releases funds.
```

What a Stellar observer sees: corridor C granted a pass tagged `"tier-2-remit"`;
`passes` went up by 1; a random-looking nullifier was burned. **Not** the
holder's Stellar address (proof is presented by a relayer or via a
meta-transaction; see §7), tier, issuer, or identity.

### 3.4 Revocation

Issuer appends the commitment to `revocationRoot` on Midnight → relayer syncs →
future proofs against the new `revocation_root` fail the non-membership check.
Already-granted passes are not retroactively revoked (operators can re-check
`is_cleared` against a fresh epoch if they want continuous assurance).

### 3.5 Audit

At proof time the holder encrypts `{tier, issuerId, disclosed attributes}` to the
policy's `auditor_pubkey`, bound to the nullifier, and passes the ciphertext as
`auditor_blob` (a public input, stored in the `PassRecord`). A regulator holding
the auditor secret can decrypt exactly the records they have a warrant for. No
global unmasking, no issuer involvement.

---

## 4. The Noir circuit (repo: [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits))

**Private inputs:** `holder_secret, tier, expiry, issuer_id, salt,
merkle_path[DEPTH], merkle_index, non_rev_path[DEPTH], non_rev_index,
auditor_plaintext, auditor_nonce`

**Public inputs:** `credential_root, revocation_root, corridor_id, min_tier,
now, nullifier, disclosed_tag, auditor_pubkey, auditor_blob`

**Constraints:**

1. `commitment = poseidon2([holder_secret, tier, expiry, issuer_id, salt])`
2. `merkle_root(commitment, merkle_path, merkle_index) == credential_root`
3. `merkle_non_membership(commitment, non_rev_path, non_rev_index, revocation_root)`
   — prove the commitment's slot in the revocation tree is empty
4. `tier as u32 >= min_tier as u32`
5. `expiry as u64 > now as u64`
6. `nullifier == poseidon2([holder_secret, corridor_id])`
7. `auditor_blob == enc(auditor_pubkey, auditor_plaintext, auditor_nonce)` and
   `auditor_plaintext` binds `tier`, `issuer_id`, `nullifier`
8. `disclosed_tag` is range-checked (a small enum index, not free text)

`issuer_id ∈ accepted_issuers` is checked **on Soroban** against the policy (a
short list), not in-circuit, to keep the circuit fixed-size across corridors.

Proving system: **UltraHonk** (Noir default), verified by the
`ultrahonk_verifier` Soroban contract (reference:
`indextree/ultrahonk_soroban_contract`). The verification key is fixed at
verifier deploy time; `vk_hash` on the policy pins which VK a corridor trusts.

---

## 5. Soroban contracts (repo: [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts))

```
corridor-contracts/
├── Cargo.toml                         workspace, soroban-sdk 25.3
├── ABI.md                             source of truth for the PI_* public-input layout
├── crates/corridor_types/             shared types: CorridorPolicy, PassRecord, PublicInputs, errors
├── contracts/corridor_registry/       corridor policy CRUD + root sync + admin
├── contracts/corridor_attestation/    enter(), is_cleared(), nullifier ledger, events, payment hook
└── contracts/verifier_mock/           implements the Verifier interface for tests + staged rollout
```

**Verifier interface** (`corridor_types::VerifierClient`): a single
`verify(vk_hash: BytesN<32>, proof: Bytes, public_inputs: Vec<BytesN<32>>) -> bool`.
`verifier_mock` returns a configurable answer; the real UltraHonk verifier is a
drop-in with the same signature. `corridor_attestation` never hard-codes a
verifier — it calls whatever address the policy names.

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
| Relayer posts an honest Midnight root | A bad root could admit invalid credentials or censor valid ones | (1) multiple independent relayers + registry takes the majority root per epoch; (2) fraud-proof window; (3) Midnight→Stellar light client once the Hua interop phase ships |
| `now` in proof vs ledger time | Small clock skew | `now_tolerance_secs` window on the policy (default 300s) |
| Issuer key security | Compromise mints bad credentials | Per-issuer allowlist per corridor; issuer can rotate key + publish revocation root; corridor can drop an issuer instantly |
| Auditor key custody | Key loss = no audit; key leak = warranted data exposed | Threshold key (t-of-n regulators); rotate per epoch |
| UltraHonk verifier correctness | Soundness bug = fake passes | Use the audited reference verifier; pin `vk_hash`; `paused` switch on every policy |

Corridor is **not** a trustless bridge today and must not be pitched as one. It
is a working two-network system with one clearly-labeled federated component
(the relayer) on a documented path to removal.

---

## 7. Privacy analysis

**A Stellar observer sees:** a pass was granted on corridor C, a tag index, an
aggregate counter incremented, a nullifier burned. If the holder submits the
`enter` transaction from their own account, they link that account to the pass —
so the reference flow submits via a **relayer / fee-sponsored meta-transaction**,
and the SDK defaults to that.

**A Midnight observer sees:** issuer X issued *a* credential at epoch N; issuer X
revoked *a* credential at epoch M. Never the holder, tier, or expiry.

**Nobody sees, on either chain:** the holder's identity, KYC documents, tier,
expiry, issuer-holder linkage, or cross-corridor linkage (nullifiers are
per-corridor: `Poseidon2(holderSecret, corridorId)`, unlinkable across corridors).

**The auditor sees:** only the `{tier, issuerId, attributes}` for the specific
nullifiers they hold a warrant for, by decrypting `auditor_blob`.

---

## 8. Repository layout

Corridor is split across repos ([`COMPONENTS.md`](./COMPONENTS.md)):

```
Sconce-Labs/corridor            ← hub: this file, README, PROPOSAL, ROADMAP,
│                                  HANDOFF, DRIPS, docs/
├── contracts/corridor.compact  ← Midnight credential registry
└── src/                        ← React frontend (holder + operator UIs)

Sconce-Labs/corridor-contracts  ← Soroban workspace (Rust); owns ABI.md
Sconce-Labs/corridor-circuits   ← Noir corridor_eligibility circuit
Sconce-Labs/corridor-sdk        ← @corridor/verify TypeScript SDK
Sconce-Labs/corridor-relayer    ← root-sync service (not yet created — M5)
```

---

## 9. Milestone sequencing

See [`ROADMAP.md`](./ROADMAP.md). Short version:

1. **M1 — Soroban core** (registry + attestation + mock verifier + tests) ← in progress
2. **M2 — Noir circuit** (eligibility proof, local proving, `Prover.toml` fixtures)
3. **M3 — Real verifier** (wire `ultrahonk_verifier`, end-to-end proof → verify on testnet)
4. **M4 — Midnight upgrade** (`corridor.compact`: issuer registry + credential/revocation roots)
5. **M5 — Relayer** (root sync, multi-relayer majority)
6. **M6 — SDK + frontend** (`@corridor/verify`, meta-tx flow, operator + holder UIs)
7. **M7 — Pilot** (one real corridor operator on testnet, auditor mode live)
