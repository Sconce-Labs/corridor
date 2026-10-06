# Corridor — Project Handoff

_Last updated: 2026-09-10 (post Option B)_
_Hub repo: github.com/Sconce-Labs/corridor · Maintainer: Sconce Labs_

Written so **any person or AI agent can pick up cold**. Read this, then
[`ARCHITECTURE.md`](./ARCHITECTURE.md), [`COMPONENTS.md`](./COMPONENTS.md),
[`docs/CREDENTIAL_ACCUMULATOR.md`](./docs/CREDENTIAL_ACCUMULATOR.md), then
[`ROADMAP.md`](./ROADMAP.md).

---

## 1. What Corridor is

A **portable proof of eligibility** for cross-border payments. KYC once with a
regulated issuer; then prove "I'm cleared for this payment corridor" to any
number of providers, revealing nothing.

- An **issuer** runs KYC once, then **signs** a short-lived statement
  `{ holder_binding, tier, expiry, cred_epoch }` with a **Grumpkin** key. The
  holder keeps the signature (and their `holder_secret`, never shared).
- A **Noir → UltraHonk** proof, generated on the holder's device, proves
  knowledge of that signature plus the corridor's policy predicates.
- **Stellar / Soroban** runs corridor policy, verifies the proof on-chain
  (Protocol 25 primitives; mock today, M3 for real), burns a per-corridor
  nullifier, records the pass, and gates the payout.
- **Midnight** (`corridor.compact`) is a public **issuer registry** — who the
  licensed issuers are and each issuer's current credential epoch. No holder
  data.

### Option B (2026-09-10)

The original design had Midnight build a credential Merkle tree, a relayer sync
its root to Stellar, and the circuit prove inclusion. The audit
([`AUDIT.md`](./AUDIT.md)) found this **cannot work** — Midnight is BLS12-381 /
`transientHash`, the circuit + Stellar P25 are BN254 / Poseidon2, so the roots
are values in different fields — and that revocation was a no-op. **Option B**
(`docs/CREDENTIAL_ACCUMULATOR.md`) replaced the accumulator with issuer-signed
statements. This removed the credential/revocation trees, `post_root`, the
relayer allowlist, and the `corridor-relayer` repo.

---

## 2. Repo map

