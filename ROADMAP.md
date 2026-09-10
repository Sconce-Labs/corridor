# Corridor — Roadmap

_Last updated: 2026-09-10. Companion to [`ARCHITECTURE.md`](./ARCHITECTURE.md)
and [`HANDOFF.md`](./HANDOFF.md)._

Corridor is a hybrid **Midnight + Stellar** portable-eligibility system. The
on-chain layers are built; what remains is real proof verification, tooling,
the relayer, and a pilot. Milestones are sized to map onto
[Drips Wave](./DRIPS.md) issues.

---

## Where things stand

| Layer | Built | Not built |
|-------|-------|-----------|
| Stellar / Soroban | registry, attestation, mock verifier, shared types, host tests | testnet deploy, real verifier, payout-push mode |
| Noir circuit | inclusion, non-membership, tier, expiry, nullifier, tag, auditor-binding | proven end-to-end, real fixtures, Poseidon2 domain match |
| Midnight / Compact | credential + revocation trees, issuer set, issue/revoke circuits | `compact compile` pass, Preprod deploy |
| Bridge | design + `post_root` entrypoint | the relayer service, multi-relayer trust reduction |
| App | (old single-chain UI, retired) | `@corridor/verify` SDK, holder + operator UIs |

---

## Milestones

### M1 — Stellar core on testnet  ·  ✅ done (2026-09-10)
- ✅ `cargo test --workspace` — 14/14 green.
- ✅ Deployed `verifier_mock`, `corridor_registry`, `corridor_attestation` to
  testnet (addresses in `README.md` + `corridor-contracts/deployments/testnet.json`).
- ✅ End-to-end verified on testnet: `register` → `post_root` → `enter` →
  `is_cleared == true`; replay rejected with `NullifierUsed`.
- ⏳ Remaining: wire the CI `stellar` job on a real push; `.cargo/config.toml`
  Windows workaround documented.

### M2 — Noir circuit proven  ·  mostly ✅
- ✅ `nargo check` + `nargo test` pass (Noir 1.0.0-beta.26, `poseidon` v0.3.0),
  CI pinned.
- ✅ Poseidon2 conformance: `poseidon2([1,2]) == 0x038682…1ed7383` asserted in
  the circuit, `corridor-sdk` (`@zkpassport/poseidon2`), and
  `corridor-contracts/crates/poseidon_conformance` (`rs-soroban-poseidon`) —
  circuit ⇄ SDK ⇄ Soroban agree. (Midnight/Compact leg → M4.)
- ✅ Witness builder: `corridor-sdk` `buildWitness` assembles the 9-field public
  vector + private witness and re-derives the roots.
- ⏳ Real Merkle fixtures — a committed small tree with known leaves/paths, and
  a fixture generator feeding both `nargo execute` and the SDK.
- **Done when:** `nargo execute` + `bb prove` + `bb verify` succeed on a fixture
  built by `buildWitness`.

### M3 — Real verifier on Stellar
- Vendor / adapt `indextree/ultrahonk_soroban_contract` as
  `corridor-contracts/contracts/ultrahonk_verifier` implementing the `Verifier` interface.
- Generate the VK from the M2 circuit; deploy the verifier with it; set
  `vk_hash` on a test policy.
- End-to-end: M2 proof → `corridor_attestation.enter()` on testnet → pass
  granted, nullifier burned, `ProofInvalid` on a tampered proof.
- **Done when:** the mock is out of the critical path for at least one corridor.

### M4 — Midnight credential registry live
- ✅ `compact compile contracts/corridor.compact` clean (verified in CI).
- Review the issuer-auth model in `registerIssuer` / `issueCredential`
  (currently `persistentHash(issuerSk)` as a stand-in signature).
- Simulator tests: issuer registration, issuance, revocation, epoch bump,
  attributes never enter the circuit.
- Deploy to Midnight Preprod; issue a handful of test credentials; read the
  roots off the indexer.
- Retire `counter.compact` and its tests (the cleanup PR from HANDOFF §5).
- **Done when:** a credential issued on Preprod produces a commitment that a
  Noir proof can include against the on-chain root.

### M5 — Root-sync relayer  ·  half ✅
- ✅ `corridor-relayer` service scaffold: config loader, poll loop, alerting,
  Dockerfile, CI. `SorobanRegistryWriter` reads `root_epoch` and submits
  `post_root` for real (never retries a rejected epoch).
- ⏳ `IndexerMidnightReader.readRoots` — GraphQL against the Midnight indexer for
  the `credentials` / `revoked` tree roots + `epoch`. Needs `corridor.compact`
  live on Preprod (M4).
