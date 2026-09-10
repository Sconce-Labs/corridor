# The transaction relayer (fee-sponsored submit)

**Not built.** This is the spec for a service Corridor needs under every
accumulator option — distinct from `corridor-relayer` (which syncs Midnight
roots, and disappears under Option B).

## Why

`corridor_attestation.enter(corridor_id, proof, public_inputs)` takes no auth —
anyone can submit it. If the *holder* submits it from their own Stellar account,
that account is now linked to the pass (and, via the nullifier, to every other
corridor they enter). The privacy claim ("an on-chain observer cannot link the
holder") depends on the submit coming from **somewhere other than the holder**.

## What it does

```
holder  --POST /enter { corridorId, proof, publicInputs }-->  tx-relayer
                                                                  │ builds + signs + submits
                                                                  │ enter() from its own account,
                                                                  │ pays the fee
                                            <-- { txHash } -------┘
```

- One shared relayer account (or a rotating pool) submits everyone's `enter()`
  calls. The nullifier ledger still prevents double-grants; the relayer cannot
  forge a pass (the proof binds everything).
- The relayer sees `proof` + `public_inputs` — all already public — never the
  witness.
- Abuse control: rate-limit per source, optional proof-of-work or a small
  refundable deposit, drop malformed inputs before paying.

## Not a trust problem for correctness

The relayer can censor (refuse to submit) or front-run (submit an identical
`enter` first — idempotent, the second fails `NullifierUsed`). It cannot mint a
pass. Censorship resistance: publish the relayer endpoint set; allow holders to
fall back to self-submit (accepting the linkage) or to any relayer.

## Relationship to `corridor-relayer`

| | root-sync relayer (`corridor-relayer`) | tx-relayer (this doc) |
|-|----------------------------------------|-----------------------|
| job | post Midnight roots to `corridor_registry` | submit holders' `enter()` calls |
| needed under Option B? | no (no shared root) | yes |
| privacy-critical? | no | **yes** |
| exists? | skeleton | no |

The SDK's `Corridor.enter(corridorId, proof)` already targets this service
(`cfg.relayerUrl` + `POST /enter`). Implementing it is the first task once the
accumulator decision lands.
