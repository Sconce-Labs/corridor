# Midnight deploy tooling

Wallet creation, faucet polling, DUST registration, and contract
deploy/interaction scripts for a Compact contract on a Midnight network.

**These were written for the retired `counter.compact` and still reference it.**
Before using them for `contracts/corridor.compact` (milestone M4):

- point `deploy.ts` / `cli.ts` at `contracts/managed/corridor` instead of
  `contracts/managed/counter`,
- update the private-state id and witness map for `corridor.compact`'s
  circuits (`initAdmin`, `registerIssuer`, `issueCredential`, `revokeCredential`),
- decide whether the credential accumulator stays on Midnight at all — see
  [`../docs/CREDENTIAL_ACCUMULATOR.md`](../docs/CREDENTIAL_ACCUMULATOR.md). If
  Option B (issuer-signed statements) is adopted, most of this contract goes
  away and so does the need for a synced Merkle root.

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
