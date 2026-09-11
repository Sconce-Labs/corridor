# Contributing to Corridor via Drips Wave

Corridor is built in the open and is set up to participate in the
**[Stellar Drips Wave](https://www.drips.network/wave/stellar)** — a recurring
~7-day cycle where the Stellar Development Foundation funds a reward pool and
contributors earn a USDC share by closing issues with merged PRs.

## How it works

1. Corridor is listed as a repo on `drips.network` (Stellar Wave).
2. Maintainers label issues `drips` and assign a complexity
   (`complexity: low | medium | high` → roughly 100 / 150 / 200 points).
3. During a Wave, pick an open `drips` issue, comment to claim it, open a PR.
4. On merge, the points count toward your share of that Wave's pool.
5. Maintainers also split a share for review/triage.

No active Wave? Issues are still open — work ahead, PRs merge when ready, and
they count in the next cycle.

## Where to start

| Repo | Skills | Where to look |
|------|--------|---------------|
| **corridor-contracts** | Rust, `soroban-sdk` | the M3 verifier chain (#1, #2, #3), the audit-R2 hardening batch (#11–#14), payout-push, nullifier archival |
| **corridor-circuits** | Noir, ZK | green the `bb` CI job (#1, `good first issue`), in-circuit ECIES (#3), targeted-revocation spike (#2) |
| **corridor** (`contracts/` + `midnight/`) | Compact / Midnight | `corridor.compact` simulator tests (#2), Preprod deploy + `midnight/` trim (#3) |
| **corridor-sdk** | TypeScript | local prover (#1), tx-relayer client (#2), issuer CLI (#3), revocation-propagation helper (#10) |
| **corridor** (`web/`) | React / TS | CSP + error boundary (#8, `good first issue`), operator dashboard (#9), holder flow (#5), operator console (#6) |
| **corridor** (docs) | writing | threat model (#7); keep `ARCHITECTURE.md` §6 and `AUDIT.md` honest |
| tx-relayer _(new, M6)_ | TS / Rust services | build the fee-sponsoring `enter` relayer (`docs/TX_RELAYER.md`) |

The full issue map — number, milestone, complexity — is in
[`docs/DRIPS_ISSUES.md`](./docs/DRIPS_ISSUES.md). Start with anything tagged
`good first issue`; the M3 verifier work is the critical path.

## Ground rules

- One issue per PR. Keep diffs reviewable.
- **corridor-contracts**: `cargo test --workspace` + `cargo fmt` must pass.
- **corridor-circuits**: `nargo test` must pass; if you touch the public-input
  layout, update `corridor-contracts/ABI.md` and open matching PRs on the other
  two repos.
- Don't weaken a trust assumption without updating `corridor/ARCHITECTURE.md` §6.
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Apache-2.0; by contributing you agree your work is licensed under it.

## Claiming rewards

Link your GitHub account on `drips.network`, make sure your merged PRs
reference the issue (`Closes #123`), and the Wave tooling attributes points
automatically. Payouts are USDC on Stellar.
