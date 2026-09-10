# Corridor hub — assumes the component repos are checked out as siblings:
#   ../corridor-contracts  ../corridor-circuits  ../corridor-sdk
# Install just: https://github.com/casey/just

default:
    @just --list

# ── Midnight / Compact (this repo) ──────────────────────────────────────────
midnight-compile:
    compact compile contracts/corridor.compact contracts/managed/corridor

# ── Component repos (siblings) ──────────────────────────────────────────────
contracts-test:
    cd ../corridor-contracts && cargo test --workspace

contracts-build:
    cd ../corridor-contracts && cargo build --workspace --release --target wasm32v1-none

circuit-test:
    cd ../corridor-circuits/corridor_eligibility && nargo test

sdk-test:
    cd ../corridor-sdk && npm test

# ── Everything ─────────────────────────────────────────────────────────────
test: contracts-test circuit-test sdk-test
