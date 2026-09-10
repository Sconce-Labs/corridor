#!/usr/bin/env bash
# End-to-end demo against the mock verifier: register a corridor, sync a root,
# present a proof, confirm the pass, confirm replay is rejected.
#   VERIFIER=... REGISTRY=... ATTESTATION=... ./scripts/demo.sh
set -euo pipefail

NET=testnet
SRC=${CORRIDOR_SOURCE:-corridor}
: "${VERIFIER:?set VERIFIER}" "${REGISTRY:?set REGISTRY}" "${ATTESTATION:?set ATTESTATION}"

OP=$(stellar keys address "$SRC")

# 32-byte hex helpers
CID=0000000000000000000000000000000000000000000000000000000000000004
ISSUER=0000000000000000000000000000000000000000000000000000000000000007
CRED_ROOT=1111111111111111111111111111111111111111111111111111111111111111
REV_ROOT=2222222222222222222222222222222222222222222222222222222222222222
NULLIFIER=3333333333333333333333333333333333333333333333333333333333333333
VK=0909090909090909090909090909090909090909090909090909090909090909
ZERO=0000000000000000000000000000000000000000000000000000000000000000

inv() { stellar contract invoke --id "$1" --source "$SRC" --network "$NET" -- "${@:2}"; }

echo "── register corridor ────────────────────────────────────────"
inv "$REGISTRY" register --corridor_id "$CID" --policy "{
  \"operator\":\"$OP\",
  \"accepted_issuers\":[\"$ISSUER\"],
  \"min_tier\":2,
  \"required_disclosures\":0,
  \"credential_root\":\"$ZERO\",
  \"revocation_root\":\"$ZERO\",
  \"root_epoch\":0,
  \"verifier\":\"$VERIFIER\",
  \"vk_hash\":\"$VK\",
  \"now_tolerance_secs\":300,
  \"paused\":false
}"

echo "── relayer posts the Midnight root ──────────────────────────"
inv "$REGISTRY" post_root --relayer "$OP" --corridor_id "$CID" \
  --credential_root "$CRED_ROOT" --revocation_root "$REV_ROOT" --epoch 1

echo "── build public inputs (now = ledger time) ──────────────────"
NOW=$(printf '%064x' "$(date +%s)")
TIER2=$(printf '%064x' 2)
TAG1=$(printf '%064x' 1)
PUB="[\"$CRED_ROOT\",\"$REV_ROOT\",\"$CID\",\"$TIER2\",\"$NOW\",\"$NULLIFIER\",\"$TAG1\",\"$ISSUER\",\"$ZERO\"]"

echo "── enter the corridor ──────────────────────────────────────"
inv "$ATTESTATION" enter --corridor_id "$CID" --proof aabbccdd --public_inputs "$PUB"

echo "── is_cleared? (expect true) ───────────────────────────────"
inv "$ATTESTATION" is_cleared --corridor_id "$CID" --nullifier "$NULLIFIER"

echo "── replay (expect NullifierUsed / error) ───────────────────"
if inv "$ATTESTATION" enter --corridor_id "$CID" --proof aabbccdd --public_inputs "$PUB"; then
  echo "!! replay unexpectedly succeeded"; exit 1
else
  echo "ok — replay rejected"
fi
