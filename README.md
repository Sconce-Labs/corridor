# Corridor

[![CI](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml/badge.svg)](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml)

> A portable proof of eligibility — prove you're cleared to pass a payment corridor, without revealing who you are.

## Live Demo

https://corridor-pink.vercel.app

## Contract Address

| Network  | Address                                                              |
|----------|----------------------------------------------------------------------|
| Preview  | `2883f006dcf296722ac6f0da3bf46578b4dfbbc2bebf915a0fb4e302d8a89a12`  |
| Preprod  | *(deploy in progress — paste address here once deployed)*             |

## What This Does

Corridor is a privacy-preserving dApp built on the Midnight Network. It lets
someone prove they hold a valid eligibility credential for a payment corridor
(zero-knowledge proof) **without revealing their identity or credential
details**.

**How it works:**

1. **Connect** your Lace wallet to the dApp.
2. **Enter the corridor** by calling the `enterCorridor` circuit with a
   private entitlement value and a public entry tag.
3. The circuit generates a **zero-knowledge proof locally in your browser**
   — your private input never leaves your device.
4. The proof is verified and submitted on-chain. An observer sees only that a
   pass was granted and which tag was disclosed, never *who* was granted or
   *what* their entitlement was.

**The privacy model in action:**

- A migrant worker proves they hold a valid KYC credential — the corridor
  accepts the proof without learning their name, passport number, or
  entitlement level.
- An aid recipient proves eligibility for a disbursement — the system gates
  access without holding any identity documents.

## Privacy Model

- **What is PUBLIC (on-chain, visible to anyone):**
  - `passes` — the aggregate number of corridor passes granted.
  - `lastEntryTag` — the entry tag the caller deliberately disclosed (e.g.
    `"tier-2-pass"`, `"aid-disbursement"`).

- **What is PRIVATE (never on-chain):**
  - `entitlement` — the caller's private entitlement value (0–1000), held
    only in the wallet. The circuit checks it is non-zero but never writes
    it to the ledger.

- **What the user PROVES without revealing:**
  - That they hold a non-zero entitlement to pass — without revealing the
    entitlement's value, their identity, or any other personal data.

## Privacy Claim

**On-chain observer sees:** that *someone* entered the corridor and which
entry tag was disclosed (e.g. `"tier-2-pass"`). The aggregate pass count
increments by 1.

**On-chain observer CANNOT see:** the caller's identity, wallet address
(the proof is shielded), entitlement value, or any personal data. The
zero-knowledge proof is generated locally in the browser wallet — the
entitlement never leaves the user's device.

## Tech Stack

- **Midnight Network** — privacy-preserving blockchain for zero-knowledge
  smart contracts
- **Compact Language** — zero-knowledge circuit compiler for Midnight
  contracts
- **Midnight.js SDK** — TypeScript SDK for wallet connection, proof
  generation, and contract interaction
- **DApp Connector API** — browser extension wallet integration (Lace)
- **React + Vite** — frontend framework and build tool
- **TypeScript** — type-safe development across contract and frontend

## Prerequisites

- [Lace wallet](https://lace.io) browser extension (Midnight wallet)
- Node.js v22+ (`node --version`)
- Midnight testnet tokens (tNIGHT) from the Preprod faucet

## Setup & Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/Sconce-Labs/corridor.git
cd corridor

# 2. Install dependencies
npm install

# 3. Compile the contract (requires Compact compiler)
npm run compile

# 4. Deploy to Preprod (or use an existing deployment)
#    You'll need tNIGHT from the Preprod faucet:
#    https://midnight-tmnight-preprod.nethermind.dev
npm run deploy -- --network preprod

# 5. Start the frontend dev server
npm run dev:frontend

# 6. Open http://localhost:5173 in your browser with Lace wallet installed
```

**Environment variables:**

Copy `.env.example` to `.env` and set your deployed contract address:

```bash
cp .env.example .env
# Edit .env and set VITE_CONTRACT_ADDRESS to your deployed address
```

## Run Tests

```bash
npm test
```

## CI/CD

The project uses GitHub Actions for continuous integration. The pipeline runs
on every push to `main` and on pull requests:

1. **Checkout** — pulls the latest code
2. **Install dependencies** — `npm install`
3. **Install Compact compiler** — via the official `setup-compact-action`
4. **Compile contract** — `compact compile` verifies the contract builds
5. **Run tests** — all 8+ unit tests must pass

If any step fails, the pipeline breaks and a red badge appears in the README.
See the workflow at `.github/workflows/ci.yml`.

## Product Proposal

See [PROPOSAL.md](./PROPOSAL.md) for the product proposal.

## Demo Video

[Demo Video — wallet connect + circuit call](https://drive.google.com/file/d/1r3sODDlYRIyHeKZhMAHLJtjTa906lw-f/view?usp=drive_link)

## Screenshots

* [Deployed Address](https://github.com/user-attachments/assets/6b9c99f6-9aaf-425f-a535-820378843df3)
* [Compile Output](https://github.com/user-attachments/assets/166e817b-c14c-41f0-ada4-30d2d99382d5)
* [Test Output — 8 tests passing](https://github.com/user-attachments/assets/d1c974cd-7c98-480e-86fc-6c6ba29a40c0)
