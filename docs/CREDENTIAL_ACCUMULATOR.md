# Credential accumulator & revocation — architecture decision

**Status: NEEDS SIGN-OFF.** This resolves audit findings **C1** (revocation
non-functional) and **C4** (cross-chain hash mismatch). It changes how
credentials are issued and how the circuit proves inclusion. Nothing below is
built yet — the current `corridor.compact` + circuit revocation logic is known
broken and must be replaced with whichever option is chosen here.

---

## The problem (C4)

The design assumed Midnight and the Noir circuit could share a Merkle root:
Midnight builds the credential tree, a relayer copies the root to Stellar, the
circuit proves inclusion against it.

That cannot work. Verified from the toolchains:

| Layer | Field | Tree hash |
|-------|-------|-----------|
| Midnight / Compact | **BLS12-381** scalar (`Scalar<BLS12-381>`) | `transientHash` (Jubjub/BLS-based) |
| Noir circuit / UltraHonk | **BN254** Fr | Poseidon2 (BN254) |
| Stellar Protocol 25 | **BN254** (pairing, Poseidon2) | Poseidon2 (BN254) |

A Merkle root computed over BLS12-381 is a BLS12-381 field element. The Noir
circuit computes over BN254. **The roots are values in different fields and can
never be equal**, regardless of hash choice. Implementing "the same Poseidon2"
on both sides does not help — the field is wrong.

So a Midnight-built tree cannot be the thing the circuit proves against.

## The problem (C1)

Independently: `corridor.compact` stores `revoked` as an **append-only**
`MerkleTree` (insert-at-next-index). The circuit proves non-revocation by
checking a **sparse position** derived from the commitment. A revoked
credential's sparse position is still empty (the revocation was appended
elsewhere), so **every credential proves non-revoked**. Revocation is a no-op.

Non-membership needs a sparse Merkle tree or an indexed Merkle tree — neither is
what Compact's `MerkleTree` provides, and (per C4) it would be in the wrong
field anyway.

---

## Options

### Option A — Accumulator on Stellar; Midnight does confidential issuance

- The credential-set accumulator (BN254 Poseidon2, an **indexed Merkle tree**)
  is a **Soroban contract** on Stellar.
- Issuance: the issuer runs KYC (off-chain, or confidentially on Midnight),
  then submits `commitment` to the Stellar accumulator. No relayer, no
  cross-chain root sync — the circuit and the accumulator are on the same
  chain, same field.
- Revocation: the same IMT (flip a leaf flag) or a companion revocation IMT.
  Non-membership is a low-leaf range proof.
- Midnight's role shrinks to: (a) confidential KYC attestation — a Compact
  circuit proves "valid KYC was performed" without revealing the documents, and
  gates the issuer's submission; or (b) storage of the holder's encrypted
  credential material. **Midnight is optional for v1.**

**Pros:** one field everywhere; the relayer + its trust assumptions disappear;
scales to large credential sets; on-chain verifiable accumulator.
**Cons:** the "hybrid Midnight + Stellar" story weakens to "Stellar-native, with
optional Midnight-side confidentiality"; issuers pay Stellar fees per issuance.

### Option B — Issuer-signed statements (no shared tree) ★ recommended

- No credential Merkle tree at all. The issuer signs
  `{ commitment, tier, expiry, cred_epoch }` with an **EdDSA key on Baby Jubjub**
  (BN254-embedded, cheap to verify in Noir — ~a few thousand constraints).
- The circuit verifies: the issuer signature, `issuer_pubkey ∈
  policy.accepted_issuers`, `tier ≥ min_tier`, `expiry > now`, the nullifier,
  the tag, the auditor blob.
- Revocation, in preference order:
  1. **Short `expiry` + re-issuance.** The issuer simply stops re-signing a
     revoked credential. Zero on-chain revocation infra. `expiry` of days–weeks.
  2. **Signed revocation epoch.** The issuer publishes a monotonically
     increasing `min_cred_epoch` per issuer; the circuit checks
     `cred_epoch ≥ min_cred_epoch`. Bulk-revokes everything older; not
     targeted.
  3. **Small on-Stellar revocation IMT** for targeted revocation, non-membership
     via low-leaf proof. Only if 1–2 are insufficient.
- Midnight's role: run KYC confidentially; the Baby Jubjub signing key can be
  held behind a Compact circuit that only signs after a valid KYC proof.

**Pros:** simplest; this is how real-world verifiable credentials work (mDL,
EUDI wallet, BBS+); no accumulator to maintain or sync; no relayer for
issuance; targeted revocation optional.
**Cons:** per-credential signature; issuer key management; "portable" now means
"re-present the signed statement" rather than "prove tree membership".

### Option C — keep the two-chain tree, bridge with a proof

Midnight keeps its native tree; a Midnight circuit proves membership+non-revocation
and that proof is verified — recursively or via a second attestation — into a
BN254 statement the Stellar circuit consumes. Proof-carrying data.

**Pros:** preserves the original vision.
**Cons:** heavy (recursive proving), immature tooling, months of work, still
needs the relayer. Not recommended for the pilot.

---

## Recommendation

**Option B, revocation strategy 1 (short expiry) for the pilot**, with strategy 3
(revocation IMT) designed but deferred.

Rationale: it removes the relayer, the cross-chain sync, and the accumulator —
i.e. it removes findings C1, C2, C4, and H1–H2 in one move. It matches how
regulated credential systems actually work. The circuit gets *simpler*
(signature check instead of a 32-deep Merkle path). Midnight stays in the story
as the confidential-issuance layer, which is its real strength, instead of being
forced to share a Merkle root it cannot.

If large-scale, long-lived credentials with targeted revocation become a hard
requirement, move to Option A.

## What changes if we adopt B

| Repo | Change |
|------|--------|
| corridor-circuits | replace Merkle inclusion with Baby Jubjub EdDSA verification; drop `cred_siblings` / `rev_siblings`; add `issuer_sig`, `issuer_pubkey` (private), `cred_epoch` |
| corridor-contracts | `CorridorPolicy.accepted_issuers` becomes a set of issuer **public keys**; drop `credential_root` / `revocation_root` / `root_epoch`; `enter()` checks `pi.issuer_pubkey ∈ accepted`; the registry loses `post_root` and the relayer allowlist |
| corridor.compact | becomes the **issuer KYC-attestation** contract: a circuit that verifies a KYC proof and authorises a Baby Jubjub signature; no credential tree |
| corridor-relayer | **deleted** (or repurposed as the fee-sponsoring tx-relayer, which is a different, still-needed service — see audit H1) |
| corridor-sdk | `buildWitness` assembles the signature statement; issuer SDK signs |
| ABI | public inputs change: drop the two roots, add `issuer_pubkey`, `cred_epoch` |

## Interim (already done, independent of this decision)

- The circuit's **revocation logic has been rewritten as a proper indexed
  Merkle tree** (low-leaf non-membership) in `corridor-circuits` — sound on the
  BN254 side regardless of which option is chosen, and reusable as Option A's
  accumulator or Option B strategy 3.
- `post_root` is now behind an admin allowlist (C2) — a stopgap that Option B
  removes entirely.
