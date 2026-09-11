# Corridor — components

Corridor is split across repos so each piece has its own CI, versioning, and
[Drips Wave](./DRIPS.md) issue surface. This repo is the **hub**: architecture,
docs, and the Midnight issuer-registry contract.

| Repo | Contents | Language | Status |
|------|----------|----------|--------|
| **[Sconce-Labs/corridor](https://github.com/Sconce-Labs/corridor)** (this) | `ARCHITECTURE.md`, `PROPOSAL.md`, `ROADMAP.md`, `HANDOFF.md`, `DRIPS.md`, `docs/`, `contracts/corridor.compact` (Midnight issuer registry), `midnight/` (deploy + issuer-ops tooling) | Compact, TS | active |
| **[Sconce-Labs/corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)** | Soroban workspace: `corridor_registry`, `corridor_attestation`, `ultrahonk_verifier`, `verifier_mock`, `corridor_types`, `poseidon_conformance`. **Owns the public-input ABI** (`ABI.md`). | Rust / soroban-sdk 25 | ✅ 33 tests; deployed + smoke-verified on testnet (Option B) |
| **[Sconce-Labs/corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)** | `corridor_eligibility` Noir circuit (Grumpkin Schnorr) | Noir | ✅ 20 tests, signed fixture, `nargo execute` |
| **[Sconce-Labs/corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk)** | `@corridor/verify` client SDK + Grumpkin signer (`issueCredential`) | TypeScript | ✅ 25 tests; reads + `buildWitness` + 3-step issuance real; prover+tx-relayer clients pending |
| **[Sconce-Labs/corridor-relayer](https://github.com/Sconce-Labs/corridor-relayer)** | ~~Midnight→Stellar root-sync service~~ | TypeScript | 🗄️ **archived** — Option B removed root sync |

## The ABI seam

`corridor-contracts/crates/corridor_types` (`PI_*` constants) is the **source of
truth** for the ZK proof's public-input layout, mirrored in
`corridor-contracts/ABI.md`. The circuit emits inputs in that order; the SDK
assembles them the same way. A layout change is a coordinated PR across
`corridor-contracts` + `corridor-circuits` + `corridor-sdk`.

**Poseidon2 conformance:** `poseidon2([1,2]) == 0x038682…1ed7383` is asserted in
the circuit, the SDK, and `corridor-contracts` — all three agree. Midnight
(`corridor.compact`) no longer participates in any hash-critical path under
Option B — it only stores an issuer directory.

**Schnorr conformance:** `corridor-sdk/src/schnorr.ts` is checked against
`noir-lang/schnorr` v0.4.0's pinned test vector, and the generated `fixture.nr`
is solved by `nargo execute` in circuit CI — so the SDK signer and the circuit
verifier provably agree.

## Working across repos

```bash
for r in corridor corridor-contracts corridor-circuits corridor-sdk; do
  git clone "https://github.com/Sconce-Labs/$r.git"
done
```

`just test` in this repo runs all layers when the components are checked out as
siblings.
