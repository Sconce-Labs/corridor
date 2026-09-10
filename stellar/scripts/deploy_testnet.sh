#!/usr/bin/env bash
# Deploy the Corridor Soroban stack to Stellar testnet.
#   ./scripts/deploy_testnet.sh
# Requires: stellar CLI >= 22, a funded identity named `corridor`
#   stellar keys generate corridor --network testnet --fund
set -euo pipefail

NET=testnet
SRC=${CORRIDOR_SOURCE:-corridor}
OUT=target/wasm32v1-none/release

cd "$(dirname "$0")/.."

echo "── building wasm ──────────────────────────────────────────────"
cargo build --workspace --release --target wasm32v1-none --locked

echo "── deploying verifier_mock (M3 replaces with real UltraHonk) ──"
VERIFIER=$(stellar contract deploy --wasm "$OUT/verifier_mock.wasm" \
  --source "$SRC" --network "$NET")

echo "── deploying corridor_registry ───────────────────────────────"
ADMIN=$(stellar keys address "$SRC")
REGISTRY=$(stellar contract deploy --wasm "$OUT/corridor_registry.wasm" \
  --source "$SRC" --network "$NET" -- --admin "$ADMIN")

echo "── deploying corridor_attestation ────────────────────────────"
ATTESTATION=$(stellar contract deploy --wasm "$OUT/corridor_attestation.wasm" \
  --source "$SRC" --network "$NET" -- --registry "$REGISTRY")

cat <<EOF

deployed to $NET:
  VERIFIER_MOCK      = $VERIFIER
  CORRIDOR_REGISTRY  = $REGISTRY
  CORRIDOR_ATTEST    = $ATTESTATION

Next: paste these into ../README.md and ../.env, then run scripts/demo.sh
EOF
