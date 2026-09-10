#![no_std]
//! Shared types and cross-contract interfaces for Corridor on Stellar.
//!
//! This crate is the ABI seam between three moving parts:
//!   * the Noir circuit  — produces `public_inputs` in the layout below
//!   * `corridor_registry` — stores [`CorridorPolicy`] per corridor
//!   * `corridor_attestation` — decodes public inputs, calls a [`Verifier`],
//!     and records a [`PassRecord`]
//!
//! Changing the public-input layout means changing the circuit AND the
//! `PI_*` indices here in the same PR.

use soroban_sdk::{contractclient, contracterror, contracttype, Address, Bytes, BytesN, Env, Vec};

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotAuthorized = 3,
    PolicyNotFound = 4,
    PolicyPaused = 5,
    PolicyExists = 6,
    RootMismatch = 7,
    CorridorMismatch = 8,
    MinTierMismatch = 9,
    StaleProofTime = 10,
    ProofInvalid = 11,
    NullifierUsed = 12,
    IssuerNotAccepted = 13,
    BadPublicInputs = 14,
    RootEpochRegression = 15,
}

// ─────────────────────────────────────────────────────────────────────────────
// Policy + records
// ─────────────────────────────────────────────────────────────────────────────

/// The policy a corridor operator registers in `corridor_registry`.
///
/// `credential_root` / `revocation_root` / `root_epoch` are *not* set by the
/// operator directly — they are synced from Midnight via
/// [`RegistryInterface::post_root`].
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CorridorPolicy {
    /// Who may pause / update this policy.
    pub operator: Address,
    /// Issuer ids this corridor accepts (checked against `PublicInputs::issuer_id`).
    pub accepted_issuers: Vec<BytesN<32>>,
    /// Minimum KYC tier required to pass (must equal the circuit's `min_tier`).
    pub min_tier: u32,
    /// Bitmask of disclosures the corridor requires the holder to include.
    pub required_disclosures: u32,
    /// Midnight credential-set Merkle root (synced).
    pub credential_root: BytesN<32>,
    /// Midnight revocation-set Merkle root (synced).
    pub revocation_root: BytesN<32>,
    /// Monotonic epoch of the synced roots.
    pub root_epoch: u64,
    /// Address of the ZK verifier contract this corridor trusts.
    pub verifier: Address,
    /// Hash of the verification key pinned for this corridor.
    pub vk_hash: BytesN<32>,
    /// Allowed skew between the proof's `now` and ledger time, in seconds.
    pub now_tolerance_secs: u64,
    /// Kill switch — when true, `enter` rejects every proof.
    pub paused: bool,
}

/// Written when a holder successfully enters a corridor. Keyed by
/// `(corridor_id, nullifier)` so it is unlinkable across corridors.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PassRecord {
    /// Small enum index the holder chose to disclose (not free text).
    pub tag: u32,
    /// Ledger sequence the pass was granted at.
    pub ledger: u32,
    /// Ledger timestamp the pass was granted at.
    pub timestamp: u64,
    /// Ciphertext of `{tier, issuer_id, attributes}` encrypted to the policy's
    /// auditor key, bound to the nullifier. 32-byte commitment in the MVP;
    /// the full blob lives off-chain keyed by this value.
    pub auditor_blob: BytesN<32>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Public-input layout (circuit ⇄ contract ABI)
// ─────────────────────────────────────────────────────────────────────────────

pub const PI_LEN: u32 = 9;
pub const PI_CREDENTIAL_ROOT: u32 = 0;
pub const PI_REVOCATION_ROOT: u32 = 1;
pub const PI_CORRIDOR_ID: u32 = 2;
pub const PI_MIN_TIER: u32 = 3;
pub const PI_NOW: u32 = 4;
pub const PI_NULLIFIER: u32 = 5;
pub const PI_DISCLOSED_TAG: u32 = 6;
pub const PI_ISSUER_ID: u32 = 7;
pub const PI_AUDITOR_BLOB: u32 = 8;

