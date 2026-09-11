# Drips Wave — issue map

The backlog is **live as GitHub issues**, per repo, labelled `drips` +
`milestone: M*` + `complexity: *` + `area: *`. Pick anything tagged
`good first issue` to start.

| Complexity | ~Drips points |
|------------|--------------:|
| `low` | 100 |
| `medium` | 150 |
| `high` | 200 |

## By repo

### [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts/issues) — Soroban

| # | Title | Milestone | Cx |
|---|-------|-----------|----|
| 1 | Vendor the UltraHonk Soroban verifier behind the `Verifier` interface | M3 | high |
| 2 | End-to-end: real proof → `enter()` on testnet | M3 | high |
| 3 | Gas / resource benchmark harness for `enter()` | M3 | medium |
| 11 | Extend the `Policy` storage TTL on read (audit R2-M2) | M3 | low · gfi |
| 12 | Guard verifier / vk_hash swaps — delay or policy version (R2-M3) | M3 | medium |
| 13 | Canonical verifier registry — admin-curated `(verifier, vk_hash)` (R2-M4) | M3 | medium |
| 14 | Global pause on `corridor_attestation` + real admin powers (R2-M8) | M3 | medium |
| 5 | Payout-push mode: `enter()` performs a gated token transfer | M6 | medium |
| 6 | Nullifier archival / state-rent design | M6 | medium |
| 7 | Fuzz `PublicInputs::decode` (partly done) | M3 | medium |

### [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits/issues) — Noir

| # | Title | Milestone | Cx |
|---|-------|-----------|----|
| 1 | Get the best-effort `bb prove + verify` CI job green | infra | low · gfi |
| 2 | Targeted single-credential revocation (on-Stellar IMT) — design + spike | M7 | high |
| 3 | In-circuit ECIES for `auditor_blob` — real auditor opening (R2-M5) | M7 | high · security |

### [corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk/issues) — `@corridor/verify`

| # | Title | Milestone | Cx |
|---|-------|-----------|----|
| 1 | Local Noir prover service + `requestProof` wiring | M6 | high |
| 2 | `enter()` via a fee-sponsoring relayer | M6 | medium |
| 3 | Issuer CLI (KYC result → 3-step issuance, CSPRNG enforcement) | M6 | medium |
| 10 | Revocation-propagation helper: diff Midnight `issuerEpoch` vs Stellar floor (R2-M1) | M5 | medium |

### [corridor](https://github.com/Sconce-Labs/corridor/issues) — hub · Midnight · web

| # | Title | Milestone | Cx |
|---|-------|-----------|----|
| 2 | `corridor.compact` simulator tests | M4 | medium |
| 3 | `corridor.compact` Preprod deploy + `issuerEpoch` read + `midnight/` trim | M4 | medium |
| 7 | Threat model doc | — | medium |
| 8 | `web/`: CSP header + React error boundary (R2-L5/L6) | M6 | low · gfi |
| 9 | `web/`: operator dashboard view (live pass count + policy + event feed) | M6 | low · gfi |
| 5 | Holder flow in the web app (`buildWitness` → prove → `enter`) | M6 | high |
| 6 | Operator console | M6 | medium |

### tx-relayer _(new service, M6)_

Build the fee-sponsoring `enter` relayer — spec at
[`docs/TX_RELAYER.md`](./TX_RELAYER.md). Its own repo when it starts.

### ~~corridor-relayer~~

Archived — Option B removed the root sync. Nothing to do here.

---

## Ground rules

- One issue per PR. `Closes #N` in the PR body.
- **corridor-contracts:** `cargo test --workspace` + `cargo fmt` + `cargo clippy` green.
- **corridor-circuits:** `nargo test` + `nargo execute` + `nargo fmt --check` green.
- A **public-input layout change** is a coordinated PR across `corridor-contracts`
  (+ [`ABI.md`](https://github.com/Sconce-Labs/corridor-contracts/blob/main/ABI.md)),
  `corridor-circuits`, and `corridor-sdk`.
- Don't weaken a trust assumption without updating `ARCHITECTURE.md` §6 and
  `AUDIT.md`.
- Conventional commits. Apache-2.0.
