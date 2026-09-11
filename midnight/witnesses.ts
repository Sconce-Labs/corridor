/**
 * Private state and witnesses for `corridor.compact` (the issuer registry).
 *
 * The contract persists no private state on-chain. The admin key and each
 * issuer's control secret are the only "private" inputs, and they are supplied
 * per circuit call as witnesses (`adminSk`, `issuerCtl`) — never written to the
 * ledger. The `witnesses` object therefore stays empty.
 */
export type IssuerRegistryPrivateState = Record<string, never>;

export const witnesses = {};
