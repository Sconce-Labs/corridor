# Corridor Protocol — Threat Model & Security Architecture

_Status: Approved for Milestone M3/M6 implementation (Stellar-native; issuer-signed statements architecture)._
_Reference Issue: [#7](https://github.com/Sconce-Labs/corridor/issues/7)_

This document formally specifies the threat model for the **Corridor** protocol. It defines the core assets, trust boundaries, adversary classes and attack capabilities, per-layer vulnerability vectors, defensive mitigations, and explicit pre-mainnet out-of-scope conditions.

---

## 1. System Overview & Trust Domains

Corridor decouples KYC credential issuance from payment corridor admission using zero-knowledge proofs on Stellar/Soroban (with client-side Noir/UltraHonk provers) and Grumpkin Schnorr signatures over Poseidon2 statement hashes.

### Core Assets Requiring Protection

1. **Holder Privacy & Unlinkability**: Anonymity of the holder across distinct corridors and multiple transactions within the same corridor (excluding regulator warrant openings).
2. **Credential Integrity & Authenticity**: Guarantee that only KYC-cleared entities possessing a valid Schnorr signature from an active, recognized issuer can generate verifiable proofs.
3. **Double-Spend & Replay Resistance**: Prevention of multi-spend or replay attacks within a corridor via single-use nullifiers (`nullifier = Poseidon2([holder_secret, corridor_id, epoch])`).
4. **Policy Enforcement Soundness**: Invariant that `min_tier`, `expiry`, `min_cred_epoch`, and corridor-specific admission parameters are strictly satisfied before `PassGranted` attestation.
5. **State Availability & Rent Continuity**: Protection against ledger TTL expiration / contract archival on Soroban persistent storage entries.

---

## 2. Adversary Models & Attack Vectors

The Corridor protocol models five primary adversary profiles:

### 2.1. Dishonest Relayer (`ADV-RELAYER`)
* **Profile**: An untrusted or compromised third-party fee-sponsoring node operating the `tx-relayer` service that submits `enter(proof, public_inputs)` transactions on behalf of holders.
* **Capabilities**:
  * Can inspect incoming RPC payloads before submission to the Stellar Horizon/RPC network.
  * Can attempt transaction front-running, censorship (dropping transactions), or transaction replay.
  * Can correlate IP addresses, timestamps, and network-level metadata with submitted nullifiers.
* **Mitigations**:
  * **Zero Sensitive Payload Leakage**: The client submits only zero-knowledge UltraHonk proofs and public inputs (`corridor_id`, `nullifier`, `issuer_pk`, `expiry`, `min_tier`, `auditor_ciphertext`). The holder's identity (`holder_secret`, raw KYC documents) never leaves the client device.
  * **Relayer Front-Running Neutralization**: The public nullifier is deterministic per credential and corridor. If a relayer attempts to front-run or hijack an `enter` call by changing the recipient address, the proof verification fails because the recipient/payout destination is cryptographically committed in the public inputs.
  * **Multi-Relayer Redundancy**: The protocol allows holders to bypass censorious relayers by direct submission, using alternate relayers, or self-sponsoring lumens.

### 2.2. Malicious Holder (`ADV-HOLDER`)
* **Profile**: A rogue user possessing a valid, expired, or revoked credential, or an unverified attacker attempting unauthorized access.
* **Capabilities**:
  * Attempts to fabricate false credentials without a valid issuer private key.
  * Attempts double-spending or multi-clearing within a corridor using a single credential.
  * Attempts credential sharing or token transfer to an un-cleared third party.
  * Attempts to present credentials with revoked `cred_epoch` or past `expiry`.
* **Mitigations**:
  * **Poseidon2 & Grumpkin Schnorr Binding**: The circuit enforces mathematical knowledge of `(s, e)` satisfying `Schnorr_verify(issuer_pk, statement)`. Forging this requires breaking discrete log over the Grumpkin curve (~128-bit security).
  * **Nullifier Archival & Burning**: The Soroban `corridor_attestation` contract records `Nullifier(nullifier_hash)` in persistent storage upon each successful `enter()`. Second invocations abort immediately with `NullifierAlreadySpent`.
  * **Holder Secret Binding**: Credentials commit to `holder_binding = Poseidon2([holder_secret, salt])`. Sharing a credential requires giving away the root `holder_secret`, deterring casual credential leasing.

### 2.3. Compromised Issuer Key (`ADV-ISSUER-KEY`)
* **Profile**: An attacker who exfiltrates the private key (`issuer_grumpkin_sk`) of a regulated KYC issuer or a corrupt issuer signing rogue credentials.
* **Capabilities**:
  * Can mint arbitrary validly-signed statements for non-KYC'd or sanctioned identities.
* **Mitigations**:
  * **Epoch-Based Bulk Revocation (`min_cred_epoch`)**: Corridor corridors enforce `statement.cred_epoch >= corridor.min_cred_epoch`. When an issuer key is compromised, the operator/governance advances `min_cred_epoch` (or revokes the issuer key in `corridor_registry`), instantly invalidating all legacy credentials signed under that key without requiring an on-chain blacklist of individuals.
  * **Issuer Registry Curation**: The `corridor_registry` contract maintains an allowlist of authorized `issuer_pks`. Admin can toggle `set_issuer_status(issuer_pk, false)` to halt all proofs deriving from the compromised entity.

### 2.4. Compromised Auditor Key (`ADV-AUDITOR-KEY`)
* **Profile**: An adversary gaining unauthorized access to the regulatory auditor decryption key used for targeted compliance openings.
* **Capabilities**:
  * Can decrypt `auditor_blob` (containing selective attribute disclosure) included in the public input of submitted passes.
* **Mitigations**:
  * **Forward Secrecy & Isolated Blast Radius**: Compromising the auditor key allows reading disclosed metadata for submitted passes, but **never enables forged proofs, private key extraction, or holder impersonation**.
  * **No Raw Identity in Blob**: The `auditor_blob` contains only the encrypted credential hash and issuer identifier (enabling a subpoena to the original issuer), rather than plaintext identity records or biometric files.

### 2.5. Verifier Soundness Bug (`ADV-SOUNDNESS`)
* **Profile**: A flaw in the Noir constraint synthesis, the UltraHonk proof system, or the Soroban on-chain verifier wrapper.
* **Capabilities**:
  * Potential generation of accepting proofs for invalid public input tuples or unsatisfied constraints.
* **Mitigations**:
  * **Canonical Verifier Registry**: The `corridor_contracts` architecture separates the verifier into an admin-curated registry with delayed or monotonic version upgrades (preventing instant malicious swaps).
  * **Contract-Level Sanity Bounds**: Soroban contracts enforce redundant, defense-in-depth boundary checks outside the circuit (e.g., verifying `expiry >= current_ledger_time`, `min_cred_epoch >= policy.min_cred_epoch`).
  * **Formal Circuit Verification & Testnet Fuzzing**: Exhaustive constraint checking on public-input decoding and witness generation.

---

## 3. Per-Layer Attacks & Mitigations

| Layer | Attack Surface | Attack Mechanism | Implemented Mitigation |
| :--- | :--- | :--- | :--- |
| **Circuit (Noir / UltraHonk)** | Constraint underflow / witness injection | Unconstrained private inputs allow witness malleability. | All private inputs (`holder_secret`, `salt`, `statement`, Schnorr signature components) are strictly constrained in circuit assertions with exhaustive regression test suites. |
| **Circuit** | Signature Malleability | Modifying Schnorr signature representation without invalidating validation. | Strict canonical range constraints on Schnorr scalar and field elements in `noir-lang/schnorr` v0.4.0. |
| **Soroban Contracts** | Storage TTL Expiry / Archival | Long-quiescent corridor policies being archived, causing `enter()` to fail with `PolicyNotFound`. | All read entrypoints (`get_policy`, `enter`) invoke `extend_ttl` on `Policy(corridor_id)` entries (Audit R2-M2). |
| **Soroban Contracts** | Reentrancy / State Desync | Reentering `enter()` prior to nullifier registration. | Nullifier storage writes occur atomically prior to attestation events; Soroban runtime architectural reentrancy guards enforced. |
| **Relayer / RPC** | Denial of Service (DoS) | Flooding the relayer with malformed proofs to exhaust fee sponsorship. | Relayer conducts off-chain local proof verification pre-flight (`@corridor/verify`) prior to submitting on-chain Stellar transactions. |

---

## 4. Explicitly Out of Scope Before Mainnet

The following threat vectors and scenarios are explicitly acknowledged as **out of scope** for pre-mainnet testnet milestones (M1–M6) and will be hardened prior to production mainnet deployment:

1. **Client Endpoint Device Compromise**: If an attacker installs malware or physical keyloggers on the holder's personal hardware and steals `holder_secret`, credential security is assumed forfeit.
2. **Network-Level ISP Traffic Analysis**: Timing correlation between a user's local prover invocation and the relayer's transaction broadcast over open internet routing (mitigated in production by Onion/Tor routing or randomized submission delays).
3. **Decentralized Relayer Collusion / Sybil Pools**: The initial M6 relayer operates as a monitored service with rate-limiting; a full decentralized relayer staking network is scheduled for Milestone M8.
4. **Quantum-Cryptographic Attacks**: Grumpkin Schnorr signatures and BN254 UltraHonk pairings do not provide post-quantum security guarantees against Shor's algorithm.
EOF
