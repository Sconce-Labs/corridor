/**
 * Unit tests for the Corridor counter contract.
 *
 * Covers the three things Level 1 asks for:
 *   1. Circuit logic     — the circuit correctly enforces its eligibility
 *                          check and produces deterministic initial state.
 *   2. State transitions — enterCorridor advances the ledger exactly as
 *                          specified, and invalid calls are rejected.
 *   3. Privacy           — private witness inputs never appear in the ledger;
 *                          only the deliberately disclosed tag is public.
 *
 * Run with: npm test  (node --test with the tsx loader)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CounterSimulator } from './counter-simulator.js';

setNetworkId('undeployed');

describe('Corridor counter contract — circuit logic', () => {
  it('generates the initial ledger state deterministically', () => {
    const simulator0 = new CounterSimulator();
    const simulator1 = new CounterSimulator();
    assert.deepEqual(simulator0.getLedger(), simulator1.getLedger());
  });

  it('initializes public state to zero passes and an empty tag', () => {
    const simulator = new CounterSimulator();
    assert.deepEqual(simulator.getLedger(), { passes: 0n, lastEntryTag: '' });
  });

  it('rejects a caller with no entitlement (entitlement === 0)', () => {
    const simulator = new CounterSimulator();
    assert.throws(() => simulator.enterCorridor(0n, 'tier-2-pass'));
    // A rejected transition must not change the ledger.
    assert.deepEqual(simulator.getLedger(), { passes: 0n, lastEntryTag: '' });
  });
});

describe('Corridor counter contract — state transitions', () => {
  it('increments passes by exactly 1 and discloses the entry tag', () => {
    const simulator = new CounterSimulator();
    const next = simulator.enterCorridor(42n, 'tier-2-pass');
    assert.deepEqual(next, { passes: 1n, lastEntryTag: 'tier-2-pass' });
  });

  it('accumulates passes across multiple entries', () => {
    const simulator = new CounterSimulator();
    simulator.enterCorridor(3n, 'aid-disbursement');
    simulator.enterCorridor(7n, 'remittance');
    const final = simulator.enterCorridor(1n, 'lending-pool');
    assert.equal(final.passes, 3n);
  });
});

describe('Corridor counter contract — private inputs are never exposed', () => {
  it('keeps the private entitlement out of the ledger state', () => {
    const simulator = new CounterSimulator();
    const secretEntitlement = 777n;
    const ledgerState = simulator.enterCorridor(secretEntitlement, 'tier-2-pass');

    // The ledger exposes exactly two fields: the aggregate counter (incremented
    // by the constant 1, not by the entitlement) and the deliberately
    // disclosed tag. The private entitlement value appears nowhere in the
    // public state — if it did, the deep-equality below would fail.
    assert.deepEqual(ledgerState, { passes: 1n, lastEntryTag: 'tier-2-pass' });
    assert.deepEqual(Object.keys(ledgerState).sort(), ['lastEntryTag', 'passes']);
  });

  it('does not leak the entitlement magnitude — only the constant increment is public', () => {
    const small = new CounterSimulator();
    const large = new CounterSimulator();

    // Different private entitlements produce identical public deltas:
    // an observer learns only that a pass was granted, never the size of
    // the caller's entitlement.
    const deltaSmall = small.enterCorridor(1n, 'tag').passes;
    const deltaLarge = large.enterCorridor(500n, 'tag').passes;
    assert.equal(deltaSmall, deltaLarge);
    assert.equal(deltaSmall, 1n);
  });

  it('publishes only the value the caller chose to disclose', () => {
    const simulator = new CounterSimulator();
    const ledgerState = simulator.enterCorridor(5n, 'public-label');
    // The disclosed tag is exactly what the caller chose to publish...
    assert.equal(ledgerState.lastEntryTag, 'public-label');
    // ...and nothing about the private entitlement is echoed back.
    assert.equal(ledgerState.passes, 1n);
  });
});
