// Thin read-only client for the Corridor Soroban contracts. Simulation only —
// no account, no signature, no writes. A malicious RPC could lie, so an
// operator's payout contract must ultimately gate on-chain; this is for
// display and a convenience check.

import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk/minimal";
import { CONTRACTS, NETWORK } from "./config";

const server = new rpc.Server(NETWORK.rpcUrl, { allowHttp: false });

// A random, unfunded key used only as the simulation source — never signs.
const SIM_SOURCE = Keypair.random().publicKey();

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(b: Uint8Array): string {
  let s = "";
  for (const byte of b) s += byte.toString(16).padStart(2, "0");
  return s;
}

function bytes32(hex: string): xdr.ScVal {
  const clean = hex.replace(/^0x/, "").padStart(64, "0");
  if (clean.length !== 64) throw new Error("expected a 32-byte hex value");
  return nativeToScVal(hexToBytes(clean), { type: "bytes" });
}

async function simulate(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<unknown> {
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(new Account(SIM_SOURCE, "0"), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new ContractCallError(sim.error);
  }
  const retval = sim.result?.retval;
  if (!retval) throw new ContractCallError("no return value");
  return scValToNative(retval);
}

export class ContractCallError extends Error {}

export interface CorridorPolicy {
  operator: string;
  acceptedIssuers: string[];
  minTier: number;
  requiredDisclosures: number;
  minCredEpoch: bigint;
  verifier: string;
  vkHash: string;
  auditorPubkey: string;
  nowToleranceSecs: bigint;
  paused: boolean;
}

const toHex = (v: unknown): string =>
  v instanceof Uint8Array ? "0x" + bytesToHex(v) : String(v ?? "");

const toBig = (v: unknown): bigint =>
  typeof v === "bigint"
    ? v
    : typeof v === "number" || typeof v === "string"
      ? BigInt(v)
      : 0n;

const toNum = (v: unknown): number => (v == null ? 0 : Number(v));

export async function getPolicy(corridorId: string): Promise<CorridorPolicy> {
  const raw = (await simulate(CONTRACTS.registry, "get_policy", [
    bytes32(corridorId),
  ])) as Record<string, unknown>;

  return {
    operator: String(raw.operator),
    acceptedIssuers: Array.isArray(raw.accepted_issuers)
      ? raw.accepted_issuers.map(toHex)
      : [],
    minTier: toNum(raw.min_tier),
    requiredDisclosures: toNum(raw.required_disclosures),
    minCredEpoch: toBig(raw.min_cred_epoch),
    verifier: String(raw.verifier),
    vkHash: toHex(raw.vk_hash),
    auditorPubkey: toHex(raw.auditor_pubkey),
    nowToleranceSecs: toBig(raw.now_tolerance_secs),
    paused: Boolean(raw.paused),
  };
}

export async function isCleared(
  corridorId: string,
  nullifier: string,
): Promise<boolean> {
  const v = await simulate(CONTRACTS.attestation, "is_cleared", [
    bytes32(corridorId),
    bytes32(nullifier),
  ]);
  return Boolean(v);
}

export async function passes(corridorId: string): Promise<bigint> {
  const v = await simulate(CONTRACTS.attestation, "passes", [
    bytes32(corridorId),
  ]);
  return toBig(v);
}

export interface PassRecord {
  tag: number;
  ledger: number;
  timestamp: bigint;
  auditorBlob: string;
}

export async function passRecord(
  corridorId: string,
  nullifier: string,
): Promise<PassRecord | null> {
  const raw = (await simulate(CONTRACTS.attestation, "pass_record", [
    bytes32(corridorId),
    bytes32(nullifier),
  ])) as Record<string, unknown> | null;
  if (!raw) return null;
  return {
    tag: toNum(raw.tag),
    ledger: toNum(raw.ledger),
    timestamp: toBig(raw.timestamp),
    auditorBlob: toHex(raw.auditor_blob),
  };
}

export function shortAddr(a: string, n = 4): string {
  if (a.length <= 2 * n + 3) return a;
  return `${a.slice(0, n + 2)}…${a.slice(-n)}`;
}

export function normalizeHex32(input: string): string {
  const clean = input.trim().replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]*$/.test(clean)) throw new Error("not hexadecimal");
  if (clean.length === 0 || clean.length > 64)
    throw new Error("expected 1–64 hex digits");
  return "0x" + clean.padStart(64, "0");
}

// Kept so a future write path (operator console) has the address helper ready.
export const asAddress = (id: string) => Address.fromString(id);
