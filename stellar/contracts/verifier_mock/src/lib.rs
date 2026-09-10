#![no_std]
//! Mock verifier. Returns a configurable answer so the rest of the Corridor
//! stack can be built and tested before the real UltraHonk verifier is wired
//! in (see `ROADMAP.md` M3). **Never deploy this to a production corridor.**

use soroban_sdk::{contract, contractimpl, contracttype, Bytes, BytesN, Env, Vec};

#[contracttype]
enum DataKey {
    Result,
    Calls,
}

#[contract]
pub struct VerifierMock;

#[contractimpl]
impl VerifierMock {
    /// Set what `verify` returns. Defaults to `true` if never called.
    pub fn set_result(env: Env, ok: bool) {
        env.storage().instance().set(&DataKey::Result, &ok);
    }

    /// Number of times `verify` has been invoked — lets tests assert the
    /// attestation contract actually calls the verifier.
    pub fn calls(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Calls).unwrap_or(0)
    }

    pub fn verify(
        env: Env,
        _vk_hash: BytesN<32>,
        _proof: Bytes,
        _public_inputs: Vec<BytesN<32>>,
    ) -> bool {
        let calls: u32 = env.storage().instance().get(&DataKey::Calls).unwrap_or(0);
        env.storage().instance().set(&DataKey::Calls, &(calls + 1));
        env.storage()
            .instance()
            .get(&DataKey::Result)
            .unwrap_or(true)
    }
}
