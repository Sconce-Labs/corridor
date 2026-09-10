<img src="assets/logo.svg" alt="Corridor" width="96" align="left" />

# Corridor

[![CI](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml/badge.svg)](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml)

<br clear="left" />


> Portable proof of eligibility for cross-border payments. Do KYC once with a
> regulated issuer; prove you're cleared to any payment corridor — without
> re-uploading documents and without revealing who you are.

Corridor is **Stellar-native, with an optional Midnight issuer layer**:

- A regulated **issuer** runs KYC once, then signs a short-lived statement
  `{ holder_binding, tier, expiry, cred_epoch }` with a **Grumpkin** key. The
  holder stores that signature; the issuer never sees the holder's secret.
- **Stellar / Soroban** runs the corridors. Operators register a policy
  (accepted issuers, minimum tier, revocation floor), the holder's
  zero-knowledge proof is verified on-chain (Protocol 25 primitives — the real
  verifier is milestone M3; a mock stands in today), a per-corridor nullifier
  is burned, a pass is attested, and payouts are gated on it.
- **Midnight** (`corridor.compact`) is a public, auditable **issuer registry**:
  who the licensed issuers are and each issuer's current credential epoch. It
  holds no holder data.

A **Noir → UltraHonk** proof, generated on the holder's device, proves
knowledge of the issuer's signature plus every policy predicate — revealing
nothing else. This is the **Option B** design; see
[`docs/CREDENTIAL_ACCUMULATOR.md`](./docs/CREDENTIAL_ACCUMULATOR.md) for why the
earlier shared-Merkle-root design was dropped.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design and
[`PROPOSAL.md`](./PROPOSAL.md) for the pitch. Corridor is split across repos —
see [`COMPONENTS.md`](./COMPONENTS.md). This repo is the hub (docs + the
Midnight issuer-registry contract).

## Origin & participation

Corridor started as a project on **[Rise In](https://www.risein.com/)** — the
"New Moon to Full" Midnight Builder Challenge — where the single-chain
credential circuit and first frontend were built. It has since been re-scoped
as a **Stellar-native** privacy payments product (with an optional Midnight
issuer registry) and will **participate in the
[Stellar Drips Wave](https://www.drips.network/wave/stellar)**, where
contributors earn from an SDF-funded pool by closing issues with merged PRs.
See [`DRIPS.md`](./DRIPS.md).

## Status

**Pre-MVP research build.** What's real: the attestation contracts are deployed
to Stellar testnet and the `register → enter → is_cleared` flow executes
on-chain with the policy binding (issuer allowlist, tier, revocation floor,
time-skew, auditor key, nullifier uniqueness) enforced; the Noir circuit does a
real Grumpkin Schnorr verification (73 ACIR opcodes) and its BN254 hashing is
conformance-checked against the SDK and Soroban; the SDK signer matches the
circuit's verifier against a pinned vector.

What's *not* yet real: on-chain **ZK verification** (mocked — M3), the
fee-sponsoring **tx-relayer** (M6), and a **frontend** for the current design
(M6). The **Option B redesign** (2026-09-10) resolved the two critical design
holes the audit found — revocation and the cross-chain field mismatch — by
dropping the accumulator entirely for issuer-signed statements. The on-testnet
deployment predates Option B and needs a redeploy (M2).

See [`AUDIT.md`](./AUDIT.md), [`ROADMAP.md`](./ROADMAP.md),
[`HANDOFF.md`](./HANDOFF.md), [`COMPONENTS.md`](./COMPONENTS.md).

| Component | Repo | State |
|-----------|------|-------|
| Soroban `corridor_registry` + `corridor_attestation` + `verifier_mock` | [corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts) | ✅ 25 host tests green (Option B); ⏳ testnet redeploy pending (M2) |
| Poseidon2 hash conformance (circuit ⇄ SDK ⇄ Soroban) | contracts / circuits / sdk | ✅ pinned vector matches across all three |
| Noir `corridor_eligibility` circuit | [corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits) | ✅ 18 tests, real Grumpkin Schnorr verify + signed fixture, `nargo execute` solves it (Noir 1.0.0-beta.26) |
| `@corridor/verify` SDK | [corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk) | ✅ `getPolicy` / `isCleared` / `passes` / `buildWitness` / `issueCredential` / Grumpkin signer real (23 tests, live testnet reads); prover + relayer clients pending |
| Real UltraHonk Soroban verifier | corridor-contracts | ❌ M3 — mock in place |
| Midnight `corridor.compact` issuer registry | this repo (`contracts/`) | ✅ compiles in CI (6 circuits, Option B); ⏳ simulator tests + Preprod deploy (M4) |
| Fee-sponsoring tx-relayer | — (`docs/TX_RELAYER.md`) | ❌ M6 — specced, not built |
| Frontend | this repo — [corridor-pink.vercel.app](https://corridor-pink.vercel.app) | ❌ stale single-chain scaffold — M6 |

### Contract addresses

| Network | Contract | Address |
|---------|----------|---------|
| Stellar Testnet | `corridor_registry` | `CB6LZV6TJN6YZ2O7FVLNRCJMRVBXCDG6JFFREHGY2BD5K4EYWJ6WKT2K` |
| Stellar Testnet | `corridor_attestation` | `CCAGXABIZWHNLA754LSQCFPA35VLJZEH24MD5OGJNIEMFQHZ7LWQD5AR` |
| Stellar Testnet | `verifier_mock` (placeholder — M3) | `CDT4ZVOIAI5JN4TC3WZYIBJ3NOJENZWKD2ZNOTSVVZBZBZ5GMOSNJEQP` |
| Midnight Preview | `corridor.compact` | not yet deployed for Option B (M4) |

> The Stellar addresses above ran the pre-Option-B ABI. A redeploy against the
> issuer-signed-statement contracts is **M2**; the deployment record
> ([`corridor-contracts/deployments/testnet.json`](https://github.com/Sconce-Labs/corridor-contracts/blob/main/deployments/testnet.json))
> will be refreshed then. The earlier run verified `register → post_root →
> enter → is_cleared == true` with replay rejected; `post_root` no longer
> exists under Option B.

## Repository layout

This hub repo:

```
contracts/   Midnight issuer registry (Compact)
midnight/    Midnight wallet + deploy tooling (predates Option B — being trimmed)
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
tx-relayer (M6) so the holder's Stellar account is not linked.

**A Midnight observer sees:** the set of licensed issuers and each issuer's
current credential epoch. Nothing per-credential, nothing per-holder.

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

# Noir circuit  (needs noirup)
git clone https://github.com/Sconce-Labs/corridor-circuits.git
cd corridor-circuits/corridor_eligibility && nargo test && nargo execute
```

## Contributing / Drips Wave

Corridor is built to be worked on in the open. See [`DRIPS.md`](./DRIPS.md) for
the issue map and how contributions are rewarded through the Stellar Drips Wave.

## Tech stack

Stellar · Soroban (Rust, `soroban-sdk` 25) · Protocol 25 (BN254, Poseidon2) ·
Noir · UltraHonk · Grumpkin Schnorr · Midnight · Compact · TypeScript

## License

Apache-2.0
