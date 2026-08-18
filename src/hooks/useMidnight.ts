import { useState, useCallback, useRef } from 'react';

/**
 * Type declarations for the Midnight DApp Connector.
 * The Lace wallet extension injects `window.midnight` at runtime.
 */
declare global {
  interface Window {
    midnight?: Record<string, MidnightInitialAPI>;
  }
}

interface MidnightInitialAPI {
  rdns: string;
  name: string;
  icon: string;
  apiVersion: string;
  connect: (networkId: string) => Promise<MidnightConnectedAPI>;
}

interface MidnightConnectedAPI {
  getShieldedAddress: () => Promise<{ shieldedAddress: string }>;
  getUnshieldedAddress: () => Promise<{ unshieldedAddress: string }>;
  getUnshieldedBalances: () => Promise<Record<string, bigint>>;
  getShieldedBalances: () => Promise<Record<string, bigint>>;
  getConfiguration: () => Promise<{
    indexerUri: string;
    indexerWsUri: string;
    networkId: string;
    proofServerUri: string;
  }>;
  getProvingProvider: (zkConfig: unknown) => Promise<MidnightProvingProvider>;
  balanceUnsealedTransaction: (tx: string) => Promise<{ tx: string }>;
  submitTransaction: (tx: string) => Promise<void>;
  hintUsage: (methods: string[]) => Promise<void>;
  getConnectionStatus: () => Promise<{ status: string }>;
}

interface MidnightProvingProvider {
  proveTx: (unprovenTx: unknown) => Promise<unknown>;
}

const NETWORK_ID = 'testnet-02'; // Preprod network ID

function getWalletProviders(): MidnightInitialAPI[] {
  if (!window.midnight) return [];
  return Object.values(window.midnight);
}

function findLaceProvider(): MidnightInitialAPI | null {
  const providers = getWalletProviders();
  return providers.find((p) => p.rdns === 'io.lace.midnight') ?? providers[0] ?? null;
}

function isDAppConnectorError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as Record<string, unknown>).type === 'DAppConnectorAPIError'
  );
}

export function useMidnight() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [shieldedAddress, setShieldedAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unshieldedBalances, setUnshieldedBalances] = useState<Record<string, bigint>>({});
  const [shieldedBalances, setShieldedBalances] = useState<Record<string, bigint>>({});

  const connectedApiRef = useRef<MidnightConnectedAPI | null>(null);
  const walletRef = useRef<MidnightInitialAPI | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /** Connect to the Lace wallet and fetch addresses + balances. */
  const connect = useCallback(async () => {
    clearError();
    setIsConnecting(true);
    try {
      const wallet = findLaceProvider();
      if (!wallet) {
        setError(
          'No Midnight wallet detected. Please install the Lace wallet extension.',
        );
        setIsConnecting(false);
        return;
      }
      walletRef.current = wallet;

      const api = await wallet.connect(NETWORK_ID);
      connectedApiRef.current = api;

      const [unshielded, shielded, dust] = await Promise.all([
        api.getUnshieldedAddress(),
        api.getShieldedAddress(),
        api.getUnshieldedBalances(),
      ]);

      setWalletAddress(unshielded.unshieldedAddress);
      setShieldedAddress(shielded.shieldedAddress);
      setIsConnected(true);
      setUnshieldedBalances(dust);
    } catch (err) {
      if (isDAppConnectorError(err)) {
        const code = (err as { code?: string }).code;
        if (code === 'Rejected') {
          setError('Connection rejected by user.');
        } else {
          setError(`Wallet error: ${(err as { reason?: string }).reason ?? 'unknown'}`);
        }
      } else {
        setError(`Connection failed: ${(err as Error).message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [clearError]);

  /** Disconnect: clear all state (wallet handles session). */
  const disconnect = useCallback(() => {
    connectedApiRef.current = null;
    walletRef.current = null;
    setWalletAddress(null);
    setShieldedAddress(null);
    setIsConnected(false);
    setUnshieldedBalances({});
    setShieldedBalances({});
    clearError();
  }, [clearError]);

  /** Refresh balances without reconnecting. */
  const refreshBalances = useCallback(async () => {
    const api = connectedApiRef.current;
    if (!api) return;
    try {
      const [unshielded, shielded] = await Promise.all([
        api.getUnshieldedBalances(),
        api.getShieldedBalances(),
      ]);
      setUnshieldedBalances(unshielded);
      setShieldedBalances(shielded);
    } catch {
      // Silently ignore — balances may fail if wallet session expired.
    }
  }, []);

  return {
    walletAddress,
    shieldedAddress,
    isConnected,
    isConnecting,
    error,
    unshieldedBalances,
    shieldedBalances,
    connect,
    disconnect,
    refreshBalances,
    clearError,
    /** Internal: expose the connected API for circuit calls. */
    _connectedApi: connectedApiRef,
    _wallet: walletRef,
  };
}
