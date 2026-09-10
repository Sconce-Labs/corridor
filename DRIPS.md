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

| Area | Skills | Good first issues |
|------|--------|-------------------|
| `stellar/` | Rust, `soroban-sdk` | payout-push mode, event schema, fuzz the public-input decoder, gas benchmarking |
| `circuits/` | Noir, ZK | Merkle fixtures + witness builder, Poseidon2 conformance test, indexed-Merkle-tree revocation |
| `contracts/` | Compact / Midnight | get `corridor.compact` compiling, simulator tests, Preprod deploy script |
| `relayer/` | TS / Rust services | build the root-sync service (M5), multi-relayer quorum |
| `packages/` | TypeScript | `@corridor/verify` SDK, issuer CLI |
| `src/` | React / TS | holder app, operator console (M6) |
| docs | writing | keep `ARCHITECTURE.md` honest, threat model, USAGE guide |

Each milestone in [`ROADMAP.md`](./ROADMAP.md) is decomposed into issues in the
tracker. Start with anything tagged `milestone: M1` or `milestone: M2`.

## Ground rules

- One issue per PR. Keep diffs reviewable.
- `stellar/`: `cargo test --workspace` must pass; add tests for new behaviour.
- `circuits/`: `nargo test` must pass; if you touch the public-input layout,
  update `corridor_types` `PI_*` in the **same** PR.
- Don't weaken a trust assumption without updating `ARCHITECTURE.md` §6.
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Apache-2.0; by contributing you agree your work is licensed under it.

## Claiming rewards

Link your GitHub account on `drips.network`, make sure your merged PRs
reference the issue (`Closes #123`), and the Wave tooling attributes points
automatically. Payouts are USDC on Stellar.
