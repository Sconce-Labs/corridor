import React from 'react';

interface WalletConnectProps {
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onClearError: () => void;
}

/** Truncate a Bech32m address for display: show first 12 + last 6 chars. */
function truncateAddress(addr: string): string {
  if (addr.length <= 22) return addr;
  return `${addr.slice(0, 12)}…${addr.slice(-6)}`;
}

const WalletConnect: React.FC<WalletConnectProps> = ({
  isConnected,
  isConnecting,
  walletAddress,
  error,
  onConnect,
  onDisconnect,
  onClearError,
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Wallet Connection</h2>
        <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      <div className="card-body">
        {isConnected && walletAddress ? (
          <div className="address-box">
            <p className="label">Wallet Address</p>
            <p className="address" title={walletAddress}>
              {truncateAddress(walletAddress)}
            </p>
            <p className="label mt-2">Full Address</p>
            <p className="address-full" title={walletAddress}>
              {walletAddress}
            </p>
          </div>
        ) : (
          <div className="address-box disconnected">
            <p className="label">No wallet connected</p>
            <p className="hint">
              Install the{' '}
              <a
                href="https://lace.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Lace wallet
              </a>{' '}
              extension, then click Connect.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="btn-dismiss" onClick={onClearError}>
            ✕
          </button>
        </div>
      )}

      <div className="card-actions">
        {isConnected ? (
          <button
            className="btn btn-danger"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onConnect}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting…' : 'Connect Lace Wallet'}
          </button>
        )}
      </div>
    </div>
  );
};

export default WalletConnect;
