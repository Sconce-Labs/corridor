# Corridor — Stellar / Soroban contracts

The settlement + verification side of the hybrid design ([`../ARCHITECTURE.md`](../ARCHITECTURE.md)).

## Workspace

| Crate | Kind | Role |
|-------|------|------|
| `crates/corridor_types` | rlib | Shared types, errors, the public-input ABI, and the `Verifier` / `Registry` cross-contract interfaces. |
| `contracts/corridor_registry` | contract | Per-corridor [`CorridorPolicy`]; relayer posts synced Midnight roots via `post_root`. |
| `contracts/corridor_attestation` | contract | `enter(corridor_id, proof, public_inputs)` → bind to policy → verify → burn nullifier → record pass. `is_cleared()` for payout gating. |
| `contracts/verifier_mock` | contract | Configurable pass/fail verifier for tests and staged rollout. **Not for production.** |

## Build & test

```bash
cd stellar
cargo test --workspace          # host tests, no network
stellar contract build          # wasm for each contract crate
```

Requires the `wasm32v1-none` target (`rustup target add wasm32v1-none`) and
`stellar` CLI ≥ 22.

## Deploy (testnet)

```bash
stellar keys generate corridor --network testnet --fund

# 1. verifier (mock for now; real UltraHonk verifier at M3)
VERIFIER=$(stellar contract deploy --wasm target/wasm32v1-none/release/verifier_mock.wasm \
  --source corridor --network testnet)

# 2. registry (admin = your key)
ADMIN=$(stellar keys address corridor)
REGISTRY=$(stellar contract deploy --wasm target/wasm32v1-none/release/corridor_registry.wasm \
  --source corridor --network testnet -- --admin $ADMIN)

# 3. attestation (points at the registry)
ATTESTATION=$(stellar contract deploy --wasm target/wasm32v1-none/release/corridor_attestation.wasm \
  --source corridor --network testnet -- --registry $REGISTRY)

echo "verifier=$VERIFIER registry=$REGISTRY attestation=$ATTESTATION"
```

Record the addresses in [`../README.md`](../README.md) and `../.env`.

## Integration for a corridor operator

1. `corridor_registry.register(corridor_id, policy)` with your operator key.
2. A relayer keeps `credential_root` / `revocation_root` fresh
   (`post_root`). Until M5 you can run this yourself.
3. Your existing payout contract calls
   `corridor_attestation.is_cleared(corridor_id, nullifier)` before releasing
   funds. That's the whole integration surface.

## State-rent note

`corridor_attestation` stores one persistent entry per granted pass
(`Nullifier(corridor_id, nullifier)`), TTL-extended to ~30 days. High-volume
corridors will accrue rent; M6 adds an archival/rollup path. Nullifiers must
not be allowed to silently expire while a credential is still valid — see
ROADMAP.md.
