# Corridor

> A portable proof of eligibility — this Level 1 contract is a privacy-preserving "corridor passes" counter: callers prove a private entitlement and disclose only an entry tag, while the aggregate pass count stays public on the Midnight ledger.

## Contract Address

| Network  | Address                          |
|----------|----------------------------------|
| Preview  | [PASTE ADDRESS AFTER DEPLOY]     |
| Preprod  | [PASTE ADDRESS AFTER DEPLOY]     |

## What This Does

Corridor separates *proving you're eligible* from *revealing your identity*.
This Level 1 contract is the first building block: a public access counter
for a payment corridor.

- Anyone can read the **public ledger state**: `passes` (how many corridor
  passes have been granted in total) and `lastEntryTag` (a human-readable tag
  the caller chose to publish, e.g. `"tier-2-pass"`).
- To register a pass, a caller invokes the `enterCorridor` circuit with a
  **private witness** (`entitlement`) plus a tag. The circuit only checks
  that the entitlement is non-zero, increments the public counter by a
  constant `1`, and discloses the tag.
- The caller's entitlement value never reaches the ledger — an observer sees
  only that a pass was granted, never how much the caller is entitled to.

This is the seed of the full Corridor vision (a portable KYC credential
proven once and used across Stellar corridors) — Level 1 scopes it tightly
to one issuer, one claim, one consuming contract.

## Privacy Model

- **What is PUBLIC (on-chain, visible to anyone):**
  - `passes` — `Counter`: the aggregate number of corridor passes granted.
  - `lastEntryTag` — `Opaque<"string">`: the entry tag the caller
    deliberately disclosed via `disclose()`.
- **What is PRIVATE (private witness, never on-chain):**
  - `entitlement` — `Uint<0..1000>`: a private witness supplied by the
    caller. The circuit reads it only inside the `assert` and never writes
    it to the ledger.
- **What the user PROVES without revealing:**
  - That they hold a non-zero entitlement to pass — without revealing the
    entitlement's value. `disclose()` is used exactly once and deliberately:
    to publish only the entry tag.

## Tech Stack

- Midnight network (privacy-preserving blockchain)
- Compact language (zero-knowledge smart contracts)
- Midnight.js SDK (deploy + interact from TypeScript)
- Node.js v22, Docker (proof server + local devnet)

## Prerequisites

- **Node.js v22+** (`node --version`)
- **Docker** with Compose v2 (`docker --version`, `docker compose version`)
- **Compact compiler** (`compact --version`, `compact compile --version`)
- The **Midnight proof server** running on `localhost:6300` (the project's
  `docker compose` starts one; alternatively:
  `docker run -p 6300:6300 midnightnetwork/proof-server`)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Compile the contract (produces contracts/managed/counter/)
npm run compile

# 3a. Run against the bundled local devnet (no faucet needed)
npm run setup

# 3b. Or deploy to the Preview testnet (you must fund the printed wallet
#     address at the faucet — setup polls until funds arrive)
npm run setup -- --network preview

# 4. Interact with the deployed contract
npm run cli
```

Notes:

- The active network is sticky: `npm run network preview` switches, and any
  command run with `--network <name>` also makes that network active.
- Public-network wallets are generated on first use (24-word BIP-39 phrase,
  printed once and stored in `.midnight-state.json`, gitignored). Back it up.
- Faucets: Preview `https://midnight-tmnight-preview.nethermind.dev`,
  Preprod `https://midnight-tmnight-preprod.nethermind.dev`.
- `docker compose down -v` tears down the local devnet (containers, volumes).

## Run Tests

```bash
npm test
```

The suite exercises the compiled contract in-memory (no chain needed):

- **Circuit logic** — deterministic initial state; zero-entitlement calls
  are rejected and leave the ledger untouched.
- **State transitions** — `enterCorridor` increments `passes` by exactly 1
  and discloses the tag; passes accumulate across multiple entries.
- **Privacy** — the private `entitlement` witness never appears in the
  ledger; different entitlements produce identical public deltas, and only
  the deliberately disclosed tag is published.

Also available: `npm run test:e2e` — reconnects to the deployed contract
and reads its ledger state back from the chain.

## Initial Idea

[LEAVE PLACEHOLDER — I will fill this in manually]

## Screenshots

[LEAVE PLACEHOLDER — I will add compile output and contract address screenshots]
