#![cfg(test)]
extern crate std;

use crate::{CorridorAttestation, CorridorAttestationClient};
use corridor_registry::{CorridorRegistry, CorridorRegistryClient};
use corridor_types::{u32_to_word, u64_to_word, CorridorPolicy, Error, PI_LEN};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    vec, Address, Bytes, BytesN, Env, Vec,
};
use verifier_mock::{VerifierMock, VerifierMockClient};

const ISSUER: [u8; 32] = [7u8; 32];
const CRED_ROOT: [u8; 32] = [1u8; 32];
const REV_ROOT: [u8; 32] = [2u8; 32];
const NULLIFIER: [u8; 32] = [3u8; 32];
const CORRIDOR: [u8; 32] = [4u8; 32];

struct World {
    env: Env,
    attestation: CorridorAttestationClient<'static>,
    registry: CorridorRegistryClient<'static>,
    verifier: VerifierMockClient<'static>,
    operator: Address,
    relayer: Address,
    cid: BytesN<32>,
}

fn b32(env: &Env, a: [u8; 32]) -> BytesN<32> {
    BytesN::from_array(env, &a)
}

fn setup() -> World {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let admin = Address::generate(&env);
    let operator = Address::generate(&env);
    let relayer = Address::generate(&env);

    let verifier_id = env.register(VerifierMock, ());
    let registry_id = env.register(CorridorRegistry, (admin.clone(),));
    let attestation_id = env.register(CorridorAttestation, (registry_id.clone(),));

    let registry = CorridorRegistryClient::new(&env, &registry_id);
    let cid = b32(&env, CORRIDOR);

    let policy = CorridorPolicy {
        operator: operator.clone(),
        accepted_issuers: vec![&env, b32(&env, ISSUER)],
        min_tier: 2,
        required_disclosures: 0,
        credential_root: b32(&env, [0u8; 32]),
        revocation_root: b32(&env, [0u8; 32]),
        root_epoch: 0,
        verifier: verifier_id.clone(),
        vk_hash: b32(&env, [9u8; 32]),
        now_tolerance_secs: 300,
        paused: false,
    };
    registry.register(&cid, &policy);
    registry.post_root(
        &relayer,
        &cid,
        &b32(&env, CRED_ROOT),
        &b32(&env, REV_ROOT),
        &1,
    );

    World {
        env: env.clone(),
        attestation: CorridorAttestationClient::new(&env, &attestation_id),
        registry,
        verifier: VerifierMockClient::new(&env, &verifier_id),
        operator,
        relayer,
        cid,
    }
}

/// Build a well-formed public-input vector for the happy path.
fn good_inputs(env: &Env) -> Vec<BytesN<32>> {
    let mut v = Vec::new(env);
    v.push_back(b32(env, CRED_ROOT)); // 0 credential_root
    v.push_back(b32(env, REV_ROOT)); //  1 revocation_root
    v.push_back(b32(env, CORRIDOR)); //  2 corridor_id
    v.push_back(u32_to_word(env, 2)); // 3 min_tier
    v.push_back(u64_to_word(env, 1_000_000)); // 4 now
    v.push_back(b32(env, NULLIFIER)); // 5 nullifier
    v.push_back(u32_to_word(env, 1)); // 6 disclosed_tag
    v.push_back(b32(env, ISSUER)); //   7 issuer_id
    v.push_back(b32(env, [0u8; 32])); // 8 auditor_blob
    assert_eq!(v.len(), PI_LEN);
    v
}

#[test]
fn happy_path_grants_a_pass() {
    let w = setup();
    let proof = Bytes::from_array(&w.env, &[0xaa; 8]);

    w.attestation.enter(&w.cid, &proof, &good_inputs(&w.env));

    assert!(w.attestation.is_cleared(&w.cid, &b32(&w.env, NULLIFIER)));
    assert_eq!(w.attestation.passes(&w.cid), 1);
    assert_eq!(w.verifier.calls(), 1);
    let rec = w
        .attestation
        .pass_record(&w.cid, &b32(&w.env, NULLIFIER))
        .unwrap();
    assert_eq!(rec.tag, 1);
}

