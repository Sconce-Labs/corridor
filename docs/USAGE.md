# Using Corridor

Three audiences: **holders** (prove eligibility), **corridor operators**
(consume proofs), **issuers** (sign credentials). This guide tracks the target
flow; items marked _(M#)_ aren't built yet — see [`../ROADMAP.md`](../ROADMAP.md).

---

## Holder — prove you're cleared to a corridor

**You need:** your Corridor credential (an issuer signature + your
`holder_secret`), a browser, and the corridor operator's app URL.

1. **Get a credential once.** An accredited issuer runs your KYC (off-chain,
   once) and hands you a signed statement:
   `{ tier, expiry, cred_epoch, salt, issuer_pubkey, signature }`. You keep it,
   plus a `holder_secret` your tooling generated with a CSPRNG. You never upload
   documents again, and the issuer never learns your `holder_secret` — only
   `holder_binding = Poseidon2(holder_secret, salt)`.
2. **Open the corridor.** In the operator's app, choose the corridor and the
   payment you want to make.
3. **Generate the proof.** The app reads the corridor's policy (minimum tier,
   accepted issuers, `min_cred_epoch`, auditor key) and the SDK's `buildWitness`
   assembles a witness — re-checking every constraint locally first. Proving
   runs on your device. _(M6)_
4. **Submit.** The proof goes to Stellar through a fee-sponsoring tx-relayer, so
   your own Stellar account is never linked to the pass. _(M6)_
5. **Done.** The corridor records a pass and releases your payment. On-chain,
   anyone can see "a pass was granted, tag `remittance`" — never that it was
   you. (The tag is a corridor category label the app picks; it is **not** a
   verified attribute.)

**What's proved vs. private**

| Proved (corridor learns) | Private (nobody learns) |
|--------------------------|-------------------------|
| You hold a valid issuer signature for tier ≥ the minimum | Your name, documents, exact tier |
| It was signed by an accepted issuer | Which issuer, for you specifically |
| It isn't expired and its epoch is ≥ the corridor's floor | Your identity, wallet address |
| A one-time nullifier for *this* corridor | Your activity on other corridors |

---

## Corridor operator — gate payouts on eligibility

**You need:** a Stellar account, the `corridor_registry` and
`corridor_attestation` addresses (see [`../README.md`](../README.md)), and a
verifier address + VK hash.

1. **Register a policy:**
   ```
   corridor_registry.register(corridor_id, CorridorPolicy {
     operator, accepted_issuers, min_tier, required_disclosures,
     min_cred_epoch, verifier, vk_hash, auditor_pubkey,
     now_tolerance_secs: 300, paused: false,
   })
   ```
   `accepted_issuers` holds `Poseidon2(pk.x, pk.y)` ids — the same ids the
   Midnight registry lists.
2. **Track revocation.** Watch each accepted issuer's epoch on
   `corridor.compact` (`issuerEpoch`); when an issuer bumps it, raise your
   policy's floor with `corridor_registry.set_min_cred_epoch(corridor_id, epoch)`
   (monotonic — it rejects a lower value).
3. **Gate your payout.** In your existing payout contract, before releasing
   funds:
   ```
   if !corridor_attestation.is_cleared(corridor_id, nullifier) { revert }
   ```
   The holder's app gives you the `nullifier` alongside the payment request.
4. **Operate.** Watch `PASS` events for volume; `corridor_registry.set_paused`
   is your kill switch.

---

## Issuer — sign a credential

**You need:** to be registered by the Corridor admin (`registerIssuer` on
`corridor.compact`, with the id `Poseidon2(pk.x, pk.y)` of your Grumpkin key),
your Grumpkin signing key, and a Midnight control secret.

1. Run your KYC process off-chain, once, as you do today.
2. The holder's tooling sends you a **`CredentialRequest`** — the blinded
   `holderBinding = Poseidon2(holderSecret, salt)` plus the attributes you
   verified. **You never receive `holderSecret`.** Sign with the SDK:
   ```
   issueCredential(issuerPrivateKey, request)
   // request   = { holderBinding, tier, expiry, credEpoch }
   // → statement = { tier, expiry, credEpoch, issuer: { pubkeyX, pubkeyY, sLo, sHi, eLo, eHi } }
   ```
   Use a **short `expiry`** — days, not years.
3. Hand the signed statement back to the holder (they run `assembleCredential`).
4. **To bulk-revoke** everything you signed under an old epoch: bump your epoch
   on `corridor.compact` (`bumpEpoch(issuerCtl, issuerId, newEpoch)`), then tell
   your corridors. Individual revocation = just stop re-signing that holder.

You are **not** a data custodian for any downstream corridor. They see a proof,
never a document.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `PolicyNotFound` | corridor not registered / wrong `corridor_id` | check the id with the operator |
| `CredEpochMismatch` | proof's `min_cred_epoch` ≠ the policy's | regenerate the proof against the current policy |
| `MinTierMismatch` | policy `min_tier` changed | regenerate the proof against the current policy |
| `StaleProofTime` | proof `now` outside the tolerance window | regenerate; check your device clock |
| `NullifierUsed` | this credential already passed this corridor | expected — one pass per credential per corridor |
| `IssuerNotAccepted` | your issuer isn't on this corridor's allowlist | use a credential from an accepted issuer |
| `ProofInvalid` | proof/verifier/VK mismatch, or a tampered proof | confirm the app is pointed at the right verifier + VK |
| `bad issuer signature` (local, before proving) | wrong issuer key, tampered statement, or expired/low-epoch credential | `verifyWitnessLocally` names the failed check |
