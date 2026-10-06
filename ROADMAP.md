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
| Stellar / Soroban ([corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)) | registry (`register`/`update_policy`/`set_min_cred_epoch`/two-step admin/events), attestation (`enter`/`is_cleared`/nullifier ledger/TTL/events), mock verifier, **real `ultrahonk_verifier` — live on testnet, corridor 0x04 grants/rejects real proofs**, typed ABI, **54 host tests**, Poseidon2 conformance | swap the 09-10 mock stack (one `update_policy`), payout-push mode, gas benchmarks |
| Noir circuit ([corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)) | `eligibility`/`tags`/`conformance` modules, Grumpkin **Schnorr signature verification**, `nargo check`+`test` (20 tests, all failure modes), `nargo execute` on a real signed fixture, gate-count in CI (73 ACIR opcodes), best-effort `bb prove/verify` | pinned `bb` once beta.26 gets a published mapping |
| Midnight / Compact (this repo `contracts/`) | **issuer registry** (`registerIssuer`/`bumpEpoch`/`reportAttestations`), issuer-auth via control-secret hash, **compiles in CI (6 circuits)** | simulator tests, Preprod deploy (M4) |
| SDK ([corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk)) | `getPolicy`/`isCleared`/`passes`/`passRecord` (live), `buildWitness`, `verifyWitnessLocally`, **Grumpkin signer + `issueCredential`**, `makeFixture`, 3-step issuance, 25 tests, examples | `requestProof`/`enter` (need M3 + tx-relayer), issuer CLI |
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
  verification**, no Merkle path. 20 `nargo test`, `nargo execute` solves a real
  signed fixture. 73 ACIR opcodes (was ~3200).
- ✅ SDK Grumpkin signer (`schnorr.ts`) matches `noir-lang/schnorr` v0.4.0's
  pinned vector; `gen-circuit-fixture.ts` emits the circuit fixture and CI
  proves SDK ⇄ circuit agree.
- ✅ Contracts rebuilt for the 9-input Option B ABI (`min_cred_epoch` replaces
  the two roots); 33 host tests.
- ✅ Poseidon2 conformance still asserted circuit ⇄ SDK ⇄ Soroban.
- ✅ **Redeployed to testnet** (`deployments/testnet.json`); smoke-verified
  `register → enter` (PassGranted) `→ is_cleared == true`, replay rejected.
  `scripts/demo.sh` updated for the 9-input vector.
- ✅ `corridor-sdk` `TESTNET` preset and `web/src/config.ts` point at the new
  addresses; the site reads them live.
- ⏳ Still with the mock verifier — a real Option B *proof* through `enter()`
  waits on M3.

### M3 — Real verifier on Stellar (done 2026-10-06; PRs open for review)
- ✅ **Step 1** — vendored the OpenZeppelin-audited UltraHonk core
  (NethermindEth/ultrahonk-rust-verifier @ `097da17`, 0 Crit/High/Med) into
  `corridor-contracts/crates/ultrahonk_core` on an isolated soroban-sdk-28
  graph (the core needs SDK-28 host APIs; workspace stays on 25.3; the wire
  ABI is SDK-agnostic). `contracts/ultrahonk_verifier` now runs the full
  pipeline (transcript → sumcheck → Shplemini → pairing) fail-closed behind
  the `vk_hash` pin; VK parsed + validated at deploy, immutable. Host + wasm
  green (53 KB); branch `m3/scaffold-verifier` commit `6f275d4`, unpushed.
