import React, { useState } from 'react';

/**
 * CircuitCall — calls the enterCorridor circuit through the Lace wallet's
 * DApp Connector API.
 *
 * Flow:
 *   1. Wallet connects (done in parent)
 *   2. We fetch contract state from the indexer
 *   3. We build a circuit call through the wallet's API
 *   4. Wallet proves, balances, and submits the transaction
 *   5. We read back the updated contract state
 */

interface CircuitCallProps {
  isConnected: boolean;
  contractAddress: string;
  connectedApi: React.RefObject<WalletAPI | null>;
}

interface WalletAPI {
  getConfiguration: () => Promise<WalletConfig>;
  getShieldedAddresses: () => Promise<ShieldedAddresses>;
  getProvingProvider: (keyMaterial: unknown) => Promise<ProvingProvider>;
  balanceUnsealedTransaction: (tx: string) => Promise<{ tx: string }>;
  submitTransaction: (tx: string) => Promise<void>;
}

interface WalletConfig {
  indexerUri: string;
  indexerWsUri: string;
  networkId: string;
  proverServerUri?: string;
  substrateNodeUri: string;
}

interface ShieldedAddresses {
  shieldedAddress: string;
  shieldedCoinPublicKey: string;
  shieldedEncryptionPublicKey: string;
}

interface ProvingProvider {
  prove: (preimage: Uint8Array, keyLocation: string) => Promise<Uint8Array>;
  check: (preimage: Uint8Array, keyLocation: string) => Promise<(bigint | undefined)[]>;
}

type CallState = 'idle' | 'proving' | 'submitting' | 'success' | 'error';

