# Using Corridor

Three audiences: **holders** (prove eligibility), **corridor operators**
(consume proofs), **issuers** (write credentials). This guide tracks the target
flow; items marked _(M#)_ aren't built yet — see [`../ROADMAP.md`](../ROADMAP.md).

---

## Holder — prove you're cleared to a corridor

**You need:** a Midnight-capable wallet with your Corridor credential, a browser,
and the corridor operator's app URL.

1. **Get a credential once.** An accredited issuer runs your KYC (off-chain,
   once) and records a *commitment* on Midnight. Your wallet stores the secret
   and attributes — they never leave your device. You never upload documents
   again.
2. **Open the corridor.** In the operator's app, choose the corridor and the
   payment you want to make.
3. **Generate the proof.** The app reads the corridor's policy (minimum tier,
   accepted issuers, current credential root) and your wallet builds a
   zero-knowledge proof that your credential satisfies it. This runs locally —
   a progress bar shows proving. _(M6)_
4. **Submit.** The proof goes to Stellar through a fee-sponsored relayer, so
   your own Stellar account is never linked to the pass. _(M6)_
5. **Done.** The corridor records a pass and releases your payment. On-chain,
   anyone can see "a pass was granted, tag `tier-2-remit`" — never that it was
   you.

**What's proved vs. private**

| Proved (corridor learns) | Private (nobody learns) |
|--------------------------|-------------------------|
| You hold a valid credential of tier ≥ the minimum | Your name, documents, exact tier |
| It was issued by an accepted issuer | Which issuer, for you specifically |
| It isn't expired or revoked | Your identity, wallet address |
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
     verifier, vk_hash, now_tolerance_secs: 300, paused: false,
     // root fields start empty — the relayer fills them
   })
   ```
2. **Keep roots fresh.** Run the relayer _(M5)_ or call `post_root` yourself
   whenever the Midnight epoch advances.
3. **Gate your payout.** In your existing payout contract, before releasing
   funds:
   ```
   if !corridor_attestation.is_cleared(corridor_id, nullifier) { revert }
   ```
   The holder's app gives you the `nullifier` alongside the payment request.
4. **Operate.** Watch `PASS` events for volume; `corridor_registry.set_paused`
   is your kill switch.

---

## Issuer — write a credential

**You need:** to be registered by the Corridor admin (`registerIssuer`), your
issuer secret, and a Midnight wallet.

1. Run your KYC process off-chain, once, as you do today.
2. Compute the commitment:
   `Poseidon2(holderSecret, tier, expiry, issuerId, salt)` — the holder's
   wallet supplies `holderSecret` and `salt` (via the issuer CLI _(M6)_); you
   never see raw identity data after this step.
3. Call `issueCredential(issuerSk, commitment)` on `corridor.compact`.
4. To revoke later: `revokeCredential(issuerSk, Poseidon2(commitment))`.

You are **not** a data custodian for any downstream corridor. They see a proof,
never a document.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `PolicyNotFound` | corridor not registered / wrong `corridor_id` | check the id with the operator |
| `RootMismatch` | your proof used an old credential root | refresh — the relayer posted a new epoch; regenerate the proof |
| `MinTierMismatch` | policy `min_tier` changed | regenerate the proof against the current policy |
| `StaleProofTime` | proof `now` outside the tolerance window | regenerate; check your device clock |
| `NullifierUsed` | this credential already passed this corridor | expected — one pass per credential per corridor |
| `IssuerNotAccepted` | your issuer isn't on this corridor's allowlist | use a credential from an accepted issuer |
| `ProofInvalid` | proof/verifier/VK mismatch, or a tampered proof | confirm the app is pointed at the right verifier + VK |