| Repo | Contents | State |
|------|----------|-------|
| **[Sconce-Labs/corridor](https://github.com/Sconce-Labs/corridor)** (this) | docs, `contracts/corridor.compact` (Midnight issuer registry), `midnight/` (deploy + issuer-ops tooling) | active |
| **[Sconce-Labs/corridor-contracts](https://github.com/Sconce-Labs/corridor-contracts)** | Soroban workspace; owns `ABI.md` | ✅ 33 tests + poseidon conformance; deployed + smoke-verified on testnet |
| **[Sconce-Labs/corridor-circuits](https://github.com/Sconce-Labs/corridor-circuits)** | `corridor_eligibility` Noir circuit (Grumpkin Schnorr) | ✅ 20 tests, signed fixture, `nargo execute` |
| **[Sconce-Labs/corridor-sdk](https://github.com/Sconce-Labs/corridor-sdk)** | `@corridor/verify` TS SDK + Grumpkin signer | ✅ 25 tests; reads + witness + 3-step issuance real |
| **[Sconce-Labs/corridor-relayer](https://github.com/Sconce-Labs/corridor-relayer)** | ~~root-sync service~~ | 🗄️ **archived** (Option B) |

All repos public with CI. Local checkouts:
`C:/Users/samue/Documents/{corridor,corridor-contracts,corridor-circuits,corridor-sdk,corridor-relayer}`,
each on `main` tracking its remote. `gh` is available in **WSL**
(`wsl -e bash -lc '…'`), authed as `samjay8` (admin on the org). Branch
protection is on for `main` in every repo (required status check; admins can
bypass).

---

## 3. The design in 60 seconds

```
Issuer (off-chain KYC) ──Schnorr_sign(issuer_sk, statement)──▶ Holder keeps { tier, expiry, cred_epoch, salt, pubkey, sig }
  statement = Poseidon2([Poseidon2([holder_secret, salt]), tier, expiry, cred_epoch])

Holder device ──Noir proof (UltraHonk)──────────▶ Stellar corridor_attestation.enter()
  private: holder_secret, tier, expiry, cred_epoch,   │ binds proof↔policy (issuer allowlist,
           salt, issuer_pk, sig, auditor_nonce        │ min_tier, min_cred_epoch, auditor key,
  public:  corridor_id, min_tier, now, nullifier,     │ time skew), verifies, burns nullifier,
           disclosed_tag, issuer_id, min_cred_epoch,  │ records PassRecord
           auditor_pubkey, auditor_blob               ▼
                       Corridor operator payout ──is_cleared()?──▶ pay / deny

Midnight corridor.compact:  issuers set + issuerEpoch map  (read by operators to set min_cred_epoch)
```

Bulk revocation: issuer raises `cred_epoch` (publishes via `bumpEpoch` on
Midnight); operators raise `min_cred_epoch` on their Stellar policy; the circuit
enforces `cred_epoch >= min_cred_epoch`. Primary revocation is just **short
expiry** — the issuer stops re-signing.

---

## 4. Component status

| Component | Repo / path | State | Next |
|-----------|-------------|-------|------|
| Soroban registry + attestation + mock verifier | corridor-contracts | ✅ 33 host tests; deployed + smoke-verified on testnet (Option B) | real verifier (M3) |
| Public-input ABI (`PI_*`, 9 inputs) | corridor-contracts `crates/corridor_types` + `ABI.md` | ✅ source of truth | keep circuit + SDK in sync |
| Noir circuit (Grumpkin Schnorr verify) | corridor-circuits | ✅ 20 `nargo test`, `nargo execute` solves a real signed fixture | pin `bb` when beta.26 gets a mapping |
| Poseidon2 conformance (circuit ⇄ SDK ⇄ Soroban) | contracts/circuits/sdk | ✅ pinned vector matches all three | — |
| Schnorr conformance (SDK signer ⇄ circuit verifier) | sdk + circuits | ✅ pinned vector + `nargo execute` in CI | — |
| SDK reads + `buildWitness` + `issueCredential` + signer | corridor-sdk | ✅ real, live testnet reads | `requestProof` + `enter` clients (M6) |
| Real UltraHonk verifier (M3 steps 1–2) | corridor-contracts `contracts/ultrahonk_verifier` + `crates/ultrahonk_core` | 🟡 full pipeline wired over the vendored, OZ-audited core; **real corridor proof E2E-verifies in the Soroban host** (54 host tests, fixtures committed) | step 3: testnet deploy + `vk_hash` policy + `enter()` E2E |
| SDK-28 isolation graph | corridor-contracts `crates/ultrahonk_core`, `crates/ultrahonk_test_utils`, `contracts/ultrahonk_verifier` | ✅ pinned soroban-sdk 28 (core needs `Bn254Fr`/`g1_msm`/`g1_is_on_curve`); workspace stays on 25.3; wire ABI is SDK-agnostic | stellar-cli ≥ 25.2 builds the verifier wasm (`stellar contract build`) |
| Midnight issuer registry | this repo `contracts/corridor.compact` + `midnight/` | ✅ compiles in CI to a 6-circuit keyset; deploy/issuer/read tooling Option-B-ready (`npm run typecheck`) | simulator tests + Preprod deploy (M4, corridor#3) |
| Fee-sponsoring tx-relayer | spec `docs/TX_RELAYER.md` | ❌ | build (M6) |
| Frontend | this repo `web/` | ✅ site + live reads + `is_cleared` checker | holder/operator flows (M6) |

### Testnet deployment (Stellar) — Option B, redeployed 2026-09-10 (audit R2-M7)

| Contract | Address |
|----------|---------|
| `corridor_registry` | `CDGMQ24E6OIBZB3EKJN5TUA5POYE6D5FNBL2II6SRLTYF32TE4HIEXJ6` |
| `corridor_attestation` | `CCHWKVRCEKPJHEXREP5SCZ4TEKNBFYEFYA2VR3SET5AMG4WOC76LDL4K` |
| `verifier_mock` (unchanged, reused) | `CBN7N7AT7CPAA7MBIAULEBY3GIV7NNB3XPNEUJSIAHFIM5BJ7GIGK46Y` |

Deployer key `corridor`: `GATI44YBCQ67LZOKSE4R7C7QOKJU7F4DQBMSR4CBGC5YZ7TQRYWCJR2O`
(testnet only, in the local `stellar` CLI keystore). Record:
`corridor-contracts/deployments/testnet.json`. Smoke-verified `register →
enter → is_cleared == true`, replay rejected #12. The demo corridor id is
`0x…04`, min_tier 2, min_cred_epoch 1, one accepted issuer (`0x…07`).
**Four places carry the addresses — update together on a redeploy:**
`deployments/testnet.json`, `corridor-sdk/src/networks.ts`,
`corridor/web/src/config.ts`, and the doc tables here + in each README.

### M3 — real UltraHonk verifier (in progress; steps 1–2 done 2026-10-05/06)

Branch `m3/scaffold-verifier` on corridor-contracts (commits `6f275d4` step 1,
`3821160` step 2, not yet pushed/PR'd; ambient GitHub credential is
`sojetunde8` → 403 on Sconce-Labs, so push needs Samuel). Step 2 also landed a
sibling branch `m3/beta9-toolchain` `2feb370` on corridor-circuits.

- **Vendored core**: `crates/ultrahonk_core` =
  [NethermindEth/ultrahonk-rust-verifier] `crates/ultrahonk-soroban-verifier`
  at `097da17df8b0b971d71885566034958a8caebab4` (2026-09-22), byte-identical
  sources — the commit OpenZeppelin audited (Aug 2026: 0 Critical / 0 High /
  0 Medium, 5 Low, all remediated). ~2,700 lines no_std; uses only native
  Soroban host crypto (`bn254` field ops, `g1_msm`, `pairing_check`,
  `keccak256`). Provenance: `crates/ultrahonk_core/VERIFIER_PROVENANCE.md`.
- **SDK isolation**: the core needs SDK-28 host APIs (`Bn254Fr`, `g1_msm`,
  `g1_is_on_curve`) absent from the workspace's SDK 25.3, so the core, the
  vendored test-utils, and the verifier contract pin SDK 28.0.0 explicitly;
  the rest of the workspace stays on 25.3. The contract deliberately does NOT
  depend on `corridor_types` (an SDK-25 crate) — it re-implements the
  `Verifier` wire ABI (`verify(vk_hash, proof, public_inputs) -> bool`) and
  duplicates `PI_LEN = 9` as `PUB_INPUT_WORDS`.
- **Adapter** (`contracts/ultrahonk_verifier`): VK stored once at deploy,
  validated by parsing (1760 bytes) before storage, immutable, no admin;
  fail-closed `verify` (wrong vk_hash pin / count ≠ 9 / length ≠ 14 592 /
  any core error → `false`, never traps on caller input). 5 host tests.
- **Formats**: proof = 456 × 32 = 14 592 bytes; VK = 1760 bytes; expected
  public inputs = `vk.public_inputs_size − 16` (16 = the pairing-point object
  carried in the proof). Corridor's 9 inputs must equal that — the Step-2 VK
  must come from a circuit with exactly 9 pub inputs.
- **Verified locally**: host build, wasm build (53 KB), 5 adapter tests,
  12/13 core tests, fmt + clippy clean, SDK-25 wasm jobs unchanged.
- **CI changes**: `stellar/stellar-cli@v28` action added (SDK 28 refuses to
  cross-compile without a spec-shaking-aware build system — plain `cargo
  build --target wasm32v1-none` errors; local stellar CLI is v23, too old);
  verifier wasm now built via `stellar contract build --package
  ultrahonk-verifier`; the one fixture-dependent core test is `--skip`ped
  until Step 2 commits circuit artifacts.
- **Step 2 (done 2026-10-06)** — real corridor artifacts committed and
  E2E-verified. What it took (the toolchain downgrade surfaced real API
  deltas, not just comments):
  - `corridor-circuits` `m3/beta9-toolchain` `2feb370`: beta.9 rejects
    non-ASCII comment chars (28 errors — em dashes, box-drawing rules;
    comment-only rewrite); **poseidon retagged v0.3.0 → v0.2.6** (v0.3.0 uses
    post-beta.9 syntax: `@[]`, 1-arg `poseidon2_permutation`);
    **schnorr v0.4.0 vendored at `vendor/schnorr`** (noir-lang/schnorr @
    `9995bcc`) with the minimal beta.9 fixes — `EmbeddedCurvePoint` is a
    plain struct there (no `::new`, `is_infinite` is a field, not a method),
    and its poseidon dep retagged. v0.4.0 is kept (not downgraded) because
    the fixture and the SDK signer pin its scheme (`e = Poseidon2(DST, R.x,
    pk.x, pk.y, msg)`); proof: all 20 `nargo` tests pass, including every
    `conformance.nr` pinned vector, so **poseidon v0.2.6 is hash-identical
    to v0.3.0 at arities 1/2/4/5**.
  - Artifacts (bb `bytes_and_fields`): proof 14 592 B, VK 1 760 B,
    public_inputs 288 B = 9 × 32 B, matching the fixture's `PI_*` values
    word-for-word; natively accepted by `bb verify` 0.87.0. Committed under
    `tests/circuits/corridor_eligibility/target/{proof,vk,public_inputs}`.
  - **Toolchain provenance cross-check**: rebuilding upstream's
    `simple_circuit` with the same local nargo/bb reproduced upstream's
    pinned VK hash (`d3acde72ad73…`) byte-for-byte; that fixture is also
    committed, so the previously skipped `transcript::tests::
    test_transcript_determinism` now runs (its pinned eta digest matches).
  - `corridor-contracts` `3821160`: four adapter E2E tests on the real
    artifacts — real proof + real VK → `verify == true` through the full
    pipeline in the Soroban host; mutated proof (mid-proof byte flip) →
    `false`; truncated proof → `false`; swapped `PI` words (order drift) →
    `false`. These also pin the duplicated `PUB_INPUT_WORDS = 9` against the
    real circuit. `--skip` dropped from ci.yml/Makefile/README; **54 host
    tests** green, fmt + clippy clean. bb 0.87.0 also needs `jq` on PATH
    (it shells out for ACIR JSON parsing).
- **Step 3 (next)**: upgrade local stellar CLI (≥ 25.2, ideally v28), deploy the
  verifier to testnet with the real VK, `update_policy` `verifier` +
  `vk_hash`, run the `enter()` E2E through the SDK, update the four
  address-carrying places (§4 note above).

[NethermindEth/ultrahonk-rust-verifier]: https://github.com/NethermindEth/ultrahonk-rust-verifier

---

## 5. Traps / things to know

1. **`verifier_mock` returns `true` by default.** Every happy-path test trusts
   the mock. Real soundness starts at M3.

2. **The circuit does a real signature check now.** `eligibility::check` runs
   `schnorr::verify_signature` (Grumpkin, `noir-lang/schnorr` v0.4.0). The
   committed `fixture.nr` carries a real signature from the SDK signer; regen it
   with `cd corridor-sdk && npm run gen-fixture -- --write` (needs
   `corridor-circuits` checked out as a sibling). Nonces are deterministic
   (EdDSA-style) so the fixture is byte-stable.

3. **Grumpkin generator.** `GY = 0x02cf135e7506a45d632d270d45f1181294833fc48d823f272c`
   (the **even** root — Barretenberg's choice). Getting this wrong = "bad issuer
   signature" in-circuit. The SDK pins it and is checked against
   `noir-lang/schnorr`'s test vector.

4. **`holder_secret` is load-bearing.** It hides the holder AND makes nullifiers
   unlinkable. It must be CSPRNG (`randomSecret()` / `assertStrongSecret` in the
   SDK). The issuer only ever sees `holder_binding = Poseidon2([holder_secret,
   salt])`. Enforcing this in issuer tooling is **M5** (audit H5).

5. **Nullifier state rent.** `corridor_attestation` stores one persistent entry
   per pass; TTL ~2y, bumped on write and on `is_cleared`/`pass_record` reads.
   Don't let a nullifier expire while its credential could still be presented.

6. **Auditor mode is a commitment, not encryption.** `auditor_blob =
   Poseidon2([auditor_pubkey, tier, issuer_id, nullifier, auditor_nonce])`.
   `auditor_pubkey` is a **policy field** the contract binds (audit H4 fix), so
   the holder can't substitute their own. Real decryption = in-circuit ECIES,
   M7.

7. **`corridor.compact` compiles but is untested.** CI runs `compact compile`
   ("Compiling 6 circuits"). Owed (M4): simulator tests, Preprod deploy. On
   Windows use WSL — `compact` there is the real tool. It needs toolchain
   ≥ 0.34 (`compact update 0.34`); the `pragma` is `language_version >= 0.24`.

8. **`midnight/` is Option-B tooling now.** `deploy.ts` (deploy + atomic
   `initAdmin`), `issuer.ts` (`init`/`register`/`bump`/`deregister`),
   `read.ts` (dump issuers + epochs), `providers.ts` (shared setup). The
   counter/`enterCorridor` scaffolding is gone. `npm run typecheck` covers it.
   The Midnight SDK import is slow (~30s WASM init) — that's normal, not a hang.
   `@midnight-ntwrk/compact-runtime` in `package.json` (0.16) lags the compiler
   output (runtime 0.19), so don't `import()` the compiled `contract/index.js`
   outside the deploy scripts until the SDK line is bumped.

9. **The frontend lives in `web/`** (Vite + React + `@stellar/stellar-sdk`).
   `../vercel.json` builds it (`npm --prefix web`). It reads the live testnet
   deployment and has an operator `is_cleared` checker. Favicon is
   `web/public/favicon.svg` (copied from `assets/`). After a contract redeploy,
   update `web/src/config.ts`. The old orphaned Vite build (🌑 favicon) is
   replaced on the next Vercel deploy.

10. **Windows GNU linker.** `corridor-contracts/.cargo/config.toml` adds
    `-Wl,--exclude-all-symbols` to get past `ld`'s "export ordinal too large" on
    soroban-sdk. Harmless on Linux CI. `cargo test` first build is ~6 min.

11. **No Claude attribution in commits** (maintainer's standing instruction).

12. **The bb toolchain pin is load-bearing and silent.** The vendored
   verifier targets Barretenberg **v0.87.0** / `UltraKeccakFlavor` (Noir
   1.0.0-beta.9); corridor-circuits pins Noir 1.0.0-beta.26 / bb
   5.0.0-nightly.20260522. A bb mismatch is NOT caught by the proof-length
   check — it fails at the transcript/pairing stage, i.e. every real proof
   silently fails to verify. Prove with bb 0.87.0 (M3 step 2) or coordinate
   a core bump. See `crates/ultrahonk_core/VERIFIER_PROVENANCE.md`.

---

## 6. Brand / org

- `assets/` has `logo.svg` + PNGs (512/256/128) + `favicon.svg`/`.png`. The mark
  is a lit passage receding to a point, teal→blue on `#0A0F1C`.
- **Org avatar and repo social previews have no GitHub API** — upload manually:
  org avatar at `github.com/organizations/Sconce-Labs/settings/profile`
  (`logo.png`); per-repo social preview in each repo's Settings.
- The `web/` frontend uses `web/public/favicon.svg` (the real mark). The old
  deployed 🌑 placeholder is gone once the new `web/` build ships to Vercel.

---

## 7. Drips Wave — owner action

The engineering side is ready: 4 active repos, CI green, ~25 scoped
`drips`-labelled issues ([`docs/DRIPS_ISSUES.md`](./docs/DRIPS_ISSUES.md)), org
profile, deployed on testnet. Remaining is procedural:

1. **Complete KYC/KYB** on the Drips Wave account — it is a prerequisite for any
   reward payout ([Wave terms](https://docs.drips.network/wave/terms-and-rules/)).
2. **Install the Drips Wave GitHub App** on the `Sconce-Labs` org, sync, and
   **apply the repos** when the next Stellar Wave opens for scoping (monthly;
   Wave 8 was Aug 24–31 2026). Cap is 5 repos per org — apply `corridor`,
   `corridor-contracts`, `corridor-circuits`, `corridor-sdk`. **Do not** apply
   `corridor-relayer` (archived).
3. **Positioning** — lead with *Stellar-native zkKYC / portable proof of
   eligibility*. It's the only project of its kind on the Wave (the privacy
   projects there — Wraith, Sub-Rosa — do payment-graph privacy and sealed
   markets, not eligibility). It also maps directly onto Stellar's own stated
   ZK priorities (their dev blog names "zkKYC" as a flagship use case).
4. **Be precise about the mock verifier** in the application — "policy binding
   live on testnet; UltraHonk verification is M3." The Wave funds closing that
   gap (issue `corridor-contracts#1`); overselling it is the one avoidable risk.
5. Midnight is a *small, real* part of the story (a public issuer registry that
   compiles in CI, M4 for Preprod) — mention it, don't lead with it.

---

## 8. Immediate next actions (engineering)

1. **M3 step 3** — steps 1–2 are committed on `m3/scaffold-verifier`
   (`6f275d4` + `3821160`): the vendored OZ-audited core + adapter, and the
   re-proven circuit with committed fixtures that E2E-verify (see the M3
   section in §4; circuit-side work on `m3/beta9-toolchain` `2feb370`). All
   unpushed. Next: testnet deploy + `vk_hash` policy + `enter()` E2E (needs
   local stellar CLI ≥ 25.2 — installed v23 lacks the SDK-28 spec-shaking
   handshake).
2. **M4** — `corridor.compact` simulator tests + Preprod deploy; trim
   `midnight/` to the issuer/admin flows.
3. **M5** — issuer CLI: KYC result → `issueCredential`, with CSPRNG enforcement.
4. **M6** — the fee-sponsoring tx-relayer (`docs/TX_RELAYER.md`), then wire the
   `web/` site's checker to a full holder flow.

_M1 (Stellar core) and M2 (Option B circuit + testnet redeploy) are done — the
stack is live at the addresses in §4._
