# Drips Wave — issue map

The backlog is **live as GitHub issues**, per repo, labelled `drips` +
`complexity: *` + `area: *`. Pick anything tagged `good first issue` to start.

**80 open issues right now, 31 of them `good first issue`.**

| Complexity | ~Drips points |
|------------|--------------:|
| `complexity: low` | 100 |
| `complexity: medium` | 150 |
| `complexity: high` | 200 |

### [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts/issues) — Soroban · ZK verifier · Rust

| # | Title | Complexity | Labels |
|---|-------|-----------|--------|
| 11 | Extend the Policy storage TTL on read (audit R2-M2) | low | **gfi**, milestone: M3, area: contracts |
| 17 | test: enter() rejects a proof when the verifier contract itself traps | medium | **gfi**, area: contracts |
| 20 | docs: DEPLOYING.md — walkthrough deploying the real verifier + registering a corridor | medium | **gfi**, area: docs |
| 27 | test: verifier constructor boundary — 1759/1760/1761-byte VKs | low | **gfi**, area: contracts |
| 28 | test: verify() word-count boundary — 8 and 10 public inputs return false | low | **gfi**, area: contracts |
| 29 | test: vk_hash()/vk_bytes() on an uninitialized instance return VkNotSet | low | **gfi**, area: contracts |
| 30 | test: real-fixture VK bytes round-trip through vk_bytes() | low | **gfi**, area: contracts |
| 31 | docs: rustdoc pass on corridor_registry public functions + events | low | **gfi**, area: docs |
| 32 | docs: rustdoc pass on corridor_attestation public functions + events | low | **gfi**, area: docs |
| 33 | docs: rustdoc pass on ultrahonk_verifier errors + storage keys | low | **gfi**, area: docs |
| 36 | docs: verifier_mock README — NOT FOR PRODUCTION banner | low | **gfi**, area: docs |
| 38 | chore: clippy::pedantic cleanup batch in the adapter crates | low | **gfi**, area: contracts |
| 39 | chore: editorconfig + formatting config consistency across crates | low | **gfi**, area: infra |
| 44 | chore: Makefile fmt target + doctor target verifying toolchain versions | low | **gfi**, area: infra |
| 45 | test: set_min_cred_epoch idempotent at the same value | low | **gfi**, area: contracts |
| 46 | docs: document the deployments/testnet.json schema + update procedure | low | **gfi**, area: docs |
| 3 | Gas / resource benchmark harness for enter() | medium | milestone: M3, area: contracts |
| 5 | Payout-push mode: enter() performs a gated token transfer | medium | milestone: M6, area: contracts |
| 6 | Nullifier archival / state-rent design | medium | milestone: M6, area: contracts |
| 12 | Guard verifier / vk_hash swaps: delay or monotonic policy version (audit R2-M3) | medium | security, milestone: M3, area: contracts |
| 13 | Canonical verifier registry — admin-curated (verifier, vk_hash) pairs (audit R2-M4) | medium | milestone: M3, area: contracts |
| 14 | Global pause on corridor_attestation + real admin powers (audit R2-M8) | medium | security, milestone: M3, area: contracts |
| 18 | test: assert event payloads (not just success) in contract tests | medium | area: contracts |
| 19 | docs: ABI.md — document the vk_hash policy binding + a worked example | medium | area: docs |
| 21 | docs: BENCHMARKS.md refresh after M3 | medium | area: docs |
| 22 | ci: publish a wasm-size summary comment on PRs | medium | area: infra |
| 23 | feature: corridor pass-count read helper for payout contracts | medium | area: contracts |
| 24 | feature: batched is_cleared query | high | area: contracts |
| 40 | ci: cache the stellar CLI install in the wasm job | low | area: infra |

### [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits/issues) — Noir circuits

| # | Title | Complexity | Labels |
|---|-------|-----------|--------|
| 6 | docs: rustdoc the helper functions in eligibility.nr | low | **gfi**, area: docs |
| 13 | docs: document the vendored schnorr + poseidon pin rationale in the README | low | **gfi**, area: docs |
| 14 | chore: add .editorconfig | low | **gfi**, area: infra |
| 16 | chore: upstream the vendored schnorr beta.9 compatibility patch to noir-lang/schnorr | low | **gfi**, area: circuits |
| 2 | Targeted single-credential revocation (on-Stellar IMT) — design + spike | high | milestone: M7, area: circuits |
| 3 | In-circuit ECIES for auditor_blob | high | security, milestone: M7, area: circuits |
| 7 | docs: README quick-start for contributors + toolchain pin section | medium | area: docs |
| 8 | test: boundary fixture — expiry == now is rejected, expiry == now + 1 accepted | medium | area: circuits |
| 9 | test: issuer_pk off the Grumpkin curve is rejected | medium | area: circuits |
| 10 | test: conformance — add an arity-3 pinned Poseidon2 vector | medium | area: circuits |
| 11 | ci: commit SHA256SUMS of the fixture artifacts and verify them in CI | medium | area: infra |
| 12 | ci: nightly nargo@latest canary (allowed to fail) to catch future beta drift | medium | area: infra |
| 15 | docs: CIRCUIT.md — what each of the 9 public inputs means (and hides) | medium | area: docs |

