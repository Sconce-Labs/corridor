# Corridor — internal audit

_2026-09-10. Self-audit of all five repos at the point of the Drips build-out.
Not an external security audit._

## Verdict

The engineering within each repo is solid — clean modules, real tests, green CI.
The system has **two critical design holes** (revocation is non-functional; the
Midnight↔Stellar bridge assumes a shared Merkle root across incompatible
fields), **one critical security hole now fixed** (`post_root` was
permissionless), and **the ZK layer is mocked on-chain**. This is a pre-MVP
research build; it should be pitched as that.

Remediation status is tracked in the table at the end and mirrored in the Drips
issues.

---

## Critical

### C1 — Revocation does not work _(fix: circuit side done; Compact side blocked on C4 decision)_

`corridor.compact` stores `revoked` as an **append-only** `MerkleTree`
(`insert` at next index). The circuit proves non-revocation by checking a
**sparse position** derived from the commitment. A revoked credential's sparse
position is still empty, so every credential proves non-revoked.

- Circuit + SDK: rewritten as a proper **indexed Merkle tree** (low-leaf
  non-membership range proof). Sound on the BN254 side.
- Compact side: blocked on C4 — see `docs/CREDENTIAL_ACCUMULATOR.md`.

### C2 — `post_root` was permissionless _(FIXED)_

`relayer.require_auth()` only checked the caller authed as themselves. Any
address could inject an arbitrary credential/revocation root by bumping the
epoch → forge inclusion → pass any corridor.

**Fixed:** `set_relayer(relayer, allowed)` admin allowlist; `post_root` rejects
non-allowlisted callers with `RelayerNotAllowed`; admin transfer is now
two-step (`propose_admin` → `accept_admin`). Note: the recommended architecture
(`CREDENTIAL_ACCUMULATOR.md` Option B) removes `post_root` entirely.

### C3 — "verified on-chain" oversells; the verifier is mocked _(docs FIXED; verifier is M3)_

Deployed `corridor_attestation` points at `verifier_mock` (returns `true`). The
policy binding is enforced on-chain; the proof itself verifies nothing. Docs
now say so. Real UltraHonk verification is M3 (large; the reference
`ultrahonk_soroban_contract` is thousands of lines).

### C4 — Midnight and the circuit are on incompatible fields _(needs architecture sign-off)_

| Layer | Field | Tree hash |
|-------|-------|-----------|
| Midnight / Compact | BLS12-381 | `transientHash` |
| Noir + Stellar P25 | BN254 | Poseidon2 |

A BLS12-381 Merkle root can never equal a BN254 one. The Midnight-builds-tree /
relayer-syncs-root / circuit-proves-inclusion design cannot work as specified.
Options + recommendation (issuer-signed statements) in
`docs/CREDENTIAL_ACCUMULATOR.md`. **Needs a decision before `corridor.compact`
is rewritten.**

---

## High

- **H1 — "relayer" is overloaded.** The root-sync service and the (unbuilt)
  fee-sponsoring tx-relayer that `corridor-sdk.enter()` targets are different
  components sharing a name. The privacy claim ("holder's account unlinked")
  depends on the tx-relayer, which doesn't exist. _Open._
- **H2 — `corridor-relayer` has no working core.** `readRoots()` throws; the
  service is a harness around a missing function that also can't be written
  until C1/C4 resolve. _Open (may be deleted per Option B)._
- **H3 — nullifier permanence vs storage TTL _(FIXED)_.** Now: one-time &
  permanent, TTL-bumped on write and on `is_cleared`/`pass_record` reads.
- **H4 — `auditor_blob` / `required_disclosures` is toothless.** `auditor_pk`
  is a private witness (holder-chosen) and `required_disclosures` is read by
  nothing. _Fix in progress: make `auditor_pubkey` a policy field + a public
  input the contract binds._
- **H5 — holder-secret entropy is unenforced.** Low-entropy secrets make
  nullifiers grindable and weaken commitment hiding. `randomSecret()` exists;
  nothing requires it. _Open — issuer tooling must use a CSPRNG; add a
  protocol note._

