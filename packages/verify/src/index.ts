/**
 * @corridor/verify — client SDK for Corridor.
 *
 * The integration surface for the three roles. Most of this is signatures +
 * TODOs (M6); the types and the public-input layout are real and match
 * `stellar/crates/corridor_types` (`PI_*`) and `circuits/corridor_eligibility`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Public-input ABI — keep in lockstep with corridor_types::PI_* and main.nr
// ─────────────────────────────────────────────────────────────────────────────

export const PI_INDEX = {
  credentialRoot: 0,
  revocationRoot: 1,
  corridorId: 2,
  minTier: 3,
  now: 4,
  nullifier: 5,
  disclosedTag: 6,
  issuerId: 7,
  auditorBlob: 8,
} as const;

export const PI_LEN = 9;

/** A 32-byte value as a lowercase hex string, `0x`-prefixed. */
export type Bytes32 = `0x${string}`;

export interface CorridorPolicy {
  operator: string;
  acceptedIssuers: Bytes32[];
  minTier: number;
  requiredDisclosures: number;
  credentialRoot: Bytes32;
  revocationRoot: Bytes32;
  rootEpoch: bigint;
  verifier: string;
  vkHash: Bytes32;
  nowToleranceSecs: number;
  paused: boolean;
}

/** Everything the holder's wallet/device holds for one credential. */
export interface CredentialMaterial {
  holderSecret: Bytes32;
  tier: number;
  expiry: number;
  issuerId: Bytes32;
  salt: Bytes32;
  /** Inclusion path under the issuer-set root. */
  credSiblings: Bytes32[];
  credIndexBits: (0 | 1)[];
  /** Non-membership co-path under the revocation root. */
  revSiblings: Bytes32[];
}

export interface DisclosureRequest {
  corridorId: Bytes32;
  /** Bounded enum index (< 16), not free text. */
  disclosedTag: number;
  auditorPubkey: Bytes32;
}

export interface EligibilityWitness {
  public: Bytes32[]; // length PI_LEN, ordered by PI_INDEX
  private: Record<string, unknown>;
}

export interface Proof {
  bytes: Uint8Array;
  publicInputs: Bytes32[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export interface CorridorConfig {
  /** Soroban RPC URL. */
  rpcUrl: string;
  networkPassphrase: string;
  registryContractId: string;
  attestationContractId: string;
  /** Endpoint of the fee-sponsoring relayer that submits `enter` for holders. */
  relayerUrl?: string;
  /** Local prover endpoint / worker. */
  proverUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export class Corridor {
  constructor(private readonly cfg: CorridorConfig) {}

  /** Read a corridor's on-chain policy. */
  async getPolicy(_corridorId: Bytes32): Promise<CorridorPolicy> {
    // TODO(M6): Soroban `corridor_registry.get_policy` via stellar-sdk.
    throw new Error("not implemented — M6");
  }

  /** Build the circuit witness from credential material + a disclosure request. */
  buildWitness(
    _cred: CredentialMaterial,
    _policy: CorridorPolicy,
    _req: DisclosureRequest,
    _now: number,
  ): EligibilityWitness {
    // TODO(M2/M6): compute commitment, nullifier = Poseidon2(secret, corridorId),
    // auditor_blob, assemble the ordered public vector. Poseidon2 params MUST
    // match the on-chain host function (ROADMAP M2 conformance test).
    throw new Error("not implemented — M2/M6");
  }

  /** Ask the prover for an UltraHonk proof over the witness. */
  async requestProof(_witness: EligibilityWitness): Promise<Proof> {
    // TODO(M6): delegate to a local prover / wallet; never send `private` to a server.
    throw new Error("not implemented — M6");
  }

  /**
   * Submit the proof to `corridor_attestation.enter` via the relayer so the
   * holder's own Stellar account is not linked to the pass.
   */
  async enter(_corridorId: Bytes32, _proof: Proof): Promise<{ txHash: string }> {
    // TODO(M6): POST to relayerUrl, or fall back to a direct fee-bump tx.
    throw new Error("not implemented — M6");
  }

  /** Has this nullifier been granted a pass on this corridor? (payout gate) */
  async isCleared(_corridorId: Bytes32, _nullifier: Bytes32): Promise<boolean> {
    // TODO(M6): Soroban `corridor_attestation.is_cleared`.
    throw new Error("not implemented — M6");
  }
}

/** One-call helper for corridor operators: the payout gate. */
export async function isCleared(
  cfg: CorridorConfig,
  corridorId: Bytes32,
  nullifier: Bytes32,
): Promise<boolean> {
  return new Corridor(cfg).isCleared(corridorId, nullifier);
}
