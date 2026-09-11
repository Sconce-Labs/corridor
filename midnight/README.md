# Midnight — the Corridor issuer registry

Deploy and operate [`../contracts/corridor.compact`](../contracts/corridor.compact)
— the public **issuer registry** for Corridor (Option B). It holds the set of
licensed issuer ids and each issuer's current credential epoch (the
bulk-revocation dial corridor operators mirror into their Stellar policy via
`corridor_registry.set_min_cred_epoch`). It stores **no holder data** and the
holder never touches Midnight.

## Quickstart (Preprod)

```bash
npm install
npm run compile                                   # → contracts/managed/corridor (6 ZK circuits)
npm run proof-server:start                         # local proof server on :6300

# fund a Preprod wallet — deploy.ts prints the address and polls for tNIGHT:
npm run midnight:deploy -- --network preprod       # deploy + claim admin (initAdmin) in one run

npm run midnight:issuer -- register 0x<issuerId> 0x<ctlHash> --network preprod
npm run midnight:read -- --network preprod         # dump admin, issuers, epochs
```

`issuerId` is `Poseidon2(issuer_pk.x, issuer_pk.y)` of the issuer's Grumpkin
signing key — the same id a Stellar corridor policy allowlists. Compute it with
`corridor-sdk`'s `issuerIdOf(publicKey(sk))`.

The admin control secret is `CORRIDOR_ADMIN_SECRET` (hex), or — by default —
`sha256("corridor-issuer-registry-admin/" + walletSeed)`. `deploy.ts` calls
`initAdmin` in the same run as the deploy so nobody can front-run the
first-caller-wins bootstrap (audit R2-L7).

## Files

| File | Role |
|------|------|
| `network.ts` | network configs (undeployed / preview / preprod), per-network wallet, deploy record in `.midnight-state.json` |
| `wallet.ts` · `wallet-state.ts` | wallet creation + sync-state persistence |
| `providers.ts` | shared compiled-contract loader + Midnight.js providers |
| `setup.ts` | one-shot: `docker compose up` → `compile` → `deploy` |
| `deploy.ts` | sync → fund → DUST → deploy → **`initAdmin`** → record address |
| `issuer.ts` | admin ops — `init` / `register` / `bump` / `deregister` (non-interactive) |
| `read.ts` | read the ledger off the indexer (no wallet) — admin, issuers, epochs, `attested` |
| `check-balance.ts` | read tNIGHT / DUST balances |
| `witnesses.ts` | empty — the registry persists no private state |

## Status

- ✅ `corridor.compact` compiles to a full 6-circuit ZK keyset (verified in CI).
- ✅ The deploy + issuer + read pipeline typechecks and boots (`npm run typecheck`).
- ⏳ Preprod deployment — needs a funded wallet from the
  [Midnight Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev).
  Tracked as [corridor#3](https://github.com/Sconce-Labs/corridor/issues/3).
