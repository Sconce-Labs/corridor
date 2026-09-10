# Corridor circuits

`corridor_eligibility` — the Noir circuit a holder runs client-side to prove
they may enter a corridor, without revealing who they are.

## What it proves

See the doc comment at the top of [`corridor_eligibility/src/main.nr`](./corridor_eligibility/src/main.nr).
In one line: *"I hold an unexpired, unrevoked credential of tier ≥ N issued by
an accepted issuer, and here is a per-corridor nullifier that can't be linked
to my other corridors."*

## Public-input ABI

The order of `pub` parameters in `main` is a contract with the Stellar side
(`stellar/crates/corridor_types/src/lib.rs`, the `PI_*` constants):

| idx | name | type |
|----:|------|------|
| 0 | `credential_root` | Field |
| 1 | `revocation_root` | Field |
| 2 | `corridor_id` | Field |
| 3 | `min_tier` | u32 |
| 4 | `now` | u64 |
| 5 | `nullifier` | Field |
| 6 | `disclosed_tag` | u32 |
| 7 | `issuer_id` | Field |
| 8 | `auditor_blob` | Field |

Change one side → change both in the same PR.

## Build & prove

```bash
# toolchain: noirup + bbup  (https://noir-lang.org/docs/getting_started/quick_start)
cd circuits/corridor_eligibility
nargo check          # type-check, generate Prover.toml skeleton
nargo test           # runs the in-circuit #[test] fns
nargo execute        # witness from Prover.toml
bb prove  -b ./target/corridor_eligibility.json -w ./target/corridor_eligibility.gz -o ./target
bb write_vk -b ./target/corridor_eligibility.json -o ./target
bb contract          # emits the Solidity verifier; for Soroban use the
                     # ultrahonk_soroban_contract wrapper (see stellar/README.md)
```

## Known gaps (tracked in ROADMAP.md)

- **M2** — real Merkle fixtures + a witness builder; `Prover.toml` here is
  shape-only.
- **M2** — `poseidon` dependency `tag` in `Nargo.toml` is a placeholder; pin to
  the version whose permutation matches the Soroban `poseidon2_permutation`
  host function exactly, or the roots won't agree across chains.
- **M7** — `auditor_blob` is a hiding commitment, not real encryption. Replace
  with in-circuit ECIES so a warranted auditor can actually decrypt.
- The revocation tree is a sparse Merkle tree with the empty leaf = 0 and a
  fixed depth of 32. Revisit vs. an indexed Merkle tree if revocation volume
  grows.