/// Typed view over the raw field-element vector the verifier consumes.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PublicInputs {
    pub credential_root: BytesN<32>,
    pub revocation_root: BytesN<32>,
    pub corridor_id: BytesN<32>,
    pub min_tier: u32,
    pub now: u64,
    pub nullifier: BytesN<32>,
    pub disclosed_tag: u32,
    pub issuer_id: BytesN<32>,
    pub auditor_blob: BytesN<32>,
}

impl PublicInputs {
    /// Decode from the raw 32-byte words. Numeric fields are big-endian in the
    /// low bytes of their word. Returns [`Error::BadPublicInputs`] on a length
    /// mismatch.
    pub fn decode(_env: &Env, raw: &Vec<BytesN<32>>) -> Result<PublicInputs, Error> {
        if raw.len() != PI_LEN {
            return Err(Error::BadPublicInputs);
        }
        Ok(PublicInputs {
            credential_root: raw.get_unchecked(PI_CREDENTIAL_ROOT),
            revocation_root: raw.get_unchecked(PI_REVOCATION_ROOT),
            corridor_id: raw.get_unchecked(PI_CORRIDOR_ID),
            min_tier: word_to_u32(&raw.get_unchecked(PI_MIN_TIER)),
            now: word_to_u64(&raw.get_unchecked(PI_NOW)),
            nullifier: raw.get_unchecked(PI_NULLIFIER),
            disclosed_tag: word_to_u32(&raw.get_unchecked(PI_DISCLOSED_TAG)),
            issuer_id: raw.get_unchecked(PI_ISSUER_ID),
            auditor_blob: raw.get_unchecked(PI_AUDITOR_BLOB),
        })
    }
}

fn word_to_u64(w: &BytesN<32>) -> u64 {
    let a = w.to_array();
    let mut v = 0u64;
    let mut i = 24usize;
    while i < 32 {
        v = (v << 8) | a[i] as u64;
        i += 1;
    }
    v
}

fn word_to_u32(w: &BytesN<32>) -> u32 {
    let a = w.to_array();
    let mut v = 0u32;
    let mut i = 28usize;
    while i < 32 {
        v = (v << 8) | a[i] as u32;
        i += 1;
    }
    v
}

/// Encode a `u64` into the low 8 bytes of a 32-byte word (test/relayer helper).
pub fn u64_to_word(env: &Env, v: u64) -> BytesN<32> {
    let mut a = [0u8; 32];
    let mut n = v;
    let mut i = 31usize;
    while i >= 24 {
        a[i] = (n & 0xff) as u8;
        n >>= 8;
        if i == 24 {
            break;
        }
        i -= 1;
    }
    BytesN::from_array(env, &a)
}

/// Encode a `u32` into the low 4 bytes of a 32-byte word (test/relayer helper).
pub fn u32_to_word(env: &Env, v: u32) -> BytesN<32> {
    let mut a = [0u8; 32];
    let mut n = v;
    let mut i = 31usize;
    while i >= 28 {
        a[i] = (n & 0xff) as u8;
        n >>= 8;
        if i == 28 {
            break;
        }
        i -= 1;
    }
    BytesN::from_array(env, &a)
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-contract interfaces
// ─────────────────────────────────────────────────────────────────────────────

/// ZK verifier contract interface. `verifier_mock` implements this for tests
/// and staged rollout; the real UltraHonk verifier is a drop-in replacement
/// with the same signature.
#[contractclient(name = "VerifierClient")]
pub trait Verifier {
    fn verify(env: Env, vk_hash: BytesN<32>, proof: Bytes, public_inputs: Vec<BytesN<32>>) -> bool;
}

/// The subset of `corridor_registry` that `corridor_attestation` calls.
#[contractclient(name = "RegistryClient")]
pub trait RegistryInterface {
    fn get_policy(env: Env, corridor_id: BytesN<32>) -> CorridorPolicy;
    fn post_root(
        env: Env,
        relayer: Address,
        corridor_id: BytesN<32>,
        credential_root: BytesN<32>,
        revocation_root: BytesN<32>,
        epoch: u64,
    );
}