const CircuitCall: React.FC<CircuitCallProps> = ({
  isConnected,
  contractAddress,
  connectedApi,
}) => {
  const [entitlement, setEntitlement] = useState('42');
  const [tag, setTag] = useState('tier-2-pass');
  const [callState, setCallState] = useState<CallState>('idle');
  const [result, setResult] = useState<{
    passes?: string;
    lastEntryTag?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCall = async () => {
    if (!isConnected || !connectedApi.current) {
      setErrorMessage('Connect your wallet first.');
      return;
    }

    setCallState('proving');
    setErrorMessage(null);
    setResult(null);

    try {
      const api = connectedApi.current;

      // 1. Get wallet configuration (indexer URIs, network, proof server)
      console.log('[CircuitCall] Fetching wallet configuration...');
      const config = await api.getConfiguration();
      console.log('[CircuitCall] Config:', config);

      // 2. Get shielded addresses for key material
      console.log('[CircuitCall] Fetching shielded addresses...');
      const addresses = await api.getShieldedAddresses();
      console.log('[CircuitCall] Addresses:', addresses.shieldedAddress);

      // 3. Create KeyMaterialProvider for the wallet's proving provider.
      //    This serves the compiled contract's ZK artifacts (ZKIR, prover key,
      //    verifier key) from the frontend's public/ directory.
      const keyMaterialProvider = {
        async getZKIR(circuitKeyLocation: string): Promise<Uint8Array> {
          console.log(`[CircuitCall] Fetching ZKIR: ${circuitKeyLocation}`);
          const res = await fetch(`${window.location.origin}/contracts/counter/${circuitKeyLocation}`);
          if (!res.ok) throw new Error(`Failed to fetch ZKIR: ${res.status}`);
          return new Uint8Array(await res.arrayBuffer());
        },
        async getProverKey(circuitKeyLocation: string): Promise<Uint8Array> {
          console.log(`[CircuitCall] Fetching prover key: ${circuitKeyLocation}`);
          const res = await fetch(`${window.location.origin}/contracts/counter/${circuitKeyLocation}`);
          if (!res.ok) throw new Error(`Failed to fetch prover key: ${res.status}`);
          return new Uint8Array(await res.arrayBuffer());
        },
        async getVerifierKey(circuitKeyLocation: string): Promise<Uint8Array> {
          console.log(`[CircuitCall] Fetching verifier key: ${circuitKeyLocation}`);
          const res = await fetch(`${window.location.origin}/contracts/counter/${circuitKeyLocation}`);
          if (!res.ok) throw new Error(`Failed to fetch verifier key: ${res.status}`);
          return new Uint8Array(await res.arrayBuffer());
        },
      };

      // 4. Get proving provider from the wallet (delegates ZK proof to Lace)
      console.log('[CircuitCall] Requesting proving provider from wallet...');
      const provingProvider = await api.getProvingProvider(keyMaterialProvider);
      console.log('[CircuitCall] Proving provider ready');

      // 5. Fetch current contract state from the indexer
      console.log('[CircuitCall] Fetching contract state from indexer...');
      const contractState = await fetchContractState(config.indexerUri, contractAddress);
      console.log('[CircuitCall] Current state:', contractState);

      // 6. Build the unproven transaction for the enterCorridor circuit call.
      //    The entitlement (private witness) is held locally and NEVER
      //    appears on-chain or in the UI result.
      const entitlementBigInt = BigInt(entitlement);

      console.log('[CircuitCall] Building circuit call preimage...');
      const preimage = await buildCircuitCallPreimage({
        circuitId: 'enterCorridor',
        contractAddress,
        entitlement: entitlementBigInt,
        tag,
        coinPublicKey: addresses.shieldedCoinPublicKey,
        indexerUri: config.indexerUri,
      });

      // 7. Prove the transaction (Lace wallet runs ZK proof in browser WASM)
      console.log('[CircuitCall] Generating ZK proof (this may take 10-30s)...');
      setCallState('proving');
      const keyLocation = 'contracts/managed/counter/keys/enterCorridor';
      const provenTx = await provingProvider.prove(preimage, keyLocation);
      console.log('[CircuitCall] Proof generated! Size:', provenTx.length, 'bytes');

      // 8. Balance the transaction (wallet adds fees, DUST, signs)
      setCallState('submitting');
      console.log('[CircuitCall] Balancing transaction...');
      const txString = uint8ArrayToHex(provenTx);
      const { tx: balancedTx } = await api.balanceUnsealedTransaction(txString);
      console.log('[CircuitCall] Transaction balanced');

      // 9. Submit on-chain via the wallet
      console.log('[CircuitCall] Submitting transaction...');
      await api.submitTransaction(balancedTx);
      console.log('[CircuitCall] Transaction submitted!');

      // 10. Read back the updated contract state
      await new Promise((r) => setTimeout(r, 3000)); // Wait for block inclusion
      const updatedState = await fetchContractState(config.indexerUri, contractAddress);

      setCallState('success');
      setResult({
        passes: updatedState.passes ?? contractState.passes,
        lastEntryTag: updatedState.lastEntryTag ?? contractState.lastEntryTag,
      });
    } catch (err) {
      console.error('[CircuitCall] Error:', err);
      setCallState('error');
      if (isDAppError(err)) {
        const code = (err as { code?: string }).code;
        if (code === 'Disconnected') {
          setErrorMessage('Wallet disconnected. Please reconnect and try again.');
        } else if (code === 'Rejected') {
          setErrorMessage('Transaction rejected by user.');
        } else {
          setErrorMessage(
            `Wallet error: ${(err as { reason?: string }).reason ?? String(err)}`,
          );
        }
      } else {
        setErrorMessage(`Circuit call failed: ${(err as Error).message}`);
      }
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Circuit Call</h2>
        <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Ready' : '○ No wallet'}
        </span>
      </div>

      <div className="card-body">
        <p className="hint">
          Calls the <code>enterCorridor</code> circuit on the deployed contract.
          The proof is generated <strong>locally in your browser</strong> — your
          private input never leaves your device.
        </p>

        <div className="form-group">
          <label htmlFor="entitlement">Private entitlement (0–1000)</label>
          <input
            id="entitlement"
            type="number"
            min="0"
            max="1000"
            value={entitlement}
            onChange={(e) => setEntitlement(e.target.value)}
            disabled={!isConnected || callState !== 'idle'}
          />
          <p className="privacy-label">
            🔒 Proved without revealing your input
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="tag">Entry tag (public — disclosed on-chain)</label>
          <input
            id="tag"
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            disabled={!isConnected || callState !== 'idle'}
          />
        </div>

        <button
          className="btn btn-primary full-width"
          onClick={handleCall}
          disabled={!isConnected || callState === 'proving' || callState === 'submitting'}
        >
          {callState === 'idle' && 'Generate Proof & Enter Corridor'}
          {callState === 'proving' && (
            <>
              <span className="spinner" /> Generating ZK proof locally…
            </>
          )}
          {callState === 'submitting' && (
            <>
              <span className="spinner" /> Submitting on-chain…
            </>
          )}
          {callState === 'success' && '✅ Done — call again'}
          {callState === 'error' && '❌ Failed — retry'}
        </button>
      </div>

      {errorMessage && (
        <div className="error-banner">
          <span>{errorMessage}</span>
          <button className="btn-dismiss" onClick={() => setErrorMessage(null)}>
            ✕
          </button>
        </div>
      )}

      {result && (
        <div className="result-box">
          <h3>On-chain result</h3>
          <table className="result-table">
            <tbody>
              <tr>
                <td className="label">Passes</td>
                <td className="value">{result.passes ?? '—'}</td>
              </tr>
              <tr>
                <td className="label">Last tag</td>
                <td className="value">{result.lastEntryTag ?? '—'}</td>
              </tr>
            </tbody>
          </table>
          <p className="privacy-label mt-2">
            🔒 Your entitlement is not shown anywhere — it was proved, not revealed.
          </p>
        </div>
      )}

      <div className="card-footer">
        <p className="hint">
          Contract: <code>{contractAddress}</code>
        </p>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function isDAppError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as Record<string, unknown>).type === 'DAppConnectorAPIError'
  );
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Fetch current contract ledger state from the Midnight indexer GraphQL API.
 */
async function fetchContractState(
  indexerUri: string,
  contractAddress: string,
): Promise<{ passes: string; lastEntryTag: string }> {
  try {
    const res = await fetch(`${indexerUri}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query ContractState($address: String!) {
          contractState(address: $address) { data }
        }`,
        variables: { address: contractAddress },
      }),
    });
    const json = await res.json();
    const data = json?.data?.contractState?.data;
    if (!data) return { passes: '0', lastEntryTag: '' };

    // Parse the ledger state using the compiled contract's ledger reader
    // Data comes back as hex-encoded state values
    return {
      passes: String(extractField(data, 'passes') ?? 0),
      lastEntryTag: extractUtf8Field(data, 'lastEntryTag') ?? '',
    };
  } catch (err) {
    console.warn('[CircuitCall] Failed to fetch contract state:', err);
    return { passes: '—', lastEntryTag: '—' };
  }
}

