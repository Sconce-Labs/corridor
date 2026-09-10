# Drips Wave — issues

The backlog is now **live as GitHub issues**, one per repo, labelled `drips` +
`milestone: M*` + `complexity: *` + `area: *`.

| Repo | Open issues | Themes |
|------|-------------|--------|
| [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts/issues) | 7 | UltraHonk verifier (M3), gas benchmarks, `#[contractevent]`, payout-push, nullifier archival, fuzz the decoder |
| [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits/issues) | 3 | `bb prove`/`verify` in CI, indexed-Merkle revocation, in-circuit ECIES |
| [corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk/issues) | 3 | local prover service, relayer-submit `enter`, issuer CLI |
| [corridor-relayer](https://github.com/Sconce-Labs/corridor-relayer/issues) | 2 | Midnight indexer reader (M5), multi-relayer quorum |
| [corridor](https://github.com/Sconce-Labs/corridor/issues) | 6 | Compact simulator tests + Preprod (M4), retire `counter`, holder app, operator console, threat model |

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
