#!/usr/bin/env bash
# End-to-end integration across the component repos. Assumes sibling checkouts:
#   ../corridor-contracts  ../corridor-circuits  ../corridor-sdk
# Needs: node 22, rust + wasm32v1-none, nargo 1.0.0-beta.26, stellar CLI (opt).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
sdk="$here/../corridor-sdk"
circ="$here/../corridor-circuits"
contracts="$here/../corridor-contracts"

echo "== 1. SDK: build a witness + emit the circuit fixture =="
( cd "$sdk" && npm ci --silent && npm test --silent )
( cd "$sdk" && npx tsx scripts/gen-fixture.ts > "$circ/corridor_eligibility/Prover.toml" )

echo "== 2. Circuit: type-check, unit tests, and solve the SDK fixture =="
( cd "$circ/corridor_eligibility" && nargo check && nargo test && nargo execute )

echo "== 3. Contracts: host tests (mock verifier) + wasm build =="
( cd "$contracts" && cargo test --workspace --locked && \
  cargo build --release --target wasm32v1-none \
    -p corridor-registry -p corridor-attestation -p verifier-mock )

echo "== 4. (optional) live testnet smoke =="
if command -v stellar >/dev/null && [ "${CORRIDOR_LIVE:-0}" = "1" ]; then
  ( cd "$contracts" && ./scripts/demo.sh )
else
  echo "   skipped (set CORRIDOR_LIVE=1 and install the stellar CLI to run)"
fi

echo
echo "OK — SDK witness ⇄ circuit constraints ⇄ contract ABI all agree."
echo "NOTE: the Midnight (corridor.compact) leg is NOT in this flow yet — it is"
echo "blocked on the accumulator decision (docs/CREDENTIAL_ACCUMULATOR.md)."
