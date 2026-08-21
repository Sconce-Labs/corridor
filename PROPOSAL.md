# Product Proposal

## What is the product, and who uses it?

Corridor is a portable proof of eligibility that lets someone move through a
payment corridor showing only that they're cleared to pass — never who they are.

**Who uses it:**

- **Migrant workers** who send remittances through Stellar-based anchors. Today
  they upload a passport scan and liveness selfie to every new provider — each
  one now holds a copy of their identity documents. Corridor lets them prove
  "I hold a valid KYC Tier 2 credential" once, then reuse that proof across
  any number of corridors without re-uploading anything.

- **Aid recipients** in regions served by multiple NGOs. Each organization runs
  its own KYC onboarding. Corridor lets an issuer verify once, and every
  participating NGO can gate disbursements to verified recipients without
  holding identity documents.

- **Regulated issuers** — banks, licensed KYC providers, NGOs — who want to
  issue verifiable credentials without becoming data custodians for every
  consuming service. Corridor gives them a way to issue once and let the
  credential be used privately across multiple downstream consumers.

- **Stellar service providers** — remittance corridors, lending pools, aid
  disbursement platforms — who need to verify eligibility but don't want the
  liability of holding identity data. They receive a ZK proof, not a document.

## Why Midnight specifically?

Transparent chains treat "proving you're eligible" and "revealing your entire
identity" as the same act. On Ethereum, Solana, or even Stellar's base layer,
a credential presentation is a public transaction — anyone can see who
presented what to whom. Midnight's confidential-logic layer solves this at the
protocol level:

1. **Private witnesses stay private.** The entitlement value (the credential
   claim) is a private circuit input — it never touches the ledger. The circuit
   proves the claim is valid without ever writing it on-chain.

2. **Selective disclosure is native.** The `disclose()` primitive lets the
   contract author choose exactly which data points become public (here, just
   an entry tag and an aggregate counter). On a transparent chain, you'd need
   custom encryption or off-chain attestations to achieve the same.

3. **Proofs are user-generated.** The ZK proof is generated locally in the
   browser wallet — Midnight's DApp connector API feeds the private witness
   into the prover, and only the proven statement reaches the chain. This means
   no custodian ever holds the raw credential during the proof step.

4. **Settlement is separate from identity.** Corridor pairs Midnight (identity
   and proof logic) with Stellar (money movement). Neither chain is asked to
   do the other's job. A transparent chain would force either the identity
   work or the settlement into a less suitable environment.

**In short:** a transparent chain would require Corridor to encrypt
credentials off-chain, manage key distribution, and trust relayers not to
decrypt. Midnight makes all of that unnecessary — privacy is a property of
the circuit, not an application-layer patch.

## Data Model

| Data Point          | Type            | Disclosed To           |
|---------------------|-----------------|------------------------|
| `passes`            | Public ledger   | Everyone (on-chain)    |
| `lastEntryTag`      | Public ledger   | Everyone (on-chain)    |
| `entitlement`       | Private witness | No one (wallet only)   |
| Caller identity     | Not stored      | No one (shielded proof)|
| Credential details  | Not stored      | No one (off-chain)     |

**What an on-chain observer sees:** that *someone* entered the corridor, which
entry tag they disclosed (e.g. `"tier-2-pass"`), and that the aggregate pass
count incremented by 1.

**What an on-chain observer cannot see:** the caller's wallet address (the
proof is shielded), the entitlement value, the caller's identity, or any
credential details. The zero-knowledge proof is generated locally in the
browser — the private input never leaves the user's device.

## Mainnet Feasibility

**Realistic for Level 6 mainnet target?** Yes, with scoped expectations.

Corridor's core circuit — a single private witness checked against a public
threshold, with one deliberate disclosure — is deliberately minimal. The
Compact contract compiles, the in-memory simulator validates all state
transitions, and the deployed testnet version proves the end-to-end flow
works: wallet connects, proof generates locally, transaction submits on-chain,
and the ledger updates without exposing the private input.

**What's needed for mainnet:**

1. **Issuer infrastructure.** A real KYC provider or bank must issue
   credentials onto Midnight. This is an integration partnership, not a
   protocol problem — the circuit already handles credential verification.

2. **Relayer for Stellar settlement.** The component that carries a Midnight
   proof into a Soroban attestation is, at this stage, a small, auditable,
   federated component — a labeled trust assumption, not a solved
   cryptographic bridge. Auditing and potentially decentralizing this is
   Level 5–6 scope.

3. **Multi-credential support.** The current circuit handles one claim type
   (`entitlement > 0`). A production version would support tiered credentials,
   expiration, and revocation — all expressible in Compact without changing
   the privacy model.

4. **Lace wallet maturity.** The DApp Connector API is stable but still
   evolving. Mainnet readiness depends on the wallet supporting production
   key management and transaction signing.

**Honest assessment:** Corridor is not a finished trust-minimized bridge, and
should not be presented as one. It is a working proof of concept that
demonstrates Midnight's confidential-logic layer solving a real problem
(portable KYC) that transparent chains handle poorly. The mainnet path is
clear — the hard work is partnerships and auditing, not protocol changes.
