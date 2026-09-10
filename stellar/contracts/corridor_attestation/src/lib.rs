#![no_std]
//! `corridor_attestation` — the heart of the Stellar side.
//!
//! `enter` takes an UltraHonk proof + its public inputs, binds them to the
//! corridor's on-chain policy, verifies the proof through the policy's verifier
//! contract, burns a per-corridor nullifier so a credential can't be reused on
//! the same corridor, and records a [`PassRecord`]. Corridor operators gate
//! payouts by calling `is_cleared`.

use corridor_types::{
    CorridorPolicy, Error, PassRecord, PublicInputs, RegistryClient, VerifierClient,
};
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, Vec,
};

#[contracttype]
enum DataKey {
    Registry,
    /// (corridor_id, nullifier) -> PassRecord
    Nullifier(BytesN<32>, BytesN<32>),
    /// corridor_id -> aggregate pass count
    Passes(BytesN<32>),
}

/// A granted pass is kept for at least this many ledgers before it can expire
/// from persistent storage (~30 days at 5s ledgers). Operators that need
/// longer-lived assurance should re-check against a fresh root epoch.
const PASS_TTL_LEDGERS: u32 = 518_400;

#[contract]
pub struct CorridorAttestation;

#[contractimpl]
impl CorridorAttestation {
    pub fn __constructor(env: Env, registry: Address) {
        env.storage().instance().set(&DataKey::Registry, &registry);
    }

    pub fn registry(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Registry).unwrap()
    }

    /// Present an eligibility proof for `corridor_id`.
    ///
    /// `public_inputs` is the raw field-element vector the verifier consumes;
    /// its layout is defined in `corridor_types` (`PI_*`).
    pub fn enter(
        env: Env,
        corridor_id: BytesN<32>,
        proof: Bytes,
        public_inputs: Vec<BytesN<32>>,
    ) -> Result<(), Error> {
        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let policy: CorridorPolicy =
            RegistryClient::new(&env, &registry_addr).get_policy(&corridor_id);

        if policy.paused {
            return Err(Error::PolicyPaused);
        }

        let pi = PublicInputs::decode(&env, &public_inputs)?;

        // 1. bind the proof to this corridor's current policy
        if pi.credential_root != policy.credential_root
            || pi.revocation_root != policy.revocation_root
        {
            return Err(Error::RootMismatch);
        }
        if pi.corridor_id != corridor_id {
            return Err(Error::CorridorMismatch);
        }
        if pi.min_tier != policy.min_tier {
            return Err(Error::MinTierMismatch);
        }
        if !vec_contains(&policy.accepted_issuers, &pi.issuer_id) {
            return Err(Error::IssuerNotAccepted);
        }
        let ts = env.ledger().timestamp();
        let skew = if ts > pi.now {
            ts - pi.now
        } else {
            pi.now - ts
        };
        if skew > policy.now_tolerance_secs {
            return Err(Error::StaleProofTime);
        }

        // 2. verify the ZK proof through the policy's verifier contract
        let ok = VerifierClient::new(&env, &policy.verifier).verify(
            &policy.vk_hash,
            &proof,
            &public_inputs,
        );
        if !ok {
            return Err(Error::ProofInvalid);
        }

        // 3. burn the nullifier (one pass per credential per corridor)
        let nk = DataKey::Nullifier(corridor_id.clone(), pi.nullifier.clone());
        if env.storage().persistent().has(&nk) {
            return Err(Error::NullifierUsed);
        }
        let record = PassRecord {
            tag: pi.disclosed_tag,
            ledger: env.ledger().sequence(),
            timestamp: ts,
            auditor_blob: pi.auditor_blob.clone(),
        };
        env.storage().persistent().set(&nk, &record);
        env.storage()
            .persistent()
            .extend_ttl(&nk, PASS_TTL_LEDGERS, PASS_TTL_LEDGERS);

        // 4. bump the aggregate counter
        let pk = DataKey::Passes(corridor_id.clone());
        let passes: u64 = env.storage().persistent().get(&pk).unwrap_or(0);
        env.storage().persistent().set(&pk, &(passes + 1));

        env.events().publish(
            (symbol_short!("PASS"), corridor_id, pi.nullifier),
            (pi.disclosed_tag, passes + 1),
        );
        Ok(())
    }

    /// Cheap read for a corridor operator's payout contract: has this nullifier
    /// been granted a pass on this corridor?
    pub fn is_cleared(env: Env, corridor_id: BytesN<32>, nullifier: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Nullifier(corridor_id, nullifier))
    }

    pub fn pass_record(
        env: Env,
        corridor_id: BytesN<32>,
        nullifier: BytesN<32>,
    ) -> Option<PassRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Nullifier(corridor_id, nullifier))
    }

    pub fn passes(env: Env, corridor_id: BytesN<32>) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::Passes(corridor_id))
            .unwrap_or(0)
    }
}

fn vec_contains(v: &Vec<BytesN<32>>, needle: &BytesN<32>) -> bool {
    for item in v.iter() {
        if &item == needle {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod test;
