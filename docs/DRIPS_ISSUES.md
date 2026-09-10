# Drips Wave — issue backlog

Paste-ready issues for the GitHub tracker. Each is one PR. Complexity maps to
Drips points (low ≈ 100, medium ≈ 150, high ≈ 200). Keep this file in sync as
issues are opened/closed.

---

## M1 — Stellar core on testnet

### #1 Deploy the Soroban stack to testnet + document addresses · low · M1
Deploy `verifier_mock`, `corridor_registry`, `corridor_attestation` to Stellar
testnet with a script (`stellar/scripts/deploy_testnet.sh`). Write the returned
addresses into `README.md` and `.env.example`. Add a `justfile`/`Makefile`
target.
**Done:** running the script from a clean checkout prints three addresses and a
one-line demo (`register` → `post_root` → `enter` → `is_cleared == true`).

### #2 Scripted end-to-end demo against the mock verifier · medium · M1
`stellar/scripts/demo.sh`: register a corridor, post a root, build a
public-input vector, call `enter`, assert a pass, assert `NullifierUsed` on
replay. Runs in CI against a local `stellar` sandbox.

### #3 Event schema + docs · low · M1
Define and document every event (`REG`, `ROOT`, `PASS`) — topic layout and data
payload — in `stellar/README.md`. Add tests asserting event contents with
`env.events().all()`.

### #4 Fuzz `PublicInputs::decode` · medium · M1
Property tests (proptest, host-only) for the decoder: random lengths, random
words, boundary values for the `u32`/`u64` fields. No panics; wrong length →
`BadPublicInputs`.

### #5 Gas / resource benchmarking harness · medium · M1
`stellar contract invoke` budget capture for `enter` with the mock verifier;
record CPU insns + footprint in `docs/BENCHMARKS.md`. Baseline for the M3 real
verifier comparison.

---

## M2 — Noir circuit proven

### #6 Merkle fixtures + witness builder · high · M2
A TS helper (`packages/witness/`) that builds a small credential tree, produces
inclusion paths and a revocation non-membership path, and emits `Prover.toml` +
the raw witness. Ship one committed fixture.

### #7 Poseidon2 cross-chain conformance test · high · M2
One test suite proving the Poseidon2 permutation output is identical across:
Noir (`circuits/`), Soroban's `poseidon2_permutation` host fn, and the Compact
`persistentHash`/tree hashing used in `contracts/corridor.compact`. Pin the
`poseidon` dependency in `Nargo.toml` to the matching version. **Blocks M3.**

### #8 `nargo test` coverage for every constraint · medium · M2
In-circuit `#[test]` cases: valid proof; wrong root; revoked; tier too low;
expired; bad nullifier; tag out of range; auditor blob mismatch.

### #9 Indexed Merkle tree for revocation (design + spike) · high · M2
Evaluate replacing the sparse-Merkle-tree non-membership with an indexed
Merkle tree (low-nullifier range proof). Write `docs/REVOCATION.md` with the
trade-off and a prototype circuit.

---

## M3 — Real verifier

### #10 Vendor the UltraHonk Soroban verifier · high · M3
Add `stellar/contracts/ultrahonk_verifier` adapting
`indextree/ultrahonk_soroban_contract` to implement the `Verifier` interface
(`verify(vk_hash, proof, public_inputs) -> bool`). VK set at deploy.

### #11 End-to-end proof → verify on testnet · high · M3
Generate a proof from the M6 fixture, deploy the real verifier with its VK,
point a test corridor policy at it, call `enter`. Add a CI job (nightly) that
does the full loop. Tampered proof → `ProofInvalid`.

### #12 Gas comparison + fallback decision · medium · M3
Benchmark the real verifier vs the #5 baseline. If `enter` is too expensive for
a payments use case, prototype a Groth16 verifier via `pairing_check` and
document the choice.

---

## M4 — Midnight credential registry

### #13 Get `corridor.compact` compiling · high · M4
Fix the Set / MerkleTree / hashing calls against CompactStandardLibrary (use
the Midnight docs MCP). `compact compile` clean; flip the CI `midnight` job off
`continue-on-error`.

### #14 Compact simulator tests · medium · M4
Port the test pattern from the old `counter-simulator.ts`: issuer registration,
issuance, revocation, epoch bump, and a test that credential attributes never
appear in ledger state.

### #15 Preprod deploy + root read script · medium · M4
Deploy `corridor.compact` to Midnight Preprod; script that issues N test
credentials and prints the current `credentials` / `revoked` roots from the
indexer (the values the relayer will post).

### #16 Retire the single-chain prototype · low · M4
Delete `contracts/counter.compact`, `tests/counter*.ts`,
`src/contracts/counter-contract.js`, `public/contracts/counter/`,
`node_modules.bak/`, `e2e-call.log`. Move Midnight scripts to `midnight/`.

---

## M5 — Relayer

### #17 Root-sync relayer (single) · high · M5
`relayer/`: watch Midnight `epoch`, read the two roots, call
`corridor_registry.post_root`. Config-driven (corridors, endpoints, key,
interval). Dockerfile + `docs/RELAYER.md`.

### #18 Multi-relayer quorum · high · M5
`corridor_registry.post_root` accepts a root for an epoch only once N distinct
allow-listed relayers have posted the same value. Contract change + tests +
relayer-side coordination.

---

## M6 — SDK + apps

### #19 `@corridor/verify` SDK · high · M6
`packages/verify`: `getPolicy`, `buildWitness`, `requestProof` (delegate to a
local prover), `enter` via a fee-sponsored relayer, `isCleared`. Mirrors the
`zk-payroll-sdk` monorepo layout.

### #20 Issuer CLI · medium · M6
`packages/issuer`: KYC-result JSON in → commitment + `issueCredential` call on
Midnight. Dry-run mode.

### #21 Holder app rewrite · high · M6
Replace `src/` single-chain UI: hold a credential, pick a corridor, generate +
submit a proof through the SDK, show the pass. Delete the faked `CircuitCall`.

### #22 Operator console · medium · M6
Register / update a corridor policy, watch the `PASS` event stream, pause.

### #23 Nullifier archival design · medium · M6
Design + implement an archival/rollup path so nullifier state rent stays
bounded without letting a live nullifier expire (replay risk).

---

## M7 — Auditor mode + pilot

### #24 In-circuit ECIES for `auditor_blob` · high · M7
Replace the hiding commitment with real encryption to the policy auditor key so
a warranted auditor can decrypt `{tier, issuer}` for a specific nullifier.

### #25 Auditor CLI + threshold key · high · M7
t-of-n auditor key management; CLI that takes a warrant list of nullifiers and
decrypts the corresponding `PassRecord` blobs.

### #26 Pilot integration kit · medium · M7
A drop-in package + docs for one pilot corridor (anchor or NGO): policy setup,
`is_cleared` gate wiring, trust/compliance memo template.

---

## Cross-cutting

### #27 Threat model doc · medium · any
`docs/THREATMODEL.md`: assets, adversaries, per-layer attacks, mitigations,
what's explicitly out of scope pre-mainnet.

### #28 `justfile` for the whole repo · low · any
One entrypoint: `just test` (all three layers), `just deploy-testnet`,
`just circuit`, `just fmt`.
