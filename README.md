# Corridor

> A portable proof of eligibility — this Level 1 contract is a privacy-preserving "corridor passes" counter: callers prove a private entitlement and disclose only an entry tag, while the aggregate pass count stays public on the Midnight ledger.

## Contract Address

| Network  | Address                                                                                  |
|----------|------------------------------------------------------------------------------------------|
| Preview  | `2883f006dcf296722ac6f0da3bf46578b4dfbbc2bebf915a0fb4e302d8a89a12`                       |
| Preprod  | *(not deployed)*                                                                          |

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

**Corridor** — a portable proof of eligibility that lets someone move through a
payment corridor showing only that they're cleared to pass, never who they are.

Today, a migrant worker or aid recipient gets onboarded the same way at every
service they use: passport scan, liveness selfie, wait — then their sensitive
documents sit in a second, third, fourth company's database, with no say in
any of it. Regulators need verification, but proving you're eligible and
revealing your entire identity have been treated as the same act. They don't
need to be.

Corridor separates the two:

1. A regulated issuer (bank, licensed KYC provider, NGO) verifies someone
   **once** and issues a credential onto **Midnight**, a privacy-preserving
   network built for exactly this kind of confidential logic.
2. When that person wants to use a Stellar-based service (remittance
   corridor, aid disbursement, lending pool), they generate a
   **zero-knowledge proof** of only the claim that service needs — *"I hold a
   valid KYC Tier 2 credential"* — bound to that specific context so it can't
   be replayed or linked across services.
3. A relayer verifies the proof and posts a minimal attestation to a Soroban
   contract, which gates the action (raises a limit, releases funds, approves
   a borrow) without ever learning who the person is.

The identity work happens on Midnight, because that's what it's built for. The
money moves on Stellar, because that's what it's built for. Neither chain is
asked to do the other's job.

**Level 1 is the seed of this vision, scoped tightly**: one issuer, one claim,
one consuming contract. The counter contract proves *"I hold a non-zero
entitlement"* without revealing the entitlement — the same shape as proving
*"I'm cleared to pass"* without revealing who you are. The relayer that will
carry a Midnight proof into a Soroban attestation is a later, explicitly
labeled trust assumption — not solved in this level.

## Screenshots

[Deployed Address](<img width="1531" height="672" alt="image" src="https://github.com/user-attachments/assets/6b9c99f6-9aaf-425f-a535-820378843df3" />)
[Compile Output](<img width="801" height="151" alt="image" src="https://github.com/user-attachments/assets/166e817b-c14c-41f0-ada4-30d2d99382d5" />)



