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

## Why two networks?

Corridor deliberately uses **Midnight for the credential** and **Stellar for
the corridors**, because the two jobs have opposite requirements.

**The credential needs confidential, persistent, shared state.** An issuer
writes something a specific holder privately owns and can later prove against,
and that must not be visible to anyone else — not the other issuers, not the
corridors, not chain analysts. Midnight's confidential-logic layer is built for
exactly this: private witnesses never touch the ledger, and `disclose()` makes
selective publication a first-class operation. A transparent chain would force
the issuer to encrypt off-chain and manage key distribution.

**The corridor needs cheap, public, high-throughput settlement with native
proof verification.** Stellar is a payments network first, and since **Protocol
25 ("X-Ray", Jan 2026)** Soroban has native BN254 and Poseidon2 host functions
— on-chain zero-knowledge proof verification at low cost. The corridor policy,
the proof check, the nullifier ledger, and the payout gate all belong here,
next to the money.

**The bridge is a proof, not a message.** The holder generates a **Noir →
UltraHonk** proof on their own device that binds a Midnight credential root to a
Stellar corridor policy and emits a per-corridor nullifier. Stellar verifies it
natively. No chain is asked to interpret the other's state; only a succinct
proof crosses.

Neither half is redundant. Stellar's ZK primitives verify a proof but do not
give you a place to *hold* a confidential credential that an issuer writes and a
holder owns. Midnight gives you that, but is not a payments rail. Corridor is
the seam.

## Data Model

| Data Point | Type | Lives on | Disclosed to |
|------------|------|----------|--------------|
| Credential commitment `Poseidon2(secret, tier, expiry, issuer, salt)` | Public leaf | Midnight | Everyone (reveals nothing) |
| Issuer id | Public | Midnight | Everyone (by design — accountability) |
| Credential root / revocation root / epoch | Public | Midnight → synced to Stellar | Everyone |
| Holder secret, tier, expiry, salt, Merkle paths | Private witness | Holder's device / Midnight private state | No one |
| Corridor policy (min tier, accepted issuers, verifier, roots) | Public | Stellar | Everyone |
| Eligibility proof + public inputs | Transient | Submitted to Stellar | Verifier only |
| Nullifier `Poseidon2(secret, corridorId)` | Public | Stellar | Everyone (unlinkable across corridors) |
| Disclosed tag (enum index) | Public | Stellar | Everyone |
| `auditor_blob` — enc(`{tier, issuer}`) to the auditor key | Public | Stellar `PassRecord` | The warranted auditor only |
| Holder identity, KYC documents | — | Nowhere on chain | The issuer only, once, off-chain |

**What a chain observer sees:** on Midnight, that an issuer added/revoked *a*
credential; on Stellar, that a corridor granted *a* pass and burned a
nullifier. **What nobody sees:** who, what tier, which issuer for which holder,
or the holder's behaviour across corridors.

## Feasibility

**On-chain layers — done or close.**

- The Soroban contracts (`corridor_registry`, `corridor_attestation`, a mock
  verifier behind a stable interface) are implemented and unit-tested. The
  attestation flow — bind proof to policy, verify, burn nullifier, record the
  pass, gate payout — works end to end against the mock verifier.
- The Noir circuit is written: credential inclusion, revocation
  non-membership, tier threshold, expiry, per-corridor nullifier, bounded
  disclosure, auditor binding.
- The Midnight credential registry is written in Compact.

**What stands between here and a pilot:**

1. **Real proof verification** — swap the mock for the UltraHonk Soroban
   verifier (`indextree/ultrahonk_soroban_contract`) and pin a verification
   key. Reference implementations exist; this is integration, not research.
2. **Poseidon2 domain alignment** — the hash in Noir and the
   `poseidon2_permutation` host function on Soroban must be parameter-identical
   or the roots won't match. A focused task.
3. **Root-sync relayer** — a small service watching Midnight and calling
   `post_root`. MVP is a single labeled relayer; the hardening path
   (multi-relayer majority, then a light client once Midnight's interop phase
   ships) is in the roadmap.
4. **Issuer + holder tooling** — a CLI issuer and a holder-side prover
   (`@corridor/verify`), then the operator/holder UIs.
5. **One pilot corridor** — a small anchor or an NGO disbursement program on
   testnet with real test users, auditor mode enabled.

**Honest assessment.** Corridor is a working two-network architecture with the
on-chain pieces built and one clearly-labeled federated component (the
relayer) on a documented path to removal. It is not a finished
trust-minimised bridge and is not pitched as one. The remaining work is
integration, tooling, and partnerships — not protocol invention.

## Funding path

- **Now:** [Stellar Drips Wave](./DRIPS.md) — the roadmap is decomposed into
  scoped issues; contributors earn from the SDF-funded pool.
- **Next:** SCF Build Award (Open or Integration track) once there is a pilot
  corridor and the `@corridor/verify` SDK, leading with the validated need
  (anchors don't want KYC-data liability) and the auditor-mode compliance
  story.