#[test]
fn nullifier_cannot_be_reused() {
    let w = setup();
    let proof = Bytes::from_array(&w.env, &[0xaa; 8]);
    w.attestation.enter(&w.cid, &proof, &good_inputs(&w.env));

    let err = w
        .attestation
        .try_enter(&w.cid, &proof, &good_inputs(&w.env))
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::NullifierUsed);
    assert_eq!(w.attestation.passes(&w.cid), 1);
}

#[test]
fn rejects_when_verifier_says_no() {
    let w = setup();
    w.verifier.set_result(&false);
    let proof = Bytes::from_array(&w.env, &[0xaa; 8]);

    let err = w
        .attestation
        .try_enter(&w.cid, &proof, &good_inputs(&w.env))
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::ProofInvalid);
    assert!(!w.attestation.is_cleared(&w.cid, &b32(&w.env, NULLIFIER)));
}

#[test]
fn rejects_stale_root() {
    let w = setup();
    let env = &w.env;
    let mut v = good_inputs(env);
    v.set(0, b32(env, [0x55; 32])); // wrong credential_root
    let proof = Bytes::from_array(env, &[0xaa; 8]);

    let err = w
        .attestation
        .try_enter(&w.cid, &proof, &v)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::RootMismatch);
}

#[test]
fn rejects_unaccepted_issuer() {
    let w = setup();
    let env = &w.env;
    let mut v = good_inputs(env);
    v.set(7, b32(env, [0x11; 32])); // issuer not on the allowlist
    let proof = Bytes::from_array(env, &[0xaa; 8]);

    let err = w
        .attestation
        .try_enter(&w.cid, &proof, &v)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::IssuerNotAccepted);
}

#[test]
fn rejects_clock_skew_beyond_tolerance() {
    let w = setup();
    let env = &w.env;
    let mut v = good_inputs(env);
    v.set(4, u64_to_word(env, 1_000_000 - 10_000)); // 10_000s in the past, tol = 300
    let proof = Bytes::from_array(env, &[0xaa; 8]);

    let err = w
        .attestation
        .try_enter(&w.cid, &proof, &v)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::StaleProofTime);
}

#[test]
fn rejects_when_paused() {
    let w = setup();
    w.registry.set_paused(&w.cid, &true);
    let proof = Bytes::from_array(&w.env, &[0xaa; 8]);

    let err = w
        .attestation
        .try_enter(&w.cid, &proof, &good_inputs(&w.env))
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::PolicyPaused);
}

#[test]
fn rejects_bad_public_input_length() {
    let w = setup();
    let env = &w.env;
    let v: Vec<BytesN<32>> = vec![env, b32(env, CRED_ROOT)];
    let proof = Bytes::from_array(env, &[0xaa; 8]);

    let err = w
        .attestation
        .try_enter(&w.cid, &proof, &v)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::BadPublicInputs);
}

#[test]
fn different_corridors_have_independent_nullifiers() {
    let w = setup();
    let env = &w.env;
    // second corridor, same nullifier value must be allowed
    let cid2 = b32(env, [0x99; 32]);
    let policy = CorridorPolicy {
        operator: w.operator.clone(),
        accepted_issuers: vec![env, b32(env, ISSUER)],
        min_tier: 2,
        required_disclosures: 0,
        credential_root: b32(env, [0u8; 32]),
        revocation_root: b32(env, [0u8; 32]),
        root_epoch: 0,
        verifier: w.verifier.address.clone(),
        vk_hash: b32(env, [9u8; 32]),
        now_tolerance_secs: 300,
        paused: false,
    };
    w.registry.register(&cid2, &policy);
    w.registry.post_root(
        &w.relayer,
        &cid2,
        &b32(env, CRED_ROOT),
        &b32(env, REV_ROOT),
        &1,
    );

    let proof = Bytes::from_array(env, &[0xaa; 8]);
    w.attestation.enter(&w.cid, &proof, &good_inputs(env));

    let mut v2 = good_inputs(env);
    v2.set(2, cid2.clone()); // corridor_id
    w.attestation.enter(&cid2, &proof, &v2);

    assert!(w.attestation.is_cleared(&w.cid, &b32(env, NULLIFIER)));
    assert!(w.attestation.is_cleared(&cid2, &b32(env, NULLIFIER)));
}
