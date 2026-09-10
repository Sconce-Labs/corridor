<img src="assets/logo.svg" alt="Corridor" width="96" align="left" />

# Corridor

[![CI](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml/badge.svg)](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml)

<br clear="left" />


> Portable proof of eligibility for cross-border payments. Do KYC once with a
> regulated issuer; prove you're cleared to any payment corridor — without
> re-uploading documents and without revealing who you are.

Corridor spans **two networks by design**:

- **Midnight** holds the credential. A regulated issuer records a commitment;
  the holder keeps the attributes in their own confidential state.
- **Stellar / Soroban** runs the corridors. Operators register a policy, the
  holder's zero-knowledge proof is verified on-chain (Protocol 25 primitives —
  the real verifier is milestone M3; a mock stands in today), a pass is
  attested, and payouts are gated on it.

A **Noir → UltraHonk** proof, generated on the holder's device, is the bridge.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design and
[`PROPOSAL.md`](./PROPOSAL.md) for the pitch. Corridor is split across repos —
see [`COMPONENTS.md`](./COMPONENTS.md). This repo is the hub (docs + the
Midnight contract + the frontend).

## Origin & participation

Corridor started as a project on **[Rise In](https://www.risein.com/)** — the
"New Moon to Full" Midnight Builder Challenge — where the single-chain
credential circuit and first frontend were built. It has since been re-scoped
as a hybrid **Midnight + Stellar** product and will **participate in the
[Stellar Drips Wave](https://www.drips.network/wave/stellar)**, where
contributors earn from an SDF-funded pool by closing issues with merged PRs.
See [`DRIPS.md`](./DRIPS.md).

## Status

**Pre-MVP research build.** What's real: the attestation contracts are deployed
to Stellar testnet and the `register → post_root → enter → is_cleared` flow
executes on-chain, with the policy binding (roots, tier, issuer allowlist,
time-skew, nullifier uniqueness) enforced. What's *not* yet real: ZK
verification (mocked — M3), a working revocation accumulator (the current
approach is unsound — see [`docs/CREDENTIAL_ACCUMULATOR.md`](./docs/CREDENTIAL_ACCUMULATOR.md)),
and the Midnight↔Stellar bridge (the two chains use incompatible fields — same
doc). The circuit compiles and its BN254 hashing is conformance-checked against
the SDK and Soroban.

See [`AUDIT.md`](./AUDIT.md), [`ROADMAP.md`](./ROADMAP.md),
[`HANDOFF.md`](./HANDOFF.md), [`COMPONENTS.md`](./COMPONENTS.md).

| Component | Repo | State |
|-----------|------|-------|
| Soroban `corridor_registry` + `corridor_attestation` + `verifier_mock` | [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts) | ✅ 14 host tests, **deployed + verified end-to-end on testnet** |
| Poseidon2 hash conformance (circuit ⇄ SDK ⇄ Soroban) | contracts / circuits / sdk | ✅ pinned vector matches across all three |
| Noir `corridor_eligibility` circuit | [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits) | ✅ compiles + 3 tests (Noir 1.0.0-beta.26); ⏳ real Merkle fixtures pending |
| `@corridor/verify` SDK | [corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk) | ✅ `getPolicy` / `isCleared` / `passes` / `buildWitness` real (live testnet tests); prover + relayer clients pending |
| Root-sync relayer | [corridor-relayer](https://github.com/Sconce-Labs/corridor-relayer) | ✅ Stellar read/write real; Midnight reader pending (M5) |
| Real UltraHonk Soroban verifier | corridor-contracts | ❌ M3 — mock in place |
| Midnight `corridor.compact` credential registry | this repo (`contracts/`) | ✅ compiles in CI; ⏳ simulator tests + Preprod deploy (M4) |
| Frontend rewrite | this repo (`src/`) — [live: corridor-pink.vercel.app](https://corridor-pink.vercel.app) | ❌ still the single-chain UI — M6 |

### Contract addresses

| Network | Contract | Address |
|---------|----------|---------|
| Stellar Testnet | `corridor_registry` | `CB6LZV6TJN6YZ2O7FVLNRCJMRVBXCDG6JFFREHGY2BD5K4EYWJ6WKT2K` |
| Stellar Testnet | `corridor_attestation` | `CCAGXABIZWHNLA754LSQCFPA35VLJZEH24MD5OGJNIEMFQHZ7LWQD5AR` |
| Stellar Testnet | `verifier_mock` (placeholder — M3) | `CDT4ZVOIAI5JN4TC3WZYIBJ3NOJENZWKD2ZNOTSVVZBZBZ5GMOSNJEQP` |
| Midnight Preview | `corridor.compact` (legacy `counter`) | `2883f006dcf296722ac6f0da3bf46578b4dfbbc2bebf915a0fb4e302d8a89a12` |

Full deployment record + smoke-test tx hashes:
[`corridor-contracts/deployments/testnet.json`](https://github.com/Sconce-Labs/corridor-contracts/blob/main/deployments/testnet.json).
End-to-end verified on testnet: `register` → `post_root` → `enter` → `is_cleared == true`, replay rejected.

## Repository layout

This hub repo:

```
contracts/   Midnight credential registry (Compact)
src/         React frontend (holder + operator UIs — mid-rewrite)
docs/        usage + design notes
*.md         architecture, proposal, roadmap, handoff, drips
```

Other repos: [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)
(Soroban) · [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)
(Noir) · [corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk) (TS). See
[`COMPONENTS.md`](./COMPONENTS.md).

## Privacy model

**A Stellar observer sees:** a pass was granted on corridor C, a tag index, an
aggregate counter, a burned nullifier. Proofs are submitted via a fee-sponsored
relayer so the holder's Stellar account is not linked.

**A Midnight observer sees:** issuer X recorded (or revoked) *a* credential at
epoch N.

**Nobody sees, on either chain:** the holder's identity, documents, tier,
expiry, the issuer↔holder link, or the holder's activity across corridors
(nullifiers are per-corridor and mutually unlinkable).

**A warranted auditor sees:** only the `{tier, issuer}` for the specific passes
they hold a warrant for.

## Quickstart

```bash
# This repo — Midnight contract (needs the Compact compiler)
git clone https://github.com/Sconce-Labs/corridor.git && cd corridor
compact compile contracts/corridor.compact contracts/managed/corridor

# Stellar contracts
git clone https://github.com/Sconce-Labs/corridor-contracts.git
cd corridor-contracts && cargo test --workspace && cd ..

# Noir circuit  (needs noirup + bbup)
git clone https://github.com/Sconce-Labs/corridor-circuits.git
cd corridor-circuits/corridor_eligibility && nargo test
```

## Contributing / Drips Wave

Corridor is built to be worked on in the open. See [`DRIPS.md`](./DRIPS.md) for
the issue map and how contributions are rewarded through the Stellar Drips Wave.

## Tech stack

Midnight · Compact · Noir · UltraHonk · Stellar · Soroban (Rust, `soroban-sdk`
25) · Protocol 25 (BN254, Poseidon2) · React + Vite · TypeScript

## License

Apache-2.0
