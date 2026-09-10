# Corridor

[![CI](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml/badge.svg)](https://github.com/Sconce-Labs/corridor/actions/workflows/ci.yml)

> Portable proof of eligibility for cross-border payments. Do KYC once with a
> regulated issuer; prove you're cleared to any payment corridor — without
> re-uploading documents and without revealing who you are.

Corridor spans **two networks by design**:

- **Midnight** holds the credential. A regulated issuer records a commitment;
  the holder keeps the attributes in their own confidential state.
- **Stellar / Soroban** runs the corridors. Operators register a policy, the
  holder's zero-knowledge proof is verified on-chain (Protocol 25 primitives),
  a pass is attested, and payouts are gated on it.

A **Noir → UltraHonk** proof, generated on the holder's device, is the bridge.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design and
[`PROPOSAL.md`](./PROPOSAL.md) for the pitch.

## Origin & participation

Corridor started as a project on **[Rise In](https://www.risein.com/)** — the
"New Moon to Full" Midnight Builder Challenge — where the single-chain
credential circuit and first frontend were built. It has since been re-scoped
as a hybrid **Midnight + Stellar** product and will **participate in the
[Stellar Drips Wave](https://www.drips.network/wave/stellar)**, where
contributors earn from an SDF-funded pool by closing issues with merged PRs.
See [`DRIPS.md`](./DRIPS.md).

## Status

Pre-MVP, mid-port from a single-chain prototype. See [`ROADMAP.md`](./ROADMAP.md)
and [`HANDOFF.md`](./HANDOFF.md).

| Component | State |
|-----------|-------|
| Soroban `corridor_registry` + `corridor_attestation` + `verifier_mock` | ✅ implemented, 14 host tests, **deployed + verified end-to-end on testnet** |
| Noir `corridor_eligibility` circuit | ✅ written, ⏳ not yet proven end-to-end (`circuits/`) |
| Real UltraHonk Soroban verifier | ❌ M3 — mock in place |
| Midnight `corridor.compact` credential registry | ✅ written, ⏳ needs `compact compile` verification (`contracts/`) |
| Root-sync relayer | ❌ M5 |
| `@corridor/verify` SDK + frontend rewrite | ❌ M6 |

### Contract addresses

| Network | Contract | Address |
|---------|----------|---------|
| Stellar Testnet | `corridor_registry` | `CB6LZV6TJN6YZ2O7FVLNRCJMRVBXCDG6JFFREHGY2BD5K4EYWJ6WKT2K` |
| Stellar Testnet | `corridor_attestation` | `CCAGXABIZWHNLA754LSQCFPA35VLJZEH24MD5OGJNIEMFQHZ7LWQD5AR` |
| Stellar Testnet | `verifier_mock` (placeholder — M3) | `CDT4ZVOIAI5JN4TC3WZYIBJ3NOJENZWKD2ZNOTSVVZBZBZ5GMOSNJEQP` |
| Midnight Preview | `corridor.compact` (legacy `counter`) | `2883f006dcf296722ac6f0da3bf46578b4dfbbc2bebf915a0fb4e302d8a89a12` |

Full deployment record + smoke-test tx hashes: [`stellar/deployments/testnet.json`](./stellar/deployments/testnet.json).
End-to-end verified on testnet: `register` → `post_root` → `enter` → `is_cleared == true`, replay rejected.

## Repository layout

```
contracts/   Midnight credential registry (Compact)
circuits/    Noir eligibility circuit
stellar/     Soroban workspace (Rust): registry, attestation, mock verifier
src/         React frontend (holder + operator UIs — mid-rewrite)
docs/        usage + design notes
```

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
git clone https://github.com/Sconce-Labs/corridor.git
cd corridor

# Stellar contracts
cd stellar && cargo test --workspace && cd ..

# Noir circuit  (needs noirup + bbup)
cd circuits/corridor_eligibility && nargo test && cd ../..

# Midnight contract  (needs the Compact compiler)
compact compile contracts/corridor.compact contracts/managed/corridor
```

Per-layer detail: [`stellar/README.md`](./stellar/README.md),
[`circuits/README.md`](./circuits/README.md).

## Contributing / Drips Wave

Corridor is built to be worked on in the open. See [`DRIPS.md`](./DRIPS.md) for
the issue map and how contributions are rewarded through the Stellar Drips Wave.

## Tech stack

Midnight · Compact · Noir · UltraHonk · Stellar · Soroban (Rust, `soroban-sdk`
25) · Protocol 25 (BN254, Poseidon2) · React + Vite · TypeScript

## License

Apache-2.0
