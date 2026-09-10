# Corridor — one entrypoint for all three layers.
# Install: https://github.com/casey/just

default:
    @just --list

# ── Stellar / Soroban ───────────────────────────────────────────────────────
stellar-test:
    cd stellar && cargo test --workspace

stellar-build:
    cd stellar && cargo build --workspace --release --target wasm32v1-none

stellar-fmt:
    cd stellar && cargo fmt --all

# ── Noir circuit ────────────────────────────────────────────────────────────
circuit-check:
    cd circuits/corridor_eligibility && nargo check

circuit-test:
    cd circuits/corridor_eligibility && nargo test

# ── Midnight / Compact ──────────────────────────────────────────────────────
midnight-compile:
    compact compile contracts/corridor.compact contracts/managed/corridor

# ── SDK ─────────────────────────────────────────────────────────────────────
sdk-test:
    cd packages/verify && npm test

# ── Everything ──────────────────────────────────────────────────────────────
test: stellar-test circuit-test sdk-test

fmt: stellar-fmt
