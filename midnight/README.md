# Midnight deploy tooling

Wallet creation, faucet polling, DUST registration, and contract
deploy/interaction scripts for a Compact contract on a Midnight network.

**These were written for the retired `counter.compact` and still reference it
(and a since-removed `enterCorridor` circuit).** Option B is now the design
([`../docs/CREDENTIAL_ACCUMULATOR.md`](../docs/CREDENTIAL_ACCUMULATOR.md)): the
holder never touches Midnight, and `corridor.compact` is just an issuer
registry. Before using this tooling for it (milestone M4):

- point `deploy.ts` / `cli.ts` at `contracts/managed/corridor`,
- update the private-state id and witness map for the Option B circuits
  (`initAdmin`, `registerIssuer`, `deregisterIssuer`, `bumpEpoch`,
  `adminBumpEpoch`, `reportAttestations`),
- drop the holder-proving / `enterCorridor` paths entirely — there is no
  synced Merkle root and no holder-side Midnight flow anymore.

## Files

| File | Role |
|------|------|
| `network.ts` | resolve network config, per-network wallet, deploy record |
| `wallet.ts` / `wallet-state.ts` | wallet creation + sync-state persistence |
| `setup.ts` | one-shot: create wallet → fund → register DUST |
| `deploy.ts` | compile-check → sync → fund → deploy → record address |
| `cli.ts` | interactive circuit calls against a deployed contract |
| `check-balance.ts` | read tNIGHT / DUST balances |
| `e2e-check.ts` / `e2e-call.ts` | reconnect + read ledger state (CI smoke) |
