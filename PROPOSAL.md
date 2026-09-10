# Corridor — Product Proposal

## What is the product, and who uses it?

Corridor is a **portable proof of eligibility** for cross-border payments. A
person completes KYC/AML **once** with a regulated issuer, receives a
credential, and from then on proves "I am cleared to use this payment corridor"
to any number of providers — **without re-submitting documents and without
revealing their identity**.

**Who uses it:**

- **Remittance senders / migrant workers.** Today they upload a passport scan
  and a liveness selfie to every new anchor or wallet. Each provider becomes a
  custodian of their identity documents. Corridor replaces that with a
  reusable zero-knowledge proof.
- **Aid recipients** served by multiple NGOs, each running its own onboarding.
  One issuer verifies; every participating disbursement program gates on the
  proof without holding documents.
- **Stellar anchors, remittance corridors, lending pools, disbursement
  platforms.** They need to know a counterparty is eligible; they do **not**
  want the liability of storing identity data. They receive a proof and an
  on-chain attestation, never a document.
- **Regulated issuers** — banks, licensed KYC providers, NGOs — that want to
  issue a verifiable credential without becoming the data custodian for every
  downstream service that relies on it.
- **Regulators**, who get a warrant-scoped audit path instead of either total
  opacity or bulk data access.

## Architecture in one paragraph

Corridor is **Stellar-native**. A regulated issuer runs KYC once, then **signs**
a short-lived statement about the holder (`{ holder_binding, tier, expiry,
cred_epoch }`) with a **Grumpkin** key — Barretenberg's embedded curve for
BN254. The holder keeps the signature. To enter a corridor, the holder generates
a **Noir → UltraHonk** proof on their own device that they hold a valid issuer
signature meeting that corridor's policy, and emits a per-corridor nullifier.
Since **Protocol 25 ("X-Ray", Jan 2026)** Soroban verifies BN254/Poseidon2
proofs natively and cheaply, so the policy, the proof check, the nullifier
ledger and the payout gate all live on Stellar, next to the money.

**Midnight** plays a small, optional part: a public **issuer registry**
(`corridor.compact`) recording who the licensed issuers are and each issuer's
current credential epoch. It holds no holder data and is not on any critical
path — a corridor could run without it.

> An earlier design had Midnight build a credential Merkle tree and a relayer
> sync its root to Stellar. That could not work — the two chains use
> incompatible fields (BLS12-381 vs BN254) — and revocation was a no-op. The
> switch to issuer-signed statements ("Option B") is documented in
> [`docs/CREDENTIAL_ACCUMULATOR.md`](./docs/CREDENTIAL_ACCUMULATOR.md) and
> [`AUDIT.md`](./AUDIT.md).

## Data Model

| Data Point | Type | Lives on | Disclosed to |
|------------|------|----------|--------------|
| Issuer signature over `{ holder_binding, tier, expiry, cred_epoch }` | Private witness | Holder's device | No one (only proven in ZK) |
| `holder_binding = Poseidon2(holder_secret, salt)` | Private witness | Holder's device (issuer sees it once, at signing) | No one on chain |
| Issuer id `Poseidon2(pk.x, pk.y)` | Public | Midnight registry + Stellar policy | Everyone (by design — accountability) |
| Issuer credential epoch | Public | Midnight → mirrored by operators to Stellar | Everyone |
| Holder secret, tier, expiry, cred_epoch, salt | Private witness | Holder's device | No one |
| Corridor policy (min tier, accepted issuers, verifier, `min_cred_epoch`, auditor key) | Public | Stellar | Everyone |
| Eligibility proof + 9 public inputs | Transient | Submitted to Stellar | Verifier only |
| Nullifier `Poseidon2(holder_secret, corridor_id)` | Public | Stellar | Everyone (unlinkable across corridors) |
| Disclosed tag (enum index) | Public | Stellar | Everyone |
| `auditor_blob = Poseidon2(auditor_pubkey, tier, issuer_id, nullifier, nonce)` | Public | Stellar `PassRecord` | The warranted auditor only |
| Holder identity, KYC documents | — | Nowhere on chain | The issuer only, once, off-chain |

**What a chain observer sees:** on Midnight, the licensed-issuer set and each
issuer's epoch; on Stellar, that a corridor granted *a* pass and burned a
nullifier. **What nobody sees:** who, what tier, which issuer for which holder,
or the holder's behaviour across corridors.

## Feasibility

**On-chain layers — done or close.**

- The Soroban contracts (`corridor_registry`, `corridor_attestation`, a mock
  verifier behind a stable interface) are implemented and unit-tested (25 host
  tests). The attestation flow — bind proof to policy, verify, burn nullifier,
  record the pass, gate payout — works end to end against the mock verifier.
- The Noir circuit is written and does a **real Grumpkin Schnorr signature
  verification** plus tier threshold, expiry, epoch floor, per-corridor
  nullifier, bounded disclosure, auditor binding — 18 tests, 73 ACIR opcodes,
  `nargo execute` solves a real signed fixture.
- The SDK signs (`issueCredential`), builds the witness, and verifies it
  locally; its signer is checked against the circuit's verifier.
- The Midnight issuer registry is written in Compact and compiles in CI.

**What stands between here and a pilot:**

1. **Real proof verification** — swap the mock for the UltraHonk Soroban
   verifier (`indextree/ultrahonk_soroban_contract`) and pin a verification
   key. Reference implementations exist; this is integration, not research.
2. **Testnet redeploy** — the deployed contracts ran the pre-Option-B ABI; a
   redeploy against the issuer-signed-statement contracts is a focused task.
3. **Issuer + holder tooling** — a CLI issuer (KYC → sign, CSPRNG-enforced) and
   a holder-side prover (`@corridor/verify`), then the operator/holder UIs.
4. **Fee-sponsoring tx-relayer** — a small service that submits `enter` so the
   holder's Stellar account is never linked to a pass. It cannot forge a pass.
5. **One pilot corridor** — a small anchor or an NGO disbursement program on
   testnet with real test users, auditor mode enabled.

**Honest assessment.** Corridor is a Stellar-native architecture with the
on-chain and ZK pieces built and one clearly-labeled federated component (the
tx-relayer, a liveness dependency only). It is not pitched as a trustless
bridge — under this design there is no cross-chain bridge to trust. The
remaining work is integration, tooling, and partnerships — not protocol
invention.

## Funding path

- **Now:** [Stellar Drips Wave](./DRIPS.md) — the roadmap is decomposed into
  scoped issues; contributors earn from the SDF-funded pool.
- **Next:** SCF Build Award (Open or Integration track) once there is a pilot
  corridor and the `@corridor/verify` SDK, leading with the validated need
  (anchors don't want KYC-data liability) and the auditor-mode compliance
  story.
