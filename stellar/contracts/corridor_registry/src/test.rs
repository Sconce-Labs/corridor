#![cfg(test)]
extern crate std;

use crate::{CorridorRegistry, CorridorRegistryClient};
use corridor_types::{CorridorPolicy, Error};
use soroban_sdk::{testutils::Address as _, vec, Address, BytesN, Env};

fn zero32(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
}

fn sample_policy(env: &Env, operator: &Address, verifier: &Address) -> CorridorPolicy {
    CorridorPolicy {
        operator: operator.clone(),
        accepted_issuers: vec![env, BytesN::from_array(env, &[7u8; 32])],
        min_tier: 2,
        required_disclosures: 0,
        credential_root: zero32(env),
        revocation_root: zero32(env),
        root_epoch: 0,
        verifier: verifier.clone(),
        vk_hash: BytesN::from_array(env, &[9u8; 32]),
        now_tolerance_secs: 300,
        paused: false,
    }
}

fn setup() -> (Env, CorridorRegistryClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register(CorridorRegistry, (admin.clone(),));
    (env.clone(), CorridorRegistryClient::new(&env, &id), admin)
}

#[test]
fn register_and_read_back() {
    let (env, registry, _admin) = setup();
    let operator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let cid = BytesN::from_array(&env, &[1u8; 32]);

    registry.register(&cid, &sample_policy(&env, &operator, &verifier));
    let got = registry.get_policy(&cid);
    assert_eq!(got.min_tier, 2);
    assert_eq!(got.root_epoch, 0);
    assert!(!got.paused);
}

#[test]
fn double_register_rejected() {
    let (env, registry, _admin) = setup();
    let operator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let cid = BytesN::from_array(&env, &[1u8; 32]);
    let policy = sample_policy(&env, &operator, &verifier);

    registry.register(&cid, &policy);
    let err = registry.try_register(&cid, &policy).err().unwrap().unwrap();
    assert_eq!(err, Error::PolicyExists);
}

#[test]
fn post_root_advances_epoch() {
    let (env, registry, _admin) = setup();
    let operator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let relayer = Address::generate(&env);
    let cid = BytesN::from_array(&env, &[1u8; 32]);
    registry.register(&cid, &sample_policy(&env, &operator, &verifier));

    let root = BytesN::from_array(&env, &[42u8; 32]);
    registry.post_root(&relayer, &cid, &root, &zero32(&env), &1);
    let got = registry.get_policy(&cid);
    assert_eq!(got.root_epoch, 1);
    assert_eq!(got.credential_root, root);
}

#[test]
fn post_root_epoch_cannot_regress() {
    let (env, registry, _admin) = setup();
    let operator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let relayer = Address::generate(&env);
    let cid = BytesN::from_array(&env, &[1u8; 32]);
    registry.register(&cid, &sample_policy(&env, &operator, &verifier));

    registry.post_root(&relayer, &cid, &zero32(&env), &zero32(&env), &5);
    let err = registry
        .try_post_root(&relayer, &cid, &zero32(&env), &zero32(&env), &5)
        .err()
        .unwrap()
        .unwrap();
    assert_eq!(err, Error::RootEpochRegression);
}

#[test]
fn pause_toggles() {
    let (env, registry, _admin) = setup();
    let operator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let cid = BytesN::from_array(&env, &[1u8; 32]);
    registry.register(&cid, &sample_policy(&env, &operator, &verifier));

    registry.set_paused(&cid, &true);
    assert!(registry.get_policy(&cid).paused);
    registry.set_paused(&cid, &false);
    assert!(!registry.get_policy(&cid).paused);
}
