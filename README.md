<div align="center">

<img src="assets/logo.svg" alt="Corridor" width="96" />

# Corridor

**Portable, zero-knowledge proof of eligibility for cross-border payments.**

Do KYC once with a regulated issuer. Then prove you're cleared to any payment
corridor — without re-uploading documents and without revealing who you are.

[![CI](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml/badge.svg)](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml)
[![Stellar testnet](https://img.shields.io/badge/Stellar-testnet-brightgreen)](https://github.com/Sconce-Labs/corridor-contracts/blob/main/deployments/testnet.json)
[![Drips Wave](https://img.shields.io/badge/Stellar-Drips%20Wave-7B61FF)](https://www.drips.network/wave/stellar)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

[**Live demo →**](https://corridor-pink.vercel.app) &nbsp;·&nbsp;
[Architecture](./ARCHITECTURE.md) ·
[Proposal](./PROPOSAL.md) ·
[Roadmap](./ROADMAP.md) ·
[Handoff](./HANDOFF.md) ·
[Audit](./AUDIT.md)

</div>

---

## The problem

Every remittance provider, anchor, wallet, and aid program runs its own KYC. The
same passport scan and liveness selfie, uploaded again and again — each provider
a new custodian of identity data, each a target. The person has no reusable
proof that they already passed.

## What Corridor does

A person completes KYC/AML **once** with a regulated issuer and receives a
signed credential. From then on they prove *"I am cleared to use this payment
corridor"* to any number of providers with a **zero-knowledge proof** — no
documents, no identity, nothing linkable across providers.

```
┌─ Issuer (off-chain, once) ─────────────┐   ┌─ Holder's device ──────────────┐   ┌─ Stellar / Soroban ───────────────┐
│ runs KYC, then SIGNS a short-lived     │   │ Noir → UltraHonk proof of:     │   │ corridor_attestation.enter():     │
│ statement with a Grumpkin key:         │──▶│  "I hold a valid issuer        │──▶│  binds proof ↔ policy, verifies,  │
│  { holder_binding, tier, expiry, epoch}│   │   signature meeting this       │   │  burns a per-corridor nullifier,  │
│                                        │   │   corridor's policy"           │   │  records a PassRecord             │
└────────────────────────────────────────┘   └────────────────────────────────┘   └───────────────┬───────────────────┘
                                                                                                  │
   Midnight (corridor.compact): a public issuer registry — who the             operator's payout ── is_cleared()? ──▶ pay
   licensed issuers are + each issuer's current credential epoch.
```

Corridor is **Stellar-native**. The Midnight contract is a plain public issuer
directory — no shared state, no cross-chain bridge to trust. Revocation is short
`expiry` plus a monotonic `min_cred_epoch` floor. See
[`docs/CREDENTIAL_ACCUMULATOR.md`](./docs/CREDENTIAL_ACCUMULATOR.md) for why the
earlier shared-Merkle-root design was dropped (BLS12-381 vs BN254 — the roots
were values in different fields).

## Who sees what

| | Sees |
|---|---|
| **A Stellar observer** | a pass was granted on corridor C, a tag, an aggregate counter, a burned nullifier — via a fee-sponsoring relayer, so *not* the holder's account |
| **A Midnight observer** | the set of licensed issuers and each issuer's current credential epoch — nothing per-credential, nothing per-holder |
| **A warranted auditor** (target — M7) | only `{tier, issuer}` for the specific passes in their warrant. *Today the auditor blob is a commitment with no opening path — this capability is not yet functional (audit R2-M5).* |
| **Nobody, on either chain** | the holder's identity, documents, tier, expiry, the issuer↔holder link, or their activity across corridors |

---

## Repositories

| Repo | Contents | CI |
|------|----------|----|
| **corridor** (this) | Hub — docs, the Midnight issuer-registry contract (`contracts/`), the web app (`web/`) | [![CI](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml/badge.svg)](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml) |
| **[corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)** | Soroban contracts (Rust) — policy registry, attestation, verifier. **Owns [`ABI.md`](https://github.com/Sconce-Labs/corridor-contracts/blob/main/ABI.md).** Live on testnet. | [![CI](https://github.com/Sconce-Labs/corridor-contracts/actions/workflows/ci.yml/badge.svg)](https://github.com/Sconce-Labs/corridor-contracts/actions/workflows/ci.yml) |
| **[corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)** | The Noir `corridor_eligibility` circuit — Grumpkin Schnorr, 73 ACIR opcodes | [![CI](https://github.com/Sconce-Labs/corridor-circuits/actions/workflows/ci.yml/badge.svg)](https://github.com/Sconce-Labs/corridor-circuits/actions/workflows/ci.yml) |
| **[corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk)** | `@corridor/verify` — TypeScript SDK for all three roles (issuer, holder, operator) | [![CI](https://github.com/Sconce-Labs/corridor-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Sconce-Labs/corridor-sdk/actions/workflows/ci.yml) |
| ~~corridor-relayer~~ | Archived — the earlier design's root-sync service, removed under Option B | — |

Full breakdown in [`COMPONENTS.md`](./COMPONENTS.md).

## Where it stands

**Pre-MVP research build**, participating in the
**[Stellar Drips Wave](https://www.drips.network/wave/stellar)**.

| Layer | State |
|-------|-------|
| Soroban `corridor_registry` + `corridor_attestation` + `verifier_mock` | ✅ 30 host tests; **deployed + smoke-verified on Stellar testnet (Option B ABI)** |
| Noir `corridor_eligibility` circuit | ✅ 20 tests, real Grumpkin Schnorr verification, `nargo execute` on a signed fixture (Noir 1.0.0-beta.26) |
| `@corridor/verify` SDK | ✅ 25 tests — Soroban reads, `buildWitness`, `verifyWitnessLocally`, 3-step issuance, Grumpkin signer |
| Poseidon2 + Schnorr conformance (circuit ⇄ SDK ⇄ Soroban) | ✅ pinned vectors match; `nargo execute` on the SDK-signed fixture is the end-to-end check |
| Web app (`web/`) | ✅ public site + live testnet reads + operator clearance checker → [corridor-pink.vercel.app](https://corridor-pink.vercel.app) |
| Real on-chain UltraHonk verifier | ⏳ **M3** — a mock stands in |
| Midnight `corridor.compact` issuer registry | ✅ compiles in CI (6 circuits); ⏳ simulator tests + Preprod deploy (M4) |
| Fee-sponsoring tx-relayer + holder/operator flows | ⏳ **M6** — [`docs/TX_RELAYER.md`](./docs/TX_RELAYER.md) |

### Deployed addresses (Stellar testnet, Option B ABI)

Record: [`corridor-contracts/deployments/testnet.json`](https://github.com/Sconce-Labs/corridor-contracts/blob/main/deployments/testnet.json)

| Contract | Address |
|----------|---------|
| `corridor_registry` | [`CDGMQ24E…XJ6`](https://stellar.expert/explorer/testnet/contract/CDGMQ24E6OIBZB3EKJN5TUA5POYE6D5FNBL2II6SRLTYF32TE4HIEXJ6) |
| `corridor_attestation` | [`CCHWKVRC…L4K`](https://stellar.expert/explorer/testnet/contract/CCHWKVRCEKPJHEXREP5SCZ4TEKNBFYEFYA2VR3SET5AMG4WOC76LDL4K) |
| `verifier_mock` (M3 placeholder) | [`CBN7N7AT…K46Y`](https://stellar.expert/explorer/testnet/contract/CBN7N7AT7CPAA7MBIAULEBY3GIV7NNB3XPNEUJSIAHFIM5BJ7GIGK46Y) |

---

## Repository layout

```
corridor/
├── ARCHITECTURE.md  PROPOSAL.md  ROADMAP.md  HANDOFF.md  AUDIT.md  COMPONENTS.md  DRIPS.md
├── docs/            USAGE · CREDENTIAL_ACCUMULATOR (the Option B decision) · TX_RELAYER · DRIPS_ISSUES
├── contracts/
│   └── corridor.compact           Midnight issuer registry (Compact)
├── web/                           the public site + operator clearance checker (Vite + React → Vercel)
├── midnight/                      Midnight wallet + deploy tooling (predates Option B — being trimmed)
├── assets/                        brand — logo.svg, PNGs, favicon
└── vercel.json                    builds web/ on push to main
```

## Quickstart

```bash
# Web app (this repo)
cd web && npm install && npm run dev        # → http://localhost:5173

# Midnight issuer registry (needs the Compact compiler, toolchain ≥ 0.34)
compact compile contracts/corridor.compact contracts/managed/corridor

# Stellar contracts
git clone https://github.com/Sconce-Labs/corridor-contracts.git
cd corridor-contracts && cargo test --workspace && cd ..

# Noir circuit (needs noirup)
git clone https://github.com/Sconce-Labs/corridor-circuits.git
cd corridor-circuits/corridor_eligibility && nargo test && nargo execute
```

## Continuous integration

This repo — [`.github/workflows/ci.yml`](./.github/workflows/ci.yml), every push
and PR to `main`:

| Job | What it does |
|-----|--------------|
| **`web build`** | `npm ci` · `npm run typecheck` · `npm run build` in `web/` |
| **`Midnight / Compact`** | `compact compile contracts/corridor.compact` |
| **`Doc links`** | every relative Markdown link resolves |

`main` is protected on `Midnight / Compact` + `Doc links`. Each sibling repo has
its own CI (see the badges above and each repo's README). **A public-input ABI
change is a coordinated PR across `corridor-contracts` + `corridor-circuits` +
`corridor-sdk`.**

### Deploying the web app

`vercel.json` at the repo root builds `web/` and every push to `main`
auto-deploys to [corridor-pink.vercel.app](https://corridor-pink.vercel.app).
After a contract redeploy, update `web/src/config.ts` **and**
`corridor-sdk/src/networks.ts`.

---

## Origin & participation

Corridor started on **[Rise In](https://www.risein.com/)** (the "New Moon to
Full" Midnight Builder Challenge) as a single-chain credential circuit, then was
re-scoped as a **Stellar-native** privacy payments product. It now participates
in the **[Stellar Drips Wave](https://www.drips.network/wave/stellar)** —
contributors earn from an SDF-funded pool by closing `drips`-labelled issues
with merged PRs. See [`DRIPS.md`](./DRIPS.md) and
[`docs/DRIPS_ISSUES.md`](./docs/DRIPS_ISSUES.md).

## Tech stack

Stellar · Soroban (Rust, `soroban-sdk` 25) · Protocol 25 (BN254, Poseidon2) ·
Noir · UltraHonk · Grumpkin Schnorr · Midnight / Compact · TypeScript · React +
Vite

## License

[Apache-2.0](./LICENSE)

<div align="center"><sub>Built with love for Stellar.</sub></div>