- ⏳ Trust reduction step 1: run ≥2 independent relayers; `post_root` accepts a
  root only when N agree for an epoch (contract change).
- ⏳ Observability: alert on epoch divergence between relayers.
- **Done when:** a credential issued on Preprod is usable on a Stellar corridor
  within one poll interval, with no manual step.

### M6 — SDK + apps
- ✅ `corridor-sdk` reads (`getPolicy` / `isCleared` / `passes`) and
  `buildWitness` are real.
- ⏳ `requestProof` — stand up a local Noir prover the SDK POSTs the witness to
  (proving never leaves the device).
- ⏳ `enter` via a **fee-sponsored relayer** so the holder's Stellar account
  stays unlinked from the pass.
- Issuer CLI (in `corridor-sdk` or its own repo): KYC-result in → commitment +
  Midnight `issueCredential` call.
- Frontend rewrite (`src/`):
  - **Holder app** — hold a credential, pick a corridor, generate + submit a
    proof, see the pass.
  - **Operator console** — register/'update a corridor policy, watch passes,
    pause.
- Nullifier archival design (state rent) implemented.
- **Done when:** a non-technical user completes the holder flow on testnet
  end-to-end.

### M7 — Auditor mode + pilot
- Replace the `auditor_blob` commitment with in-circuit ECIES to the policy's
  auditor key; threshold (t-of-n) auditor key management.
- Auditor CLI: given a warrant list of nullifiers, decrypt `{tier, issuer}`.
- One pilot corridor: a small anchor or an NGO disbursement program on testnet,
  real test users, auditor mode enabled, a written trust/compliance memo.
- **Done when:** the pilot partner has run real test volume and signed off on
  the privacy + audit model.

### M8 — SCF Build Award
- Apply (Open or Integration track) with: the pilot, `@corridor/verify`, the
  auditor-mode compliance story, and a scoped 3–6 month plan (mainnet
  hardening, more issuers, more corridors, relayer decentralisation).

---

## Cross-cutting tracks

- **Security** — threat model doc; external review of the circuit + the
  attestation contract before mainnet; `paused` runbook.
- **Poseidon2 conformance** — one test suite asserting Midnight ⇄ Noir ⇄
  Soroban agree on every hash the system depends on.
- **Trust minimisation of the relayer** — single → quorum (M5) → fraud-proof
  window → Midnight↔Stellar light client (tracks Midnight's Hua interop phase).
- **Docs** — keep `ARCHITECTURE.md` honest as components become real; every PR
  that changes a trust assumption updates §6 there.

---

## Ideas backlog (not yet scheduled)

- **Corridor Passport** — holder view of one credential + a private history of
  which corridors it was presented to; a menu of "prove X" predicates from the
  one credential (age ≥ 18, residency, sanctions-clear, tier ≥ N).
- **SEP-12 shim** — expose a Corridor pass as a SEP-12 KYC status so existing
  Stellar wallets/anchors integrate with no bespoke UI.
- **Privacy-preserving corridor analytics** — per-tag aggregates already exist
  on-chain (`passes`); turn them into an operator dashboard with zero
  user-level data.
- **Issuer registry / marketplace** — public list of accredited issuers and
  the corridors that accept them; network-effect flywheel.
- **Reference toy anchor** — a demo remittance anchor that only accepts
  Corridor proofs, to make the value legible in 30 seconds.
- **Multi-credential / tiered proofs** — one proof spanning credentials from
  two issuers (e.g. identity + accredited-investor).

---

## Risk register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Poseidon2 params differ across chains | Roots silently disagree; nothing verifies | M2 conformance test is a hard gate before M3 |
| UltraHonk Soroban verifier immature / costly | M3 slips; gas too high for a payments app | Track the reference repos; budget a fallback to a Groth16 verifier via `pairing_check` if UltraHonk gas is unworkable |
| Relayer trust unacceptable to a partner | Pilot blocked | Ship M5 quorum before pitching pilots; be explicit in the trust memo |
| Nullifier state rent unbounded | Cost grows with usage | Archival/rollup design in M6; don't expire live nullifiers |
| Compact Set/MerkleTree API differs from what's written | M4 rework | Use the Midnight docs MCP; keep the contract minimal |
| Two ecosystems, small team | Everything slips | Drips Wave issues bring contributors; keep milestones independently shippable |
| Auditor key compromise | Warranted data exposed | Threshold key, per-epoch rotation (M7) |