---

## Medium

| # | Finding | Status |
|---|---------|--------|
| M1 | `rs-soroban-poseidon` is an unpinned git dep (lockfile-pinned only) | open — pin a rev |
| M2 | two `soroban-sdk` majors in one workspace (25 + 27) | accepted (isolated conformance crate) |
| M3 | no cross-repo integration test | open |
| M4 | hub carries the retired counter scaffold | in progress |
| M5 | `update_policy` verifier swap had no event detail | FIXED (`PolicyUpdated` now carries verifier/vk_hash) |
| M6 | single-step `transfer_admin` | FIXED (propose/accept) |
| M7 | just-expired credential passes within `now_tolerance_secs` | open — documented; acceptable |
| M8 | `Passes` counter TTL never extended | FIXED |
| M9 | `Prover.toml` / `FIXTURES.md` say "shape-only" but CI proves it | open — doc fix |
| M10 | README/PROPOSAL top-line claims | FIXED |

---

## Low / notes

- `ultrahonk_verifier.verify()` returns `false` — correct for a skeleton.
- `vec_contains` on `accepted_issuers` is O(n) — keep the allowlist small.
- SDK `randomFieldElement` uses `node:crypto` — needs a browser path before
  `@corridor/verify` ships to browsers.
- All 9 circuit public inputs are consumed by a constraint (no
  unconstrained-public-input bug).
- Credential *inclusion* (vs revocation) is structurally sound against an
  append-only tree; it still needs C4 resolved.
- Dependabot opened ~15 PRs; don't auto-merge the `@stellar/stellar-sdk 13→17`
  or `actions/checkout 4→7` ones.

---

## What's genuinely solid

Contract structure (typed modules, `Verifier` trait indirection,
`#[contractevent]`), the circuit's module split + failure-mode test coverage,
the SDK's defensive `buildWitness` (re-derives roots, fails locally before
proving) + `verifyWitnessLocally`, the relayer's production shape, and the
honesty of the detailed docs. The `enter()` policy binding is careful. The
testnet deployment is real.

---

## Remediation status (2026-09-10)

| # | Action | Status |
|---|--------|--------|
| C1 | Indexed Merkle tree revocation — circuit + SDK | ✅ done (`imt.nr`, `IndexedMerkleTree`; `nargo execute` solves the SDK fixture) |
| C1 | Compact-side revocation | ⛔ blocked on C4 decision |
| C2 | Allowlist `post_root` + two-step admin | ✅ done |
| C3 | Real UltraHonk verifier | ⏳ M3 (large) — docs no longer claim it's live |
| C4 | Accumulator architecture (BLS12-381 vs BN254) | 📋 `docs/CREDENTIAL_ACCUMULATOR.md` — **needs sign-off** |
| H1 | Root-sync vs tx-relayer | ✅ clarified; `docs/TX_RELAYER.md` specs the unbuilt tx-relayer |
| H2 | Relayer core (`readRoots`) | ⏳ M5 (or removed under Option B) |
| H3 | Nullifier permanence | ✅ done |
| H4 | `auditor_pubkey` bound to policy | ✅ done (PI_LEN 9→10) |
| H5 | Holder-secret entropy | ✅ `assertStrongSecret` + `randomSecret` exported + circuit doc note; true enforcement is issuer-side |
| M1 | Pin `rs-soroban-poseidon` git dep | ✅ done |
| M3 | Cross-repo integration test | ✅ `corridor-sdk/src/integration.test.ts` + `scripts/integration.sh` |
| M4 | Delete retired counter scaffold | ✅ done |
| M5 | `PolicyUpdated` event detail | ✅ done |
| M6 | Two-step `transfer_admin` | ✅ done |
| M7 | Just-expired credential window | 🔵 documented; acceptable |
| M8 | `Passes` counter TTL | ✅ done |
| M9 | `Prover.toml` doc drift | ✅ non-issue (already correct) |
| M10 | Top-line claims | ✅ done |
