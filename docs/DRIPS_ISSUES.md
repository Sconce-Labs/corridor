# Drips Wave — issues

The backlog is now **live as GitHub issues**, one per repo, labelled `drips` +
`milestone: M*` + `complexity: *` + `area: *`.

> **Option B (2026-09-10) changed the backlog.** Issues about the credential
> accumulator, Merkle fixtures, indexed-tree revocation, the root-sync relayer
> and the `corridor-relayer` repo are **void**. New/changed themes below.

| Repo | Themes (post Option B) |
|------|-----------------------|
| [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts/issues) | UltraHonk verifier (M3), **testnet redeploy for the Option B ABI (M2)**, gas benchmarks, payout-push, nullifier archival, fuzz the decoder |
| [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits/issues) | pin `bb` in CI, targeted-revocation IMT (deferred), circuit review, in-circuit ECIES for the auditor blob (M7) |
| [corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk/issues) | local prover service, tx-relayer-submit `enter`, issuer CLI (KYC → sign, CSPRNG enforcement) |
| tx-relayer (new, M6) | build the fee-sponsoring `enter` relayer — see `docs/TX_RELAYER.md` |
| [corridor](https://github.com/Sconce-Labs/corridor/issues) | `corridor.compact` simulator tests + Preprod (M4), trim `midnight/` tooling, holder app, operator console, threat model |
| ~~corridor-relayer~~ | archived — fold any live issues into the tx-relayer |

Pick anything labelled `good first issue` to start. Complexity → Drips points:
`low` ≈ 100, `medium` ≈ 150, `high` ≈ 200.

## Ground rules

- One issue per PR. `Closes #N` in the PR body.
- `corridor-contracts`: `cargo test --workspace` + `cargo fmt` green.
- `corridor-circuits`: `nargo test` + `nargo execute` green; a public-input
  layout change means matching PRs on `corridor-contracts` (+ `ABI.md`) and
  `corridor-sdk`.
- Don't weaken a trust assumption without updating `corridor/ARCHITECTURE.md` §6.
- Conventional commits. Apache-2.0.
