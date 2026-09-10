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
| **Sconce-Labs/corridor** (this) | docs, `contracts/corridor.compact` (Midnight), `src/` (frontend) | active |
| **Sconce-Labs/corridor-contracts** | Soroban workspace; owns `ABI.md` | ✅ 14 tests, deployed to testnet |
| **Sconce-Labs/corridor-circuits** | `corridor_eligibility` Noir circuit | written, unproven |
| **Sconce-Labs/corridor-sdk** | `@corridor/verify` TS SDK | skeleton |
| Sconce-Labs/corridor-relayer | root-sync service | not created (M5) |

Local checkouts on the original dev box: `C:/Users/samue/Documents/{corridor,
corridor-contracts, corridor-circuits, corridor-sdk}`. **None have a git
remote yet** — the owner must create the four GitHub repos under `Sconce-Labs`
and `git push` (see §7).

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
| Public-input ABI (`PI_*`) | corridor-contracts `crates/corridor_types` + `ABI.md` | ✅ source of truth | keep circuit + SDK in sync |
| Noir circuit | corridor-circuits | ✅ written, ⏳ unproven | fixtures + `nargo`/`bb` (M2) |
| Poseidon2 cross-chain domain match | circuit ↔ host fn ↔ Compact | ❌ | conformance test (M2) — hard gate |
| Real UltraHonk verifier | corridor-contracts | ❌ | wire `indextree/ultrahonk_soroban_contract` (M3) |
| Midnight credential registry | this repo `contracts/corridor.compact` | ✅ written, ⏳ uncompiled | `compact compile` + Preprod (M4) |
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

2. **Poseidon2 must match across chains.** The Noir `poseidon` dep in
   `corridor-circuits/corridor_eligibility/Nargo.toml` has a placeholder `tag`.
   If its params differ from Soroban's `poseidon2_permutation` (and the Compact
   tree hashing), the Merkle roots computed on Midnight, in the circuit, and
   checked on Stellar will silently disagree. Correctness gate before M3.

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

7. **Compact contract is unverified.** `contracts/corridor.compact` was written
   without the `compact` compiler on the box (`which compact` = the Windows NTFS
   tool). The `Set` / `MerkleTree` API must be checked against
   CompactStandardLibrary — CI job is `continue-on-error` until M4.

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

## 7. Push checklist (owner action — no remotes exist yet)

For each of the four local repos:

```bash
gh repo create Sconce-Labs/<name> --public --source . --remote origin --push
# or: create on github.com, then
git remote add origin https://github.com/Sconce-Labs/<name>.git && git push -u origin main
```

- `corridor` — current branch is `feat/stellar-hybrid`; open a PR into `main`
  (or push `main` directly if you prefer). Contains commits `e05cf9a` (hybrid
  re-scope) + the split commit.
- `corridor-contracts`, `corridor-circuits`, `corridor-sdk` — each has one
  `main` commit (`chore: initial import`). Push as-is.

Then list `corridor` and `corridor-contracts` on `drips.network` (Stellar Wave)
and open the issues from [`docs/DRIPS_ISSUES.md`](./docs/DRIPS_ISSUES.md).

---

## 8. Immediate next actions

1. Push the four repos (§7).
2. `cd corridor-contracts && cargo test --workspace` — confirm green on your box.
3. Install `noirup`/`bbup`; `cd corridor-circuits/corridor_eligibility && nargo check`.
4. Pin the `poseidon` dep and write the Poseidon2 conformance test (ROADMAP M2).
5. Open the Drips issues; then work M2 → M3 per [`ROADMAP.md`](./ROADMAP.md).
