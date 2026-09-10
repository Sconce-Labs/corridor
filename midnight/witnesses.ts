/**
 * Private state and witnesses for the Corridor counter contract.
 *
 * The contract has no persisted private state on-chain: its private witness
 * (`entitlement`) is supplied per-call as a circuit input and is never
 * written to the ledger. The `witnesses` object therefore stays empty.
 */
export type CounterPrivateState = Record<string, never>;

export const witnesses = {};
