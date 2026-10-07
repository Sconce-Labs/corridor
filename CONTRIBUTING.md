# Contributing to Corridor

Corridor is a portable proof-of-eligibility for cross-border payments:
complete KYC once with a regulated issuer, then prove eligibility to any
payment corridor with a zero-knowledge proof — no documents re-submitted, no
identity revealed. Start with [README.md](./README.md) and
[PROPOSAL.md](./PROPOSAL.md).

## Where the code lives

| Repo | What it is |
|------|------------|
| [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts) | Soroban contracts: registry, attestation, real UltraHonk verifier |
| [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits) | The Noir eligibility circuit (Grumpkin Schnorr + Poseidon2) |
| [corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk) | TypeScript SDK: witness building, signing, local verification |
| this repo | Proposal, architecture, audit log, roadmap, web frontend |

Each repo has its own `CONTRIBUTING.md` with setup, gates and invariants.

## Ground rules (all repos)

- **One issue per PR.** Reference it with `Closes #NNN`.
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- The public-input layout is a cross-repo ABI (`corridor-contracts/ABI.md`,
  `PI_*`): changing it requires coordinated PRs on contracts, circuits and SDK.
- Don't weaken a trust assumption without updating
  [ARCHITECTURE.md §6](./ARCHITECTURE.md).
- Apache-2.0; by contributing you agree your work is licensed under it.
- We follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Where docs live (one canonical home per doc)

Each document has exactly one owning repo. The hub owns project-level docs
(`ARCHITECTURE`, `PROPOSAL`, `ROADMAP`, `HANDOFF`, `AUDIT`, `AUDIT.md`-adjacent
records, `DRIPS.md`, `docs/DRIPS_ISSUES.md`); `corridor-contracts` owns the ABI
(`ABI.md`) and per-contract references; `corridor-circuits` owns circuit docs;
`corridor-sdk` owns API references.

When linking across repos — in any README, doc or issue — use the **full
`https://github.com/Sconce-Labs/<repo>/blob/main/<path>` URL**. Never use
`../`-style relative paths that escape the repo: they break in forks, PR file
views, and some renderers. Anchors must be verified against the target page's
current headings. The hub CI `Doc links` job validates repo-relative links;
cross-repo links are validated manually at merge time.

## Drips Wave

Corridor participates in the **Stellar Drips Wave** — see
[DRIPS.md](./DRIPS.md) for how rewards work and
[docs/DRIPS_ISSUES.md](./docs/DRIPS_ISSUES.md) for the issue map. Look for
issues labeled `good first issue` and `drips`.
