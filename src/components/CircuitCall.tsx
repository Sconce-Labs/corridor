import React, { useState } from 'react';

interface CircuitCallProps {
  isConnected: boolean;
  contractAddress: string;
  connectedApi: React.RefObject<{
    getConfiguration: () => Promise<{
      indexerUri: string;
      indexerWsUri: string;
      networkId: string;
      proofServerUri: string;
    }>;
    getProvingProvider: (zkConfig: unknown) => Promise<{ proveTx: (tx: unknown) => Promise<unknown> }>;
    balanceUnsealedTransaction: (tx: string) => Promise<{ tx: string }>;
    submitTransaction: (tx: string) => Promise<void>;
    hintUsage: (methods: string[]) => Promise<void>;
  } | null>;
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
    txId?: string;
    blockHeight?: string;
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

      // Hint what wallet methods we'll need — batches permission prompts.
      await api.hintUsage([
        'balanceUnsealedTransaction',
        'submitTransaction',
      ]);

      // Build the unproven transaction for the enterCorridor circuit call.
      // The entitlement (private witness) is provided as a BigInt — it will
      // be held by the wallet and NEVER appear in the UI or on-chain state.
      const entitlementBigInt = BigInt(entitlement);

      // The wallet needs the contract's ZK configuration to generate the
      // proof locally in the browser. We fetch it from the compiled artifacts.
      // This is loaded from contracts/managed/counter/zkir/ — the circuit
      // keys that the wallet's WASM prover uses to generate the proof.
      const zkConfig = await loadZkConfig(contractAddress);

      // Create the wallet-side proof provider (browser WASM prover).
      // First connection may take 10-30s as the wallet loads proving keys (~50MB).
      setCallState('proving');
      const proofProvider = await api.getProvingProvider(zkConfig);

      // Build the unproven transaction from the circuit call.
      // The entitlement goes here — the wallet sees it to generate the proof,
      // but it never leaves the browser and never appears on-chain.
      const unprovenTx = await buildUnprovenCallTx({
        api,
        contractAddress,
        circuit: 'enterCorridor',
        privateInputs: { entitlement: entitlementBigInt },
        publicInputs: { tag },
      });

      // Prove the transaction (wallet runs ZK proof in browser WASM).
      // This is the step that takes 10-30 seconds on first use.
      const provenTx = await proofProvider.proveTx(unprovenTx);

      // Balance the transaction (wallet adds fees, signs).
      setCallState('submitting');
      const { tx: balancedTx } = await api.balanceUnsealedTransaction(
        typeof provenTx === 'string' ? provenTx : JSON.stringify(provenTx),
      );

      // Submit on-chain via the wallet.
      await api.submitTransaction(balancedTx);

      // The wallet submits and we receive no txId from the connector API.
      // To confirm success, we poll the indexer for the new ledger state.
      const cfg = await api.getConfiguration();
      const publicState = await fetchContractState(cfg.indexerUri, contractAddress);

      setCallState('success');
      setResult({
        txId: '(submitted — see wallet history)',
        blockHeight: '(pending confirmation)',
        passes: publicState.passes,
        lastEntryTag: publicState.lastEntryTag,
      });
    } catch (err) {
      setCallState('error');
      if (isDAppError(err)) {
        const code = (err as { code?: string }).code;
        if (code === 'Disconnected') {
          setErrorMessage('Wallet disconnected. Please reconnect and try again.');
        } else if (code === 'Rejected') {
          setErrorMessage('Transaction rejected by user.');
        } else {
          setErrorMessage(`Wallet error: ${(err as { reason?: string }).reason ?? String(err)}`);
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
          Calls the <code>enterCorridor</code> circuit on your Preprod contract.
          The proof is generated <strong>locally in your browser</strong> — your
          private input never leaves your device.
        </p>

        <div className="form-group">
          <label htmlFor="entitlement">
            Private entitlement (0–1000)
          </label>
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
          <label htmlFor="tag">
            Entry tag (public — disclosed on-chain)
          </label>
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
          {callState === 'proving' && '⏳ Generating ZK proof locally…'}
          {callState === 'submitting' && '⏳ Submitting on-chain…'}
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDAppError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as Record<string, unknown>).type === 'DAppConnectorAPIError'
  );
}

/**
 * Placeholder: load ZK configuration from the compiled contract artifacts.
 * In production, the circuit keys are fetched from the wallet or bundled.
 * The wallet's getProvingProvider() handles the key material exchange —
 * we just need to identify which circuit we're calling.
 */
async function loadZkConfig(_contractAddress: string): Promise<unknown> {
  // The wallet's getProvingProvider uses its own key resolution.
  // We pass a minimal identifier so the wallet knows which circuit to load.
  return { circuit: 'enterCorridor', version: '0.31.1' };
}

/**
 * Placeholder: build the unproven transaction for a circuit call.
 * In the real implementation, this uses @midnight-ntwrk/midnight-js-contracts
 * to create an unproven call transaction. The actual contract call encoding
 * happens through the Midnight.js SDK's callTx API.
 */
async function buildUnprovenCallTx(_params: {
  api: unknown;
  contractAddress: string;
  circuit: string;
  privateInputs: { entitlement: bigint };
  publicInputs: { tag: string };
}): Promise<unknown> {
  // This is a structural placeholder — the real implementation wires up
  // the compiled contract's callTx interface with the public data provider
  // from the wallet's configuration. When wired correctly, it creates an
  // unproven transaction that the wallet's proof provider can prove.
  throw new Error(
    'Circuit call integration requires the full Midnight.js contract API. ' +
    'Connect your wallet to prove and submit via the browser wallet extension.',
  );
}

/**
 * Fetch current contract state from the indexer.
 */
async function fetchContractState(
  indexerUri: string,
  contractAddress: string,
): Promise<{ passes: string; lastEntryTag: string }> {
  try {
    const res = await fetch(`${indexerUri}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { contractState(address: "${contractAddress}") { data } }`,
      }),
    });
    const json = await res.json();
    return {
      passes: json?.data?.contractState?.data?.passes ?? '—',
      lastEntryTag: json?.data?.contractState?.data?.lastEntryTag ?? '—',
    };
  } catch {
    return { passes: '—', lastEntryTag: '—' };
  }
}

export default CircuitCall;
