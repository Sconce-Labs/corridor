# Corridor — internal audit

_2026-09-10. Self-audit of all five repos at the point of the Drips build-out.
Not an external security audit._

> **Update (2026-09-10, later):** C4 was signed off — **Option B (issuer-signed
> statements)** is now implemented across the circuit, SDK and Soroban
> contracts, and `corridor.compact` is rewritten as an issuer registry. This
> resolves **C1** and **C4** and retires **H1/H2** and the root-sync relayer.
> See `docs/CREDENTIAL_ACCUMULATOR.md` (§ Decision) and the status table below.
>
> **Round 2 (2026-09-10, later still):** a fresh line-by-line audit of the
> *shipped Option B code* — [jump to it](#round-2--audit-of-the-option-b-implementation).
> 1 critical (mock verifier), 2 high (unconstrained disclosed tag; issuer sees
> `holder_secret`), 8 medium.
>
> **Fix batch shipped (2026-09-10):** R2-H1, R2-H2, R2-M6, R2-M7, R2-L2 — done
> across circuit + SDK + contracts + docs, no ABI-layout change. Remaining:
> R2-C1 (M3, critical path), R2-M1/M2/M3/M4/M5/M8 and the low-severity batch are
> milestone work — see the status table at the end.

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
| H4 | `auditor_pubkey` bound to policy | ✅ done — it's a policy field + public input the contract binds (`DisclosureMissing` on mismatch). Final Option B ABI is **9** inputs, `auditor_pubkey` at idx 7. **But** see R2-M5: the blob still has no opening path. |
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

---
---

# Round 2 — audit of the Option B implementation

_2026-09-10 (later). A fresh line-by-line review of the shipped Option B code:
the Noir circuit, the three Soroban contracts + shared types, the TypeScript
SDK, `corridor.compact`, and the `web/` frontend. Every finding below was
verified against source. Not an external security audit._

## Verdict

The Option B pivot did what it set out to do — the circuit does a **real
signature verification**, the contract binding is careful, the conformance
harness is real, and it's deployed and smoke-verified on testnet. But the review
found **one issue that breaks a stated privacy invariant (H2 below — the issuer
sees `holder_secret`)** and **one soundness gap in what a pass actually attests
(H1 — the disclosed tag is unconstrained)**. Neither is exotic; both are
fixable in the SDK / circuit without a redesign. The **on-chain verifier is
still a mock (C1)** — until M3, the testnet stack has *zero* cryptographic
soundness and `is_cleared` is not a security boundary. Pitch accordingly.

| Severity | Count | The ones that matter |
|----------|------:|----------------------|
| Critical | 1 | mock verifier (C1) |
| High | 2 | unconstrained disclosed tag (H1); issuer learns `holder_secret` (H2) |
| Medium | 8 | revocation propagation is manual (M1); policy-TTL archival (M2); verifier-swap (M3); no canonical VK (M4); auditor blob has no opening path (M5); conformance only pins arity-2 (M6); ABI decode accepts non-canonical words (M7); no global pause (M8) |
| Low / hardening | 13 | — |

---

## Critical

### R2-C1 — On-chain ZK verification is a mock; the testnet deployment has no cryptographic soundness

`verifier_mock.verify()` returns `true` (default) or whatever `set_result` was
last given — and `set_result` **has no auth** (anyone can call it). The deployed
testnet stack (`CBN7N7AT…` verifier) uses it. Therefore, **today, on testnet**:

- anyone can call `corridor_attestation.enter()` with arbitrary bytes as `proof`
  and a well-formed 9-word `public_inputs` vector that matches a policy, and
  **get a pass** (`demo.sh` literally passes `proof = 0xaabbccdd`);
- `is_cleared(corridor_id, nullifier)` on testnet reflects those unverified
  passes — **a payout gate wired to it is trivially bypassable**.

This is round-1 C3, still open (M3). What round 1 under-stated: the testnet
deployment demonstrates *only* the policy-binding logic. It is not a
"working ZK system with a placeholder verifier" — without the verifier there is
no ZK property at all. The SDK's `TESTNET` preset and the web app both talk to
this stack; both should carry an explicit "not a security boundary until M3"
warning.

`ultrahonk_verifier` (the real skeleton) fails **closed** (`verify` → `false`),
which is the correct default — a corridor that points at it today simply can't
grant any pass.

---

## High

### R2-H1 — `disclosed_tag` is unconstrained; the tag enum discloses tier but nothing binds it to the real tier

The circuit's only constraint on `disclosed_tag` is `disclosed_tag < MAX_TAG`
(16). It is **not** bound to `w.tier`, to the credential, or to anything the
issuer signed. But `tags.nr` / `DisclosureTag` define `TIER_1_PASS = 1`,
`TIER_2_PASS = 2`, `TIER_3_PASS = 3` — i.e. the tag is meant to *disclose the
holder's tier*.

**A holder with a tier-1 credential can present `disclosed_tag = TIER_3_PASS`.**
The circuit still passes (`w.tier >= p.min_tier` uses the real witness tier;
the tag is only range-checked), and `corridor_attestation` stores
`PassRecord.tag = 3`. Any consumer that reads `pass_record().tag` as an attested
attribute is misled.

**Fix — pick one:**
1. **Strip the tier values from the enum.** Make the tag a corridor-*category*
   label (`REMITTANCE`, `AID_DISBURSEMENT`, …) chosen by the app, carrying no
   attestation. Then it's honest. Arguably also drop it as a circuit public
   input — a value the circuit only range-checks proves nothing and is a
   classic ZK smell; it could be a plain `enter()` parameter.
2. **Bind it.** Add a witness-checked constraint, e.g. a separate
   `disclosed_tier` field with `assert(disclosed_tier == 0 | disclosed_tier == w.tier)`.

Recommendation: (1) for the pilot; revisit if selective tier disclosure is a
real product requirement.

### R2-H2 — The SDK issuer flow requires the holder's raw secret, defeating issuer-side unlinkability

`corridor-sdk` `issueCredential(issuerPrivateKey, attrs)` takes
`attrs.holderSecret` (and `attrs.salt`) and computes
`holder_binding = Poseidon2(holder_secret, salt)` itself before signing. So an
**issuer running this SDK learns `holder_secret`.**

With `holder_secret`, the issuer can compute
`nullifier = Poseidon2(holder_secret, corridor_id)` for **every** corridor, watch
the Stellar chain, and link all of that holder's passes to each other and back
to the KYC identity. The design explicitly promises the opposite:

> ARCHITECTURE.md §2: *"The issuer never sees `holder_secret`."*
> README: *"Hand the issuer `holder_binding`, never the raw `holder_secret`."*

The implementation contradicts the docs. The unit tests don't catch it because
the test harness plays both issuer and holder.

**Fix:** `issueCredential` takes a pre-computed `holderBinding: Bytes32` and the
attributes; `statementMessage` takes `holderBinding` directly. The holder
computes `holder_binding` locally (`holderBinding(secret, salt)` already exists)
and sends only that to the issuer. `makeFixture` (test-only) can keep starting
from a secret since it simulates both parties. Update the issuer example in the
SDK README accordingly.

---

## Medium

### R2-M1 — Revocation propagation from Midnight to Stellar is manual and unenforced

Nothing links `corridor.compact`'s `issuerEpoch` to a corridor's Stellar
`policy.min_cred_epoch`. An operator is *expected* to watch each accepted
issuer's Midnight epoch and call `set_min_cred_epoch` to match — but there is no
oracle, no event bridge, no on-chain check, and no alerting. **If an issuer
bulk-revokes and an operator doesn't notice, the revoked cohort keeps passing
that corridor.** This is the load-bearing assumption of the whole revocation
story and it currently rests on operator diligence. At minimum: an SDK helper
that diffs Midnight `issuerEpoch` against every accepted issuer's Stellar floor
and warns; ideally a small watcher service (a scoped revival of the retired
relayer's shape).

### R2-M2 — Corridor `Policy` storage TTL is never extended

`corridor_registry` writes `Policy` on `register` / `update_policy` /
`set_paused` / `set_min_cred_epoch` (each resets the persistent TTL to default),
but `get_policy` — and `corridor_attestation.enter()`'s cross-contract read of
it — never calls `extend_ttl`. A corridor that is registered and then quiet for
longer than the network's default persistent TTL can have its policy **archived
out from under it**, after which `enter` fails with `PolicyNotFound`. Same class
as round-1 M8 (`Passes` TTL), which *was* fixed for the counter but not for
policies. **Fix:** `get_policy` should `extend_ttl` on the entry (or `enter`
should, right after the read).

### R2-M3 — Operators can swap `verifier` / `vk_hash` on a live corridor with no delay

`update_policy` lets the operator replace `verifier` and `vk_hash` at any time.
A compromised or malicious operator repoints their live corridor at a permissive
verifier and forges passes for it. `PolicyUpdated` surfaces the change (round-1
M5 fix) but there is no timelock and no way for a payout contract calling
`is_cleared` to know the verifier changed. Consider: a mandatory delay on
verifier changes, or a monotonic `policy_version` that consumers can pin.

### R2-M4 — No canonical / blessed verifier; every operator picks their own trust

`policy.verifier` and `policy.vk_hash` are entirely operator-chosen. There is no
registry of endorsed verifier contracts, no admin attestation, nothing that
tells an operator *which* address is the real UltraHonk verifier for the current
circuit VK. A corridor is exactly as sound as the verifier its operator
happened to configure. When M3 lands, the registry should either (a) keep an
admin-curated allowlist of `(verifier, vk_hash)` pairs, or (b) at least emit a
"canonical verifier" pointer operators can copy.

### R2-M5 — `auditor_blob` has no opening path — auditor mode is non-functional, not just "a commitment"

`auditor_blob = Poseidon2(auditor_pubkey, tier, issuer_id, nullifier, auditor_nonce)`
where **`auditor_nonce` is a private witness the holder chooses and never
shares.** A warranted auditor holding the "auditor key" still cannot recover
`{tier, issuer}` — they'd need the nonce, which only the holder has. It is a
pure hiding commitment with no decryption and no disclosed opening. Round 1
called this "a commitment, not encryption (M7)"; more precisely, **there is
currently no mechanism by which the auditor ever learns anything.** M7 (in-circuit
ECIES to `auditor_pubkey`) is not a nice-to-have upgrade — it is the entire
auditor capability. Until then, `required_disclosures` and the whole
"warranted auditor" column of the privacy table are aspirational.

### R2-M6 — Poseidon2 conformance pins only arity-2 in the circuit and the SDK

`conformance.nr` and `poseidon.test.ts` each assert exactly one pinned value:
`poseidon2([1,2])`. The circuit uses arity **4** (`statement_message`) and
arity **5** (`auditor_blob`); the SDK matches. Only Soroban's
`poseidon_conformance` pins `[1,2,3]` and `[1,2,3,4,5]`. Circuit ⇄ SDK agreement
for arities 4/5 is currently checked only *transitively* via `nargo execute` on
the SDK-signed fixture. It works, but `ABI.md` and the repo READMEs overstate
the coverage ("the pinned vector matches across all three"). **Fix:** add the
`[1,2,3]` and `[1,2,3,4,5]` pins to `conformance.nr` and `poseidon.test.ts`;
correct the docs.

### R2-M7 — ABI decode silently truncates non-canonical numeric words

`word_to_u32` / `word_to_u64` read only the low 4 / 8 bytes and ignore the high
bytes. `PublicInputs::decode` errors only on a length mismatch — never on a
malformed word. So `pi.min_tier` etc. are `word & 0xFFFFFFFF`. The circuit's
`u32` / `u64` typing constrains these upstream (Noir range-checks them), so this
is not currently exploitable, but it is missing defence-in-depth and the README
I wrote claims `BadPublicInputs` fires "or [on] a malformed word" — **it does
not.** Add canonicality asserts in `decode` and fix the doc.

### R2-M8 — No global pause on `corridor_attestation`

Per-corridor `paused` works (and `enter` checks it first), so an operator can
halt their own corridor. But there is no way to stop *all* corridors if a
systemic bug in `enter` / the verifier / the ABI decoder is found, or if the
registry itself is compromised. The registry `admin` role is nearly vestigial
(it can only hand itself off — round-1 removed `set_relayer` and nothing
replaced it). Give the admin an emergency `set_global_pause` on the attestation
contract, or at least document that incident response = every operator pausing
independently.

---

## Low / hardening

| # | Finding |
|---|---------|
| R2-L1 | `verifier_mock.set_result` has no auth — anyone can flip the deployed testnet mock. (Documented "never deploy to production"; still deployed to testnet.) |
| R2-L2 | `assertStrongSecret` is **never called** by `buildWitness` or `issueCredential` — the H5 mitigation is opt-in and nothing opts in. Wire it into `buildWitness(cred, …)`. |
| R2-L3 | Just-expired credential passes within `now_tolerance_secs` (holder sets `pi.now` as old as the window allows, `expiry > pi.now` still holds). Round-1 M7; documented as acceptable. |
| R2-L4 | Two diverging Soroban read clients — `corridor-sdk/src/soroban.ts` (`SorobanReader`, hardcoded `SIM_SOURCE` strkey that looks 1 char short) vs `corridor/web/src/corridor.ts` (uses `Keypair.random()`). A `CorridorPolicy` shape change needs editing both. Consider publishing the SDK so `web/` can depend on it. |
| R2-L5 | Web app sets `X-Content-Type-Options` / `Referrer-Policy` / `Permissions-Policy` but **no `Content-Security-Policy`**. Everything is bundled + one RPC host — a strict CSP is cheap. |
| R2-L6 | No React error boundary in `web/src/App.tsx` — a render-time throw (unexpected `scValToNative` shape) white-screens the page. Async errors are handled. |
| R2-L7 | ✅ **done** — `midnight/deploy.ts` calls `initAdmin` in the same run as the deploy, so there is no first-caller-wins window. The admin secret is `CORRIDOR_ADMIN_SECRET` or `sha256("…" + walletSeed)`. |
| R2-L8 | `corridor.compact` has no `rotateIssuerAuth` — a leaked Midnight control secret forces `deregisterIssuer` + `registerIssuer`, losing the epoch. |
| R2-L9 | `corridor.compact` `reportAttestations` is a self-reported, unverifiable counter — transparency theatre. Consider removing it (it's a circuit + attack surface for no real assurance). |
| R2-L10 | `schnorr.ts` `randScalar` = `randomBytes(32) % GRUMPKIN_Q` — modulo bias (256-bit into ~254-bit q). Negligible for a private key; use rejection sampling like `randomFieldElement` does. |
| R2-L11 | Registry `admin` can only transfer itself — no protective powers (see R2-M8). |
| R2-L12 | `auditor_pubkey` is a circuit `Field`, so a policy's `auditor_pubkey` must be `< BN254_P` or no proof can ever match it. Undocumented. |
| R2-L13 | `corridor_attestation`'s `registry` address is fixed at construction — a registry bug needs an attestation redeploy too. |
| R2-L14 | `vec_contains` on `accepted_issuers` is O(n) (round-1 note, still true) — keep allowlists short. |
| R2-L15 | Stale pre-Option-B comments in `conformance.nr` ("Merkle roots", "commitment (5 inputs)", "rev-slot"). Cosmetic. |
| R2-L16 | `corridor.compact` `issuerId` is admin-supplied and never checked to be `Poseidon2(pk.x, pk.y)` of a real key — a wrong id is a silent liveness bug (that issuer's Midnight epoch maps to nothing on Stellar). |

---

## What's genuinely solid (Round 2)

- **`noir-lang/schnorr` v0.4.0 `verify_signature` validates the pubkey is
  on-curve and rejects the infinity point** — verified against the library
  source. The circuit is not trusting an unvalidated point.
- **`main.nr` public-input wiring is correct** and matches `PI_*` exactly
  (`corridor_id`=0 … `auditor_blob`=8).
- **Every public input is consumed by a constraint** (no dangling-public-input
  malleability — though `disclosed_tag` only by a range check, see R2-H1).
- **`enter()` has no `require_auth` — correct by design.** The proof is the
  authorization; front-running `enter` is harmless because the pass is keyed by
  nullifier, not by submitter (a front-runner just pays to grant your pass).
- **Deterministic Schnorr nonces** derived from `(d, message, counter)` — no
  nonce-reuse risk, EdDSA-style.
- **`verify-local.ts` faithfully mirrors `eligibility::check`** — same checks,
  same order, same error semantics.
- **Nullifier permanence** (round-1 H3) holds — TTL bumped on write and on
  `is_cleared` / `pass_record` reads.
- **Two-step admin transfer**, **`PolicyUpdated` carrying the security-relevant
  fields**, **`set_min_cred_epoch` monotonicity** — all present and tested.
- **`ultrahonk_verifier` fails closed.**
- CI on all four repos is real and green; the cross-impl conformance is enforced
  (arity-2 explicitly, arities 4/5 transitively — see R2-M6).

---

## Round 2 — remediation status

| # | Action | Status |
|---|--------|--------|
| R2-H2 | `issueCredential` takes `holderBinding`, not `holderSecret` | ✅ **done** — `prepareCredentialRequest` → `issueCredential` → `assembleCredential`; the issuer sees only the binding. New `CredentialRequest` / `SignedStatement` types. |
| R2-H1 | Tag enum carried tier values with nothing binding them | ✅ **done** — `TIER_*_PASS` removed from `tags.nr` + `DisclosureTag`; tags are corridor category labels with no attestation, documented as such in `ABI.md` / `CIRCUIT.md`. |
| R2-M6 | Poseidon2 conformance only pinned arity-2 | ✅ **done** — arity-4 (statement) + arity-5 (auditor blob) now pinned explicitly in `conformance.nr`, `poseidon.test.ts`, and `poseidon_conformance`; `ABI.md` corrected. |
| R2-M7 | `decode` accepted non-canonical numeric words | ✅ **done** — `word_to_u32`/`u64` return `Result` and error on non-zero high bytes → `BadPublicInputs`; `ABI.md` corrected; +3 tests. Defence in depth (circuit already range-constrains). |
| R2-L2 | `assertStrongSecret` never called | ✅ **done** — `buildWitness` enforces it on `cred.holderSecret`. |
| R2-C1 | Real UltraHonk verifier | ⏳ **M3** — the critical path |
| R2-M2 | `get_policy` / `enter` extend the `Policy` TTL | ⏳ next contracts PR |
| R2-M1 | SDK helper: diff Midnight `issuerEpoch` vs Stellar floors + warn | ⏳ M5 (issuer tooling) |
| R2-M5 | In-circuit ECIES to `auditor_pubkey` (real auditor opening) | ⏳ M7 |
| R2-M3 / R2-M4 / R2-M8 | verifier-swap delay · canonical-VK registry · global pause | ⏳ M3–M5 window, with the real verifier |
| R2-L7 | ✅ done — atomic `initAdmin` in `midnight/deploy.ts` |
| R2-L1, L4–L16 | hardening batch | ⏳ opportunistic (L4 typecheck-scope done — SDK + `midnight/`; L5/L6 → corridor#8) |

The **near-term batch** (R2-H1, R2-H2, R2-M6, R2-M7, R2-L2) **shipped
2026-09-10** — one pass across circuit + SDK + contracts + docs, no ABI-layout
change. Everything else is milestone work.