### [corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk/issues) — `@corridor/verify` · TypeScript

| # | Title | Complexity | Labels |
|---|-------|-----------|--------|
| 16 | test: assertStrongSecret boundary cases | low | **gfi** |
| 17 | test: hex.ts edge cases — odd-length hex, 0x prefixes, >32-byte values | low | **gfi** |
| 19 | docs: typedoc pass on the public API (index.ts exports) | low | **gfi** |
| 23 | fix/docs: audit networks.ts presets and document each choice | low | **gfi** |
| 24 | docs: README quick-start with live testnet reads (corridor 0x…04) | low | **gfi** |
| 25 | chore: dedupe fixture-generation logic between the two generator scripts | low | **gfi** |
| 1 | Local Noir prover service + requestProof wiring | high | milestone: M6, area: sdk |
| 2 | enter() via a fee-sponsored relayer | medium | milestone: M6, area: sdk |
| 3 | Issuer CLI | medium | milestone: M6, area: sdk |
| 10 | Revocation-propagation helper: diff Midnight issuerEpoch vs Stellar min_cred_epoch (audit R2-M1) | medium | milestone: M5, area: sdk |
| 15 | test: buildWitness rejects expiry <= now | medium |  |
| 18 | test: poseidon2 order-sensitivity property over randomized inputs | medium |  |
| 20 | feat: examples/ — end-to-end issuance + local verification script | medium |  |
| 21 | feat: simulatedEnter() — build the enter() invocation a wallet can sign | high |  |
| 22 | feat: policy cache with TTL in SorobanReader | medium |  |
| 26 | test: assert the SDK public-input encoding byte-matches the committed fixture's public_inputs file | medium | area: sdk |

### [corridor](https://github.com/Sconce-Labs/corridor/issues) — hub · web app · Midnight

| # | Title | Complexity | Labels |
|---|-------|-----------|--------|
| 9 | web/: wire the live pass count + demo policy into an operator dashboard view | low | **gfi**, milestone: M6, area: frontend |
| 18 | web: add SRI to external static assets | low | **gfi**, area: frontend |
| 19 | web: is_cleared checker — input validation + error states | low | **gfi**, area: frontend |
| 20 | web: accessibility audit fixes batch | low | **gfi**, area: frontend |
| 27 | docs: AUDIT.md — mark R2-C1 resolved now that M3 is merged to main | low | **gfi**, area: docs |
| 2 | corridor.compact simulator tests | medium | milestone: M4, area: midnight |
| 3 | corridor.compact: Preprod deploy + issuerEpoch read + midnight/ trim | medium | milestone: M4, area: midnight |
| 5 | Holder flow in the web app (buildWitness → prove → enter) | high | milestone: M6, area: frontend |
| 6 | Operator console | medium | milestone: M6, area: frontend |
| 7 | Threat model doc | medium | area: docs |
| 12 | web: operator dashboard — layout + live policy read | high | area: frontend |
| 13 | web: operator dashboard — pass list + nullifier ledger view | medium | area: frontend |
| 14 | web: holder flow — buildWitness integration | high | area: frontend |
| 15 | web: holder flow — connect the local prover service | high | area: frontend |
| 16 | web: holder flow — enter() submission + status display | medium | area: frontend |
| 17 | web: CSP follow-ups — nonce-based script policy | medium | area: frontend |
| 21 | docs: ARCHITECTURE.md — mermaid sequence diagram of enter() | medium | area: docs |
| 22 | docs: FAQ page derived from the audit assumptions | medium | area: docs |
| 23 | docs: refresh the demo video script for the real verifier | low | area: docs |
| 24 | midnight: simulator test — issuer registration flow | medium | area: midnight |
| 25 | midnight: simulator tests — epoch monotonicity + control-secret auth | medium | area: midnight |
| 28 | ops: tear down the 2026-09-10 mock stack after update_policy (needs the original corridor operator key) | low | blocked, area: contracts |

---

## Ground rules


- One issue per PR. `Closes #N` in the PR body.

- **corridor-contracts:** `cargo test --workspace --locked` + `cargo fmt --check` + `cargo clippy -D warnings` green.

- **corridor-circuits:** `nargo test` + `nargo fmt --check` green.

- **corridor-sdk:** `npm run typecheck && npm test && npm run build` green.

- A **public-input layout change** is a coordinated PR across `corridor-contracts`
  (+ [`ABI.md`](https://github.com/Sconce-Labs/corridor-contracts/blob/main/ABI.md)),
  `corridor-circuits`, and `corridor-sdk`.

- Don't weaken a trust assumption without updating `ARCHITECTURE.md` §6 and
  `AUDIT.md`.

- Conventional commits. Apache-2.0.
