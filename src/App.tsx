import React from 'react';
import WalletConnect from './components/WalletConnect';
import CircuitCall from './components/CircuitCall';
import { useMidnight } from './hooks/useMidnight';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;
const NETWORK = (import.meta.env.VITE_NETWORK_ID as string) || 'preview';

const App: React.FC = () => {
  const {
    walletAddress,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    clearError,
  } = useMidnight();

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">🌑</div>
        <h1>Corridor</h1>
        <p className="tagline">
          Prove you're cleared to pass — without revealing who you are.
        </p>
        <p className="network-badge">Network: {NETWORK}</p>
      </header>

      <main className="app-main">
        <section className="step">
          <span className="step-number">1</span>
          <WalletConnect
            isConnected={isConnected}
            isConnecting={isConnecting}
            walletAddress={walletAddress}
            error={error}
            onConnect={connect}
            onDisconnect={disconnect}
            onClearError={clearError}
          />
        </section>

        <section className="step">
          <span className="step-number">2</span>
          <CircuitCall
            isConnected={isConnected}
            contractAddress={CONTRACT_ADDRESS}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Powered by{' '}
          <a href="https://midnight.network" target="_blank" rel="noopener noreferrer">
            Midnight Network
          </a>{' '}
          · Zero-knowledge proofs generated in your browser.
        </p>
      </footer>
    </div>
  );
};

export default App;
