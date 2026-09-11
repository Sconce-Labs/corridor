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
| Real UltraHonk verifier | corridor-contracts | ❌ | wire `indextree/ultrahonk_soroban_contract` (M3) |
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

1. **M3 start** — vendor `indextree/ultrahonk_soroban_contract` into
   `corridor-contracts/contracts/ultrahonk_verifier` behind the `Verifier`
   interface; generate the VK from the circuit; deploy it; set `vk_hash` on a
   test policy; end-to-end proof (from `buildWitness`) → `enter` on testnet.
2. **M4** — `corridor.compact` simulator tests + Preprod deploy; trim
   `midnight/` to the issuer/admin flows.
3. **M5** — issuer CLI: KYC result → `issueCredential`, with CSPRNG enforcement.
4. **M6** — the fee-sponsoring tx-relayer (`docs/TX_RELAYER.md`), then wire the
   `web/` site's checker to a full holder flow.

_M1 (Stellar core) and M2 (Option B circuit + testnet redeploy) are done — the
stack is live at the addresses in §4._
