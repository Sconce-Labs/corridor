# Corridor — Roadmap

_Last updated: 2026-09-10. Companion to [`ARCHITECTURE.md`](./ARCHITECTURE.md)
and [`HANDOFF.md`](./HANDOFF.md)._

Corridor is a **Stellar-native** portable-eligibility system with an optional
Midnight issuer registry. The **Option B redesign** (2026-09-10) replaced the
credential/revocation Merkle accumulator with **issuer-signed statements**
(Grumpkin Schnorr + short expiry + a `min_cred_epoch` floor), resolving the two
critical design holes the audit found. The on-chain layers and the ZK layer are
built; what remains is real proof verification, issuer tooling, a tx-relayer,
and a pilot. Milestones map onto [Drips Wave](./DRIPS.md) issues.

---

## Where things stand

Split across four active repos ([`COMPONENTS.md`](./COMPONENTS.md)) + one
archived, all with CI:

| Layer | Built | Not built |
|-------|-------|-----------|
| Stellar / Soroban ([corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)) | registry (`register`/`update_policy`/`set_min_cred_epoch`/two-step admin/events), attestation (`enter`/`is_cleared`/nullifier ledger/TTL/events), mock verifier, `ultrahonk_verifier` skeleton, typed ABI, **25 host tests**, **deployed + smoke-verified on testnet (Option B)**, Poseidon2 conformance | real UltraHonk verification (M3), payout-push mode, gas benchmarks |
| Noir circuit ([corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)) | `eligibility`/`tags`/`conformance` modules, Grumpkin **Schnorr signature verification**, `nargo check`+`test` (18 tests, all failure modes), `nargo execute` on a real signed fixture, gate-count in CI (73 ACIR opcodes), best-effort `bb prove/verify` | pinned `bb` once beta.26 gets a published mapping |
| Midnight / Compact (this repo `contracts/`) | **issuer registry** (`registerIssuer`/`bumpEpoch`/`reportAttestations`), issuer-auth via control-secret hash, **compiles in CI (6 circuits)** | simulator tests, Preprod deploy (M4) |
| SDK ([corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk)) | `getPolicy`/`isCleared`/`passes`/`passRecord` (live), `buildWitness`, `verifyWitnessLocally`, **Grumpkin signer + `issueCredential`**, `makeFixture`, 23 tests, examples | `requestProof`/`enter` (need M3 + tx-relayer), issuer CLI |
| Tx-relayer (spec: [`docs/TX_RELAYER.md`](./docs/TX_RELAYER.md)) | spec only | the service (M6) |
| ~~Root-sync relayer~~ ([corridor-relayer](https://github.com/Sconce-Labs/corridor-relayer)) | 🗄️ **archived** — Option B has no roots to sync | — |

---

## Milestones

### M1 — Stellar core on testnet  ·  ✅ done (2026-09-10, pre-Option-B ABI)
- ✅ `cargo test --workspace` green.
- ✅ Deployed `verifier_mock`, `corridor_registry`, `corridor_attestation` to
  testnet.
- ✅ End-to-end verified on testnet: `register` → `post_root` → `enter` →
  `is_cleared == true`; replay rejected with `NullifierUsed`.
- ⚠️ Superseded by the Option B ABI — needs the M2 redeploy.

### M2 — Option B circuit + testnet redeploy  ·  ✅ done (2026-09-10)
- ✅ Circuit rewritten for issuer-signed statements: Grumpkin **Schnorr
  verification**, no Merkle path. 18 `nargo test`, `nargo execute` solves a real
  signed fixture. 73 ACIR opcodes (was ~3200).
- ✅ SDK Grumpkin signer (`schnorr.ts`) matches `noir-lang/schnorr` v0.4.0's
  pinned vector; `gen-circuit-fixture.ts` emits the circuit fixture and CI
  proves SDK ⇄ circuit agree.
- ✅ Contracts rebuilt for the 9-input Option B ABI (`min_cred_epoch` replaces
  the two roots); 25 host tests.
- ✅ Poseidon2 conformance still asserted circuit ⇄ SDK ⇄ Soroban.
- ✅ **Redeployed to testnet** (`deployments/testnet.json`); smoke-verified
  `register → enter` (PassGranted) `→ is_cleared == true`, replay rejected.
  `scripts/demo.sh` updated for the 9-input vector.
- ✅ `corridor-sdk` `TESTNET` preset and `web/src/config.ts` point at the new
  addresses; the site reads them live.
- ⏳ Still with the mock verifier — a real Option B *proof* through `enter()`
  waits on M3.

### M3 — Real verifier on Stellar
- Vendor / adapt `indextree/ultrahonk_soroban_contract` as
  `corridor-contracts/contracts/ultrahonk_verifier` implementing the `Verifier` interface.
- Generate the VK from the M2 circuit; deploy the verifier with it; set
  `vk_hash` on a test policy.
- End-to-end: M2 proof → `corridor_attestation.enter()` on testnet → pass
  granted, nullifier burned, `ProofInvalid` on a tampered proof.
- **Done when:** the mock is out of the critical path for at least one corridor.

### M4 — Midnight issuer registry live
- ✅ `compact compile contracts/corridor.compact` clean in CI (6 circuits,
  Option B: `registerIssuer` / `bumpEpoch` / `reportAttestations`).
- Simulator tests: issuer registration, epoch monotonicity, control-secret
  auth, admin escape hatch.
- Deploy to Midnight Preprod; register a test issuer; bump an epoch; read
  `issuerEpoch` back off the indexer.
- Trim `midnight/` tooling to what Option B needs (drop the `enterCorridor` /
  holder-proving scaffolding — the holder never touches Midnight now).
- **Done when:** an issuer registered on Preprod, with its epoch readable, and a
  corridor operator can mirror that epoch into `set_min_cred_epoch`.

### M5 — Issuer SDK & tooling
- Issuer CLI (in `corridor-sdk` or its own repo): KYC-result in → `issueCredential`
  (Grumpkin sign) → hand the holder `{ tier, expiry, cred_epoch, salt, pubkey,
  sig }`.
- **Enforce a CSPRNG for `holder_secret`** end to end (audit H5) — the holder
  supplies `holder_binding`; tooling must generate the secret with
  `randomSecret()` and refuse weak input (`assertStrongSecret`).
- Issuer key management: generation, rotation, the Midnight `bumpEpoch` call on
  rotation/compromise.
- **Done when:** an issuer can run KYC → sign → deliver a credential a holder
  can use, with no hand-crafted values.

### M6 — Tx-relayer + apps
- ✅ `corridor-sdk` reads (`getPolicy` / `isCleared` / `passes`) and
  `buildWitness` are real.
- ⏳ `requestProof` — stand up a local Noir prover the SDK POSTs the witness to
  (proving never leaves the device).
- ⏳ **Fee-sponsoring tx-relayer** (`docs/TX_RELAYER.md`): a new focused service
  that submits `enter` so the holder's Stellar account stays unlinked from the
  pass. `corridor-sdk.enter()` targets it.
- Frontend (`web/`, live at `corridor-pink.vercel.app`):
  - ✅ public site + live testnet reads + operator `is_cleared` checker.
  - ⏳ **Holder app** — hold a credential, pick a corridor, generate + submit a
    proof, see the pass.
  - ⏳ **Operator console** — register / update a corridor policy, watch passes,
    pause, bump `min_cred_epoch`.
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
  hardening, more issuers, more corridors, tx-relayer operators).

---

## Cross-cutting tracks

- **Security** — threat model doc; external review of the circuit + the
  attestation contract before mainnet; `paused` runbook.
- **Conformance** — Poseidon2 asserted Noir ⇄ SDK ⇄ Soroban; Grumpkin Schnorr
  asserted SDK ⇄ circuit (pinned vector + `nargo execute` in CI).
- **Tx-relayer** — the only federated component; multiple operators, holder can
  always self-submit. It cannot forge a pass, so this is a liveness concern, not
  a soundness one.
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
| Poseidon2 / Schnorr params differ across implementations | Proofs silently fail to verify | Conformance tests are hard CI gates (pinned vectors + `nargo execute`) |
| UltraHonk Soroban verifier immature / costly | M3 slips; gas too high for a payments app | Track the reference repos; budget a fallback to a Groth16 verifier via `pairing_check` if UltraHonk gas is unworkable |
| Issuer key compromise | Bad statements signed until noticed | Short expiry caps the window; `bumpEpoch` bulk-revokes; corridors drop the issuer |
| Nullifier state rent unbounded | Cost grows with usage | TTL bumps on read; archival design in M6; don't expire live nullifiers |
| Compact Map/Set API differs from what's written | M4 rework | Keep the contract minimal; it compiles in CI today |
| Two ecosystems, small team | Everything slips | Drips Wave issues bring contributors; keep milestones independently shippable |
| Auditor key compromise | Warranted data exposed | Threshold key, per-epoch rotation (M7) |
