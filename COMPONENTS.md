# Corridor — components

Corridor is split across repos so each piece has its own CI, versioning, and
[Drips Wave](./DRIPS.md) issue surface. This repo is the **hub**: architecture,
docs, the Midnight credential contract, and the frontend.

| Repo | Contents | Language | Status |
|------|----------|----------|--------|
| **Sconce-Labs/corridor** (this) | `ARCHITECTURE.md`, `PROPOSAL.md`, `ROADMAP.md`, `HANDOFF.md`, `DRIPS.md`, `docs/`, `contracts/corridor.compact` (Midnight), `src/` (frontend) | Compact, TS | active |
| **[Sconce-Labs/corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)** | Soroban workspace: `corridor_registry`, `corridor_attestation`, `verifier_mock`, `corridor_types`. **Owns the public-input ABI** (`ABI.md`). | Rust / soroban-sdk 25 | deployed to testnet |
| **[Sconce-Labs/corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)** | `corridor_eligibility` Noir circuit | Noir | written, unproven |
| **[Sconce-Labs/corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk)** | `@corridor/verify` client SDK | TypeScript | skeleton |
| **Sconce-Labs/corridor-relayer** _(not yet created)_ | Midnight→Stellar root-sync service | TS/Rust | roadmap M5 |

## The ABI seam

`corridor-contracts/crates/corridor_types` (`PI_*` constants) is the **source of
truth** for the ZK proof's public-input layout, mirrored in
`corridor-contracts/ABI.md`. The circuit emits inputs in that order; the SDK
assembles them the same way. A layout change is a coordinated PR across
`corridor-contracts` + `corridor-circuits` + `corridor-sdk`.

## Working across repos

Clone what you need side by side:

```bash
git clone https://github.com/Sconce-Labs/corridor.git
git clone https://github.com/Sconce-Labs/corridor-contracts.git
git clone https://github.com/Sconce-Labs/corridor-circuits.git
git clone https://github.com/Sconce-Labs/corridor-sdk.git
```

Optionally wire them as submodules under `components/` once the remotes exist:

```bash
git submodule add https://github.com/Sconce-Labs/corridor-contracts components/contracts
git submodule add https://github.com/Sconce-Labs/corridor-circuits  components/circuits
git submodule add https://github.com/Sconce-Labs/corridor-sdk       components/sdk
```
