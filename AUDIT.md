# Corridor — internal audit

_2026-09-10. Self-audit of all five repos at the point of the Drips build-out.
Not an external security audit._

> **Update (2026-09-10, later):** C4 was signed off — **Option B (issuer-signed
> statements)** is now implemented across the circuit, SDK and Soroban
> contracts, and `corridor.compact` is rewritten as an issuer registry. This
> resolves **C1** and **C4** and retires **H1/H2** and the root-sync relayer.
> See `docs/CREDENTIAL_ACCUMULATOR.md` (§ Decision) and the status table below.

## Verdict

The engineering within each repo is solid — clean modules, real tests, green CI.
The audit found **two critical design holes** (revocation non-functional; the
Midnight↔Stellar bridge assumed a shared Merkle root across incompatible
fields) and **one critical security hole** (`post_root` was permissionless).
The security hole was fixed, and **both design holes are now resolved by the
Option B redesign** (issuer-signed statements — no accumulator, no shared
root). What remains critical: **the ZK layer is still mocked on-chain** (M3).
This is a pre-MVP research build; it should be pitched as that.

Remediation status is tracked in the table at the end and mirrored in the Drips
issues.

---

## Critical

### C1 — Revocation does not work _(RESOLVED via Option B)_

The old design stored `revoked` as an **append-only** `MerkleTree`; the circuit
checked a **sparse position**, so a revoked credential's slot was still empty
and every credential proved non-revoked.

**Resolved.** Option B drops revocation trees entirely. Credentials are
**short-lived issuer-signed statements** (days, not years) carrying a
`cred_epoch`; bulk revocation is a monotonic **`min_cred_epoch` floor** — set
per-corridor on Stellar (`corridor_registry.set_min_cred_epoch`) and published
per-issuer on Midnight (`corridor.compact` `bumpEpoch`). The circuit enforces
`cred_epoch >= min_cred_epoch` and `expiry > now`. No accumulator, no sync.

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

### C4 — Midnight and the circuit are on incompatible fields _(RESOLVED via Option B)_

| Layer | Field | Tree hash |
|-------|-------|-----------|
| Midnight / Compact | BLS12-381 | `transientHash` |
| Noir + Stellar P25 | BN254 | Poseidon2 |

A BLS12-381 Merkle root can never equal a BN254 one, so the
Midnight-builds-tree / relayer-syncs-root / circuit-proves-inclusion design
could not work.

**Resolved.** Option B removes the shared-root requirement: nothing needs to
match a Merkle root across the two chains. The issuer signs on **Grumpkin**
(BN254's embedded curve) with **Poseidon2**, and the circuit + Stellar verify
that signature natively. Midnight only holds a plain issuer directory. See
`docs/CREDENTIAL_ACCUMULATOR.md`.

---

## High

- **H1 — "relayer" is overloaded.** _RESOLVED._ Option B deletes the root-sync
  service, so "relayer" now means one thing: the (still unbuilt) fee-sponsoring
  **tx-relayer** that `corridor-sdk.enter()` targets, specced in
  `docs/TX_RELAYER.md`. The privacy claim still depends on it — M6.
- **H2 — `corridor-relayer` has no working core.** _RESOLVED — repo retired._
  Option B has no roots to sync. `corridor-relayer` is archived; the
  fee-sponsoring tx-relayer, when built, is a new focused service.
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
| C1 | Revocation | ✅ **resolved via Option B** — short expiry + monotonic `min_cred_epoch` floor (circuit, SDK, `corridor_registry`, `corridor.compact`) |
| C2 | Allowlist `post_root` + two-step admin | ✅ done (`post_root` since removed by Option B; two-step admin kept) |
| C3 | Real UltraHonk verifier | ⏳ M3 (large) — docs no longer claim it's live |
| C4 | Accumulator architecture (BLS12-381 vs BN254) | ✅ **resolved via Option B** — no shared root; Grumpkin Schnorr + Poseidon2 end to end |
| H1 | Root-sync vs tx-relayer | ✅ resolved — root-sync deleted; only the tx-relayer (`docs/TX_RELAYER.md`) remains, M6 |
| H2 | Relayer core (`readRoots`) | ✅ resolved — `corridor-relayer` retired under Option B |
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
