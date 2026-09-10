# Corridor — Project Handoff

_Last updated: 2026-09-10_
_Hub repo: github.com/Sconce-Labs/corridor · Maintainer: Sconce Labs_

Written so **any person or AI agent can pick up cold**. Read this, then
[`ARCHITECTURE.md`](./ARCHITECTURE.md), [`COMPONENTS.md`](./COMPONENTS.md), then
[`ROADMAP.md`](./ROADMAP.md).

---

## 1. What Corridor is

A **portable proof of eligibility** for cross-border payments. KYC once with a
regulated issuer; then prove "I'm cleared for this payment corridor" to any
number of providers, revealing nothing. Hybrid by design:

- **Midnight** holds the credential (issuer writes a commitment; holder owns the
  private opening).
- A **Noir → UltraHonk** proof, generated on the holder's device, is the bridge.
- **Stellar / Soroban** runs corridor policy, verifies the proof on-chain
  (Protocol 25 primitives), burns a per-corridor nullifier, records the pass,
  and gates the payout.

---

## 2. Repo map (split 2026-09-10)

| Repo | Contents | State |
|------|----------|-------|
| **[Sconce-Labs/corridor](https://github.com/Sconce-Labs/corridor)** (this) | docs, `contracts/corridor.compact` (Midnight), `src/` (frontend, live at corridor-pink.vercel.app) | active |
| **[Sconce-Labs/corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)** | Soroban workspace; owns `ABI.md` | ✅ 14 tests + poseidon conformance, deployed to testnet |
| **[Sconce-Labs/corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)** | `corridor_eligibility` Noir circuit | ✅ compiles + 3 tests (beta.26) |
| **[Sconce-Labs/corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk)** | `@corridor/verify` TS SDK | ✅ reads + `buildWitness` real; live testnet tests |
| **[Sconce-Labs/corridor-relayer](https://github.com/Sconce-Labs/corridor-relayer)** | root-sync service | ✅ Stellar half real; Midnight reader = M5 |

All 5 repos are public on GitHub with CI. Local checkouts:
`C:/Users/samue/Documents/{corridor,corridor-contracts,corridor-circuits,corridor-sdk,corridor-relayer}`,
each on `main` tracking its remote. `gh` is available in **WSL**
(`wsl -e bash -lc '…'`), authed as `samjay8` (admin on the org).

---

## 3. The design in 60 seconds

```
Issuer ──issueCredential(commitment)──▶ Midnight (corridor.compact)
                                         credentials/revoked Merkle trees, epoch
                                              │  relayer reads roots
                                              ▼
Holder device ──Noir proof (UltraHonk)──▶ Stellar corridor_attestation.enter()
  private: secret, tier, expiry, paths      │ binds proof↔policy, verifies,
  public:  roots, corridor_id, nullifier    │ burns nullifier, records PassRecord
                                            ▼
                     Corridor operator payout ──is_cleared()?──▶ pay / deny
```

Why both chains: Midnight = confidential credential custody; Stellar = cheap
public settlement with native ZK verification. The bridge is a proof, not a
trusted message. Full rationale: `PROPOSAL.md` §"Why two networks".

---

## 4. Component status

| Component | Repo / path | State | Next |
|-----------|-------------|-------|------|
| Soroban registry + attestation + mock verifier | corridor-contracts | ✅ 14 host tests, **deployed + verified on testnet** | real verifier (M3) |
| Poseidon2 conformance (circuit ⇄ SDK ⇄ Soroban) | contracts/circuits/sdk | ✅ pinned vector matches all three | add the Midnight/Compact leg (M4) |
| Public-input ABI (`PI_*`) | corridor-contracts `crates/corridor_types` + `ABI.md` | ✅ source of truth | keep circuit + SDK in sync |
| Noir circuit | corridor-circuits | ✅ `nargo check` + 3 `nargo test` green (beta.26) | real Merkle fixtures (M2) |
| SDK `getPolicy`/`isCleared`/`passes`/`buildWitness` | corridor-sdk | ✅ real, live testnet tests | `requestProof` + `enter` clients (M6) |
| Relayer Stellar read/write | corridor-relayer | ✅ real (`currentEpoch`, `postRoot`) | `readRoots` from Midnight indexer (M5) |
| Poseidon2 cross-chain domain match | circuit ↔ host fn ↔ Compact | ❌ | conformance test (M2) — hard gate |
| Real UltraHonk verifier | corridor-contracts | ❌ | wire `indextree/ultrahonk_soroban_contract` (M3) |
| Midnight credential registry | this repo `contracts/corridor.compact` | ✅ compiles in CI | simulator tests + Preprod (M4) |
| Root-sync relayer | corridor-relayer | ❌ | M5 |
| `@corridor/verify` SDK | corridor-sdk | ⏳ skeleton | M6 |
| Frontend | this repo `src/` | ⚠️ old single-chain UI | rewrite M6 |

### Testnet deployment (Stellar)

Live. Record: `corridor-contracts/deployments/testnet.json`.

| Contract | Address |
|----------|---------|
| `corridor_registry` | `CB6LZV6TJN6YZ2O7FVLNRCJMRVBXCDG6JFFREHGY2BD5K4EYWJ6WKT2K` |
| `corridor_attestation` | `CCAGXABIZWHNLA754LSQCFPA35VLJZEH24MD5OGJNIEMFQHZ7LWQD5AR` |
| `verifier_mock` | `CDT4ZVOIAI5JN4TC3WZYIBJ3NOJENZWKD2ZNOTSVVZBZBZ5GMOSNJEQP` |

Deployer key `corridor`: `GATI44YBCQ67LZOKSE4R7C7QOKJU7F4DQBMSR4CBGC5YZ7TQRYWCJR2O`
(testnet only, in the local `stellar` CLI keystore). End-to-end verified:
`register` → `post_root` → `enter` → `is_cleared == true`; replay rejected with
`NullifierUsed` (Error #12).

---

## 5. Traps / things to know

1. **`verifier_mock` returns `true` by default.** Every happy-path test (and the
   testnet demo) trusts the mock. Real soundness starts at M3.

2. **Poseidon2 — 3 of 4 legs verified.** `poseidon2([1,2]) == 0x038682…1ed7383`
   is asserted in the circuit (`noir-lang/poseidon` v0.3.0), the SDK
   (`@zkpassport/poseidon2`), and `corridor-contracts` (`rs-soroban-poseidon`),
   and they match. **The Midnight/Compact tree hash is NOT yet checked** — M4
   must confirm it produces the same vector, or credentials issued on Midnight
   won't verify against on Stellar.

3. **The relayer is trusted in the MVP.** `post_root` is
   permissionless-but-logged. A dishonest root admits bad credentials or
   censors good ones. Hardening path: `ARCHITECTURE.md` §6, ROADMAP M5. Never
   call Corridor trustless before M5+.

4. **Nullifier state rent.** `corridor_attestation` stores one persistent entry
   per pass, TTL ~30 days. Don't let a nullifier expire while its credential is
   still valid — that permits replay. M6 needs an archival story.

5. **The old `src/` frontend is a single-chain relic** with a *faked*
   `CircuitCall` (`setTimeout` + hardcoded `42`). Don't wire anything new to
   it; it's an M6 rewrite.

6. **Auditor mode is a commitment, not encryption yet.** `auditor_blob` is a
   hiding Poseidon2 commitment. Real decryption needs in-circuit ECIES (M7).

7. **Compact contract compiles but is untested.** `contracts/corridor.compact`
   compiles clean in the hub CI ("Compiling 4 circuits"), so the `Set` /
   `MerkleTree` / `persistentHash` API is correct. Still owed (M4): simulator
   tests, a review of the issuer-auth model, Preprod deploy. On Windows use WSL
   — `which compact` there is the NTFS tool.

8. **`.midnight-state.json`** still holds plaintext Preview/Preprod seeds; it is
   gitignored (verified). Never commit or reuse for value.

9. **Windows GNU linker.** `corridor-contracts/.cargo/config.toml` adds
   `-Wl,--exclude-all-symbols` to get past `ld`'s "export ordinal too large" on
   soroban-sdk. Harmless on Linux CI. `cargo test` first build is ~6 min.

---

## 6. Cleanup still owed (in the hub repo)

- Delete `contracts/counter.compact`, `tests/counter*.ts`,
  `src/contracts/counter-contract.js`, `public/contracts/counter/`,
  `contracts/managed/`, `dist/`, `midnight-level-db/`.
- Move the Midnight deploy/CLI scripts (`src/deploy.ts` etc.) into a `midnight/`
  subdir and rename `counter` → `corridor` paths.
- Do it as its own PR after M4 (so the Compact contract is proven first).

---

## 7. Drips Wave — remaining owner action

All 5 repos are pushed with CI. What's left:

1. **List the repos on [drips.network](https://www.drips.network/wave/stellar)**
   (Stellar Wave) — at least `corridor` and `corridor-contracts`.
2. **Open the issues** from [`docs/DRIPS_ISSUES.md`](./docs/DRIPS_ISSUES.md) in
   the repo each belongs to (that file's header table maps them). The label set
   (`drips`, `milestone: M*`, `complexity: *`, `area: *`, `good first issue`)
   already exists in every repo.

---

## 8. Immediate next actions (engineering)

1. **M2 finish** — real Merkle fixtures in `corridor-circuits`: a committed
   small tree + a generator that feeds both `nargo execute` and the SDK's
   `buildWitness`, then `bb prove` / `bb verify` on it.
2. **M3 start** — vendor `indextree/ultrahonk_soroban_contract` into
   `corridor-contracts/contracts/ultrahonk_verifier` behind the `Verifier`
   interface; generate the VK from the M2 circuit; end-to-end proof → `enter`
   on testnet.
3. **M4** — `corridor.compact` simulator tests + Preprod deploy; add the
   Midnight leg to the Poseidon2 conformance table in `ABI.md`.
4. **M5** — `corridor-relayer` `IndexerMidnightReader.readRoots` against the
   Midnight indexer (needs M4).
