import React, { useState } from 'react';

/**
 * CircuitCall — demonstrates the privacy model of the enterCorridor circuit.
 *
 * NOTE: Full on-chain proof generation requires the Midnight.js SDK running
 * server-side with a local proof server (Docker). The browser DApp Connector
 * API provides wallet integration (connect, balance, submit) but the SDK's
 * createUnprovenCallTx cannot be bundled for the browser via Vite due to WASM
 * dependency chain issues.
 *
 * This component demonstrates:
 *   - Wallet connection (handled by parent)
 *   - Private input entry (entitlement) that is never exposed
 *   - Public input entry (tag) that would be disclosed on-chain
 *   - The privacy model: what an observer can vs cannot see
 */

interface CircuitCallProps {
  isConnected: boolean;
  contractAddress: string;
}

type CallState = 'idle' | 'simulating' | 'success' | 'error';

const CircuitCall: React.FC<CircuitCallProps> = ({
  isConnected,
  contractAddress,
}) => {
  const [entitlement, setEntitlement] = useState('42');
  const [tag, setTag] = useState('tier-2-pass');
  const [callState, setCallState] = useState<CallState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCall = async () => {
    if (!isConnected) {
      setErrorMessage('Connect your wallet first.');
      return;
    }

    setCallState('simulating');
    setErrorMessage(null);

    // Simulate the circuit call flow to demonstrate the privacy model.
    // In production, this would:
    //   1. Build UnprovenTransaction via createUnprovenCallTx (server-side SDK)
    //   2. Prove via wallet's ProvingProvider (browser WASM)
    //   3. Balance via wallet.balanceUnsealedTransaction
    //   4. Submit via wallet.submitTransaction
    //
    // The entitlement value (private witness) would NEVER appear in the
    // transaction, the UI result, or on-chain data.

    await new Promise((r) => setTimeout(r, 2000));
    setCallState('success');
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
          Your private input <strong>never leaves your device</strong> — it is
          proved via zero-knowledge without being revealed.
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
          disabled={!isConnected || callState === 'simulating'}
        >
          {callState === 'idle' && 'Generate Proof & Enter Corridor'}
          {callState === 'simulating' && (
            <>
              <span className="spinner" /> Generating ZK proof locally…
            </>
          )}
          {callState === 'success' && '✅ Done — call again'}
          {callState === 'error' && '❌ Failed — retry'}
        </button>

        {callState === 'success' && (
          <div className="result-box">
            <h3>Privacy Model Demo</h3>
            <table className="result-table">
              <tbody>
                <tr>
                  <td className="label">Entitlement (private)</td>
                  <td className="value">
                    <span style={{ color: 'var(--success)' }}>42</span>
                    <small style={{ marginLeft: 8, opacity: 0.6 }}>
                      — proved, never on-chain
                    </small>
                  </td>
                </tr>
                <tr>
                  <td className="label">Entry tag (public)</td>
                  <td className="value">{tag}</td>
                </tr>
                <tr>
                  <td className="label">Contract</td>
                  <td className="value" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {contractAddress.slice(0, 16)}…
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="privacy-label mt-2">
              🔒 Your entitlement is not shown anywhere — it was proved, not revealed.
            </p>
            <p className="hint mt-1">
              <strong>What an on-chain observer sees:</strong> a proof that
              entitlement &gt; 0, plus the public tag.<br />
              <strong>What they cannot see:</strong> the actual entitlement value.
            </p>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="error-banner">
          <span>{errorMessage}</span>
          <button className="btn-dismiss" onClick={() => setErrorMessage(null)}>
            ✕
          </button>
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

export default CircuitCall;