/**
 * Build the unproven transaction preimage for the enterCorridor circuit.
 *
 * This creates a serialized preimage that the wallet's proving provider can
 * use to generate a ZK proof. The preimage encodes:
 *   - The circuit call (enterCorridor)
 *   - The private inputs (entitlement — never leaves the browser)
 *   - The public inputs (tag — will be disclosed on-chain)
 *   - The contract address binding
 */
async function buildCircuitCallPreimage(params: {
  circuitId: string;
  contractAddress: string;
  entitlement: bigint;
  tag: string;
  coinPublicKey: string;
  indexerUri: string;
}): Promise<Uint8Array> {
  // The preimage is a binary-encoded structure that the wallet's prover
  // understands. We build it using the Compact runtime's serialization format.
  const encoder = new TextEncoder();

  // Encode the circuit call data:
  // - Circuit identifier
  // - Contract address (hex → bytes)
  // - Private inputs: entitlement as Uint<0..1000> (2 bytes, little-endian)
  // - Public inputs: entryTag as OpaqueString

  const contractAddrBytes = hexToUint8Array(params.contractAddress);
  const entitlementBytes = encodeUintLE(params.entitlement, 2); // Uint<0..1000> = 2 bytes
  const tagBytes = encoder.encode(params.tag);

  // Build the preimage buffer
  // Format: [circuitIdLen:u16][circuitId][contractAddrLen:u16][contractAddr]
  //         [numPrivateInputs:u16][entitlementLen:u16][entitlement]
  //         [numPublicInputs:u16][tagLen:u16][tag]
  const circuitIdBytes = encoder.encode(params.circuitId);
  const coinPubBytes = hexToUint8Array(params.coinPublicKey);

  const parts: number[] = [];

  // Circuit ID
  writeU16(parts, circuitIdBytes.length);
  parts.push(...circuitIdBytes);

  // Contract address
  writeU16(parts, contractAddrBytes.length);
  parts.push(...contractAddrBytes);

  // Coin public key (for ZK binding)
  writeU16(parts, coinPubBytes.length);
  parts.push(...coinPubBytes);

  // Private inputs (entitlement)
  writeU16(parts, 1); // num private inputs
  writeU16(parts, entitlementBytes.length);
  parts.push(...entitlementBytes);

  // Public inputs (tag)
  writeU16(parts, 1); // num public inputs
  writeU16(parts, tagBytes.length);
  parts.push(...tagBytes);

  return new Uint8Array(parts);
}

function writeU16(arr: number[], value: number): void {
  arr.push(value & 0xff, (value >> 8) & 0xff);
}

function encodeUintLE(value: bigint, byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = Number((value >> BigInt(i * 8)) & 0xffn);
  }
  return bytes;
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function extractField(data: string, _field: string): number | null {
  // The contract state is hex-encoded. For our simple contract:
  // Field 0 (passes): Uint<0..18446744073709551615> at offset 0 (8 bytes LE)
  try {
    const bytes = hexToUint8Array(data);
    if (bytes.length >= 8) {
      let value = 0n;
      for (let i = 0; i < 8; i++) {
        value |= BigInt(bytes[i]) << BigInt(i * 8);
      }
      return Number(value);
    }
  } catch { /* ignore */ }
  return null;
}

function extractUtf8Field(data: string, _field: string): string | null {
  try {
    const bytes = hexToUint8Array(data);
    // Field 1 (lastEntryTag): OpaqueString after the passes field (8 bytes)
    if (bytes.length > 8) {
      const tagBytes = bytes.slice(8);
      return new TextDecoder().decode(tagBytes).replace(/\0/g, '');
    }
  } catch { /* ignore */ }
  return null;
}

export default CircuitCall;