- ✅ **Step 2** — re-proved `corridor_eligibility` on the pinned toolchain
  (Noir 1.0.0-beta.9 + bb 0.87.0, UltraKeccakFlavor): proof 14,592 B, VK
  1,760 B, public_inputs 288 B (9 × 32 B), natively `bb verify`-checked and
  committed under `tests/circuits/`. Toolchain provenance cross-checked: the
  regenerated upstream `simple_circuit` VK is byte-identical to upstream's
  pinned artifact hash. Four adapter E2E tests on the real artifacts: real
  proof verifies in the Soroban host; mutated/truncated proofs and reordered
  public inputs rejected. CI skip dropped; 54 host tests green. Circuit
  needed beta.9 compatibility work (ASCII-only comments, poseidon v0.2.6
  retag — hash-identical at the used arities per `conformance.nr` — and
  schnorr v0.4.0 vendored with minimal beta.9 fixes to keep the
  SDK-pinned scheme): `corridor-circuits` `m3/beta9-toolchain` `2feb370`;
  contracts: `m3/scaffold-verifier` `3821160`. Pushed: contracts PR #16,
  circuits PR #5 (a first push silently dropped the fixtures under the
  `target/` gitignore rule — CI caught it; fixed in `0bd0320` and the
  ignore rule now re-includes exactly `proof`/`vk`/`public_inputs`).
- ✅ **Step 3** — real verifier live on testnet with a fresh Option-B stack
  (stellar-cli 28.0.0, identity `corridor-m3`): constructor validated +
  stored the real VK (`vk_hash f994ec68…`), corridor `0x…04` registered
  with the policy pinning that verifier + `vk_hash` (min_tier 3,
  min_cred_epoch 1, the fixture's deterministic issuer). On-chain E2E with
  a **fresh real bb 0.87.0 proof** (from the new
  `corridor-sdk/scripts/gen-testnet-fixture.ts`, PR #14 — the committed
  fixture's fixed `now` can never pass `enter`'s ledger-skew check):
  `enter` → `PassGranted` (tag 2, passes 1), `is_cleared == true`, replay →
  `NullifierUsed` (#12), tampered proof → `ProofInvalid` (#11). Addresses
  + tx hashes in `deployments/testnet.json` (`m3RealVerifier`). The
  2026-09-10 mock stack is untouched; decommission it or point its policy
  at the new verifier in a follow-up.
- ✅ **Done-when met:** the mock is out of the critical path for corridor
  `0x…04` — real cryptography grants and rejects passes on-chain.

### M4 — Midnight issuer registry live
- ✅ `compact compile` clean in CI; the compiled 6-circuit ZK keyset is
  verified in CI (all prover/verifier keys present).
- ✅ `midnight/` retargeted to Option B: `deploy.ts` (deploy + **atomic
  `initAdmin`**, audit R2-L7), `issuer.ts` (`init`/`register`/`bump`/
  `deregister`), `read.ts` (dump issuers + epochs). Typechecked. Counter /
  `enterCorridor` scaffolding removed.
- ⏳ Simulator tests: issuer registration, epoch monotonicity, control-secret
  auth, admin escape hatch.
- ⏳ Deploy to Midnight Preprod (needs a funded wallet from the Nethermind
  faucet); register a test issuer; bump an epoch; `npm run midnight:read`.
- **Done when:** an issuer registered on Preprod, with its epoch readable, and a
  corridor operator can mirror that epoch into `set_min_cred_epoch`.

### M5 — Issuer SDK & tooling
- ✅ SDK 3-step issuance — `prepareCredentialRequest` (holder) → `issueCredential`
  (issuer, sees only `holderBinding`) → `assembleCredential` (holder).
  `buildWitness` enforces `assertStrongSecret` (audit R2-H2 / R2-L2).
- Issuer CLI wrapping that flow: KYC-result in → sign → deliver the statement.
- Revocation-propagation helper (audit R2-M1): diff each accepted issuer's
  Midnight `issuerEpoch` against the corridor's Stellar `min_cred_epoch` and warn.
- Issuer key management: generation, rotation, the Midnight `bumpEpoch` call on
  rotation/compromise.
- **Done when:** an issuer can run KYC → sign → deliver a credential a holder
  can use, with no hand-crafted values, and an operator gets alerted when a
  revocation hasn't propagated.

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
