# Corridor — Project Handoff

_Last updated: 2026-09-10_
_Repo: github.com/Sconce-Labs/corridor · Maintainer: Sconce Labs_

Written so **any person or AI agent can pick up cold**. Read this, then
[`ARCHITECTURE.md`](./ARCHITECTURE.md), then [`ROADMAP.md`](./ROADMAP.md).

---

## 1. What changed (2026-09-10)

Corridor was a single-chain entry for the Rise In "New Moon to Full" Midnight
Builder Challenge. It has been **re-scoped as a hybrid Midnight + Stellar
product** targeting the Stellar ecosystem (Drips Wave now, SCF later). The
challenge is no longer the goal.

New this session:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the hybrid design (Midnight credential
  registry + Noir eligibility proof + Soroban policy/verification/attestation).
- [`stellar/`](./stellar/) — a Soroban Rust workspace: `corridor_registry`,
  `corridor_attestation`, `verifier_mock`, `corridor_types`. Implemented with
  host unit tests.
- [`circuits/corridor_eligibility/`](./circuits/) — the Noir circuit. Written,
  not yet proven end-to-end.
- [`contracts/corridor.compact`](./contracts/corridor.compact) — the Midnight
  credential registry, replacing `counter.compact`. Written, needs
  `compact compile` to verify.
- README / PROPOSAL rewritten for the hybrid story. [`DRIPS.md`](./DRIPS.md)
  added.

The old single-chain artifacts still exist (`contracts/counter.compact`,
`src/`, the Preview deployment) and are retired but not yet deleted — see §5.

---

## 2. The design in 60 seconds

```
Issuer ──issueCredential(commitment)──▶ Midnight (corridor.compact)
                                         credentials/revoked Merkle trees, epoch
                                              │
                                     Relayer reads roots
                                              ▼
Holder device ──Noir proof (UltraHonk)──▶ Stellar corridor_attestation.enter()
  private: secret, tier, expiry, paths      │ binds proof↔policy, verifies,
  public:  roots, corridor_id, nullifier    │ burns nullifier, records PassRecord
                                            ▼
                        Corridor operator payout ──is_cleared()?──▶ pay / deny
```

Why both chains: Midnight = confidential credential custody; Stellar = cheap
public settlement with native ZK verification (Protocol 25). The bridge is a
proof, not a trusted message. Full rationale in `PROPOSAL.md` §"Why two
networks".

---

## 3. Component status

| Component | Path | State | Next |
|-----------|------|-------|------|
| Soroban registry + attestation + mock verifier | `stellar/` | ✅ implemented + host tests | deploy to testnet (M1) |
| Public-input ABI (`PI_*`) | `stellar/crates/corridor_types` | ✅ | keep in sync with circuit |
| Noir circuit | `circuits/corridor_eligibility` | ✅ written, ⏳ unproven | fixtures + `nargo`/`bb` run (M2) |
| Real UltraHonk verifier | — | ❌ | wire `indextree/ultrahonk_soroban_contract` (M3) |
| Poseidon2 cross-chain domain match | circuit ↔ host fn | ❌ | pin params so roots agree (M2) |
| Midnight credential registry | `contracts/corridor.compact` | ✅ written, ⏳ uncompiled | `compact compile` + deploy Preprod (M4) |
| Root-sync relayer | `relayer/` (not created) | ❌ | M5 |
| `@corridor/verify` SDK | `packages/` (not created) | ❌ | M6 |
| Frontend (holder + operator) | `src/` | ⚠️ old single-chain UI | rewrite M6 |

---

## 4. Traps / things to know

1. **No toolchains for two of the three layers on the original dev box.**
   `cargo`/`rustc`/`stellar` CLI are present (Soroban builds + tests run).
   `nargo`/`bb` (Noir) and the Midnight `compact` compiler are **not** — the
   circuit and the Compact contract are written but were not machine-checked
   here. `which compact` resolves to the Windows NTFS compression tool, not the
   Midnight compiler.

2. **The old `CircuitCall.tsx` is still a fake** (`setTimeout` + hardcoded
   `42`). The whole `src/` frontend targets the retired single-chain design.
   Don't wire anything new to it; it's slated for rewrite in M6.

3. **`verifier_mock` returns `true` by default.** Every Soroban test that
   exercises the happy path is trusting the mock. Real soundness starts at M3.

4. **Poseidon2 must match across chains.** The Noir `poseidon` dep in
   `circuits/corridor_eligibility/Nargo.toml` has a placeholder `tag`. If the
   permutation params differ from Soroban's `poseidon2_permutation`, the
   Merkle roots computed on Midnight, in the circuit, and checked on Stellar
   will silently disagree. Treat this as a correctness gate, not a nicety.

5. **The relayer is a trusted component in the MVP.** `post_root` is
   permissionless-but-logged. A dishonest root admits bad credentials or
   censors good ones. Hardening path is in `ARCHITECTURE.md` §6 and ROADMAP M5.
   Never describe Corridor as trustless before M5+.

6. **Nullifier state rent.** `corridor_attestation` stores one persistent entry
   per pass, TTL ~30 days. Don't let nullifiers expire while a credential is
   still valid — that would allow replay. M6 needs an archival story.

7. **`.midnight-state.json`** still holds plaintext Preview/Preprod seeds. It is
   gitignored (verified). Never commit or reuse for value.

8. **Auditor mode is a commitment, not encryption yet.** `auditor_blob` in the
   circuit is a hiding Poseidon2 commitment. A real auditor can't decrypt
   anything until M7 (in-circuit ECIES).

---

## 5. Cleanup owed (not done yet)

- Delete `contracts/counter.compact`, `tests/counter*.ts`,
  `src/contracts/counter-contract.js`, `public/contracts/counter/`,
  `contracts/managed/`, `node_modules.bak/`, `e2e-call.log`.
- Rename Midnight scripts (`src/deploy.ts` etc.) from `counter` → `corridor`
  paths, or fold them into a `midnight/` subdir.
- Decide whether the Midnight deploy/CLI scripts stay in `src/` (shared with
  frontend) or move to `midnight/`.

Left in place deliberately so nothing is lost mid-pivot. Do this as its own PR.

---

## 6. How to work on it

```bash
# Stellar (works today)
cd stellar && cargo test --workspace

# Noir (needs: curl -L noirup.dev | bash; noirup; bbup)
cd circuits/corridor_eligibility && nargo test

# Midnight (needs: npm i -g @midnight-ntwrk/compact-compiler + Docker proof server)
compact compile contracts/corridor.compact contracts/managed/corridor
```

CI (`.github/workflows/ci.yml`) should run all three — update it (M1 task).

---

## 7. Immediate next actions

1. `cd stellar && cargo test --workspace` — confirm green on your box.
2. `stellar contract build` + deploy the three contracts to testnet; record
   addresses in `README.md` + `.env`.
3. Install `noirup`/`bbup`; `nargo check` the circuit; fix whatever the real
   compiler flags.
4. Pin the `poseidon` dependency and confirm the permutation matches Soroban.
5. Open the Drips Wave issues from [`DRIPS.md`](./DRIPS.md).
6. Then M2 → M3 per [`ROADMAP.md`](./ROADMAP.md).
