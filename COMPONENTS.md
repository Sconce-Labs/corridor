# Corridor — components

Corridor is split across repos so each piece has its own CI, versioning, and
[Drips Wave](./DRIPS.md) issue surface. This repo is the **hub**: architecture,
docs, the Midnight credential contract, and the frontend.

| Repo | Contents | Language | Status |
|------|----------|----------|--------|
| **[Sconce-Labs/corridor](https://github.com/Sconce-Labs/corridor)** (this) | `ARCHITECTURE.md`, `PROPOSAL.md`, `ROADMAP.md`, `HANDOFF.md`, `DRIPS.md`, `docs/`, `contracts/corridor.compact` (Midnight), `src/` (frontend) | Compact, TS | active · frontend live at [corridor-pink.vercel.app](https://corridor-pink.vercel.app) |
| **[Sconce-Labs/corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)** | Soroban workspace: `corridor_registry`, `corridor_attestation`, `verifier_mock`, `corridor_types`, `poseidon_conformance`. **Owns the public-input ABI** (`ABI.md`). | Rust / soroban-sdk 25 | ✅ deployed to Stellar testnet |
| **[Sconce-Labs/corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)** | `corridor_eligibility` Noir circuit | Noir | ✅ compiles + tests; needs real fixtures |
| **[Sconce-Labs/corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk)** | `@corridor/verify` client SDK | TypeScript | ✅ `getPolicy`/`isCleared`/`buildWitness` real; prover+relayer clients pending |
| **[Sconce-Labs/corridor-relayer](https://github.com/Sconce-Labs/corridor-relayer)** | Midnight→Stellar root-sync service | TypeScript | ⏳ Stellar read/write real; Midnight reader pending (M5) |

## The ABI seam

`corridor-contracts/crates/corridor_types` (`PI_*` constants) is the **source of
truth** for the ZK proof's public-input layout, mirrored in
`corridor-contracts/ABI.md`. The circuit emits inputs in that order; the SDK
assembles them the same way. A layout change is a coordinated PR across
`corridor-contracts` + `corridor-circuits` + `corridor-sdk`.

**Poseidon2 conformance:** `poseidon2([1,2]) == 0x038682…1ed7383` is asserted in
the circuit, the SDK, and `corridor-contracts` — all three agree. Midnight's
Compact tree hash still needs the same check (M4).

## Working across repos

```bash
for r in corridor corridor-contracts corridor-circuits corridor-sdk corridor-relayer; do
  git clone "https://github.com/Sconce-Labs/$r.git"
done
```

`just test` in this repo runs all layers when the components are checked out as
siblings.
