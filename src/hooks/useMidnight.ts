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

const NETWORK_ID = (import.meta.env.VITE_NETWORK_ID as string) || 'preview';

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

      console.log(`[Corridor] Requesting connection to network: ${NETWORK_ID}`);
      console.log(`[Corridor] Wallet: ${wallet.name} (${wallet.rdns}), API v${wallet.apiVersion}`);
      const api = await wallet.connect(NETWORK_ID);
      console.log('[Corridor] Connected! Fetching addresses...');
      connectedApiRef.current = api;

      const [unshielded, dust] = await Promise.all([
        api.getUnshieldedAddress(),
        api.getUnshieldedBalances(),
      ]);

      // Shielded address — the spec uses getShieldedAddresses() (plural).
      let shieldedAddr: string | null = null;
      try {
        if (typeof (api as any).getShieldedAddresses === 'function') {
          const s = await (api as any).getShieldedAddresses();
          shieldedAddr = s?.shieldedAddress ?? null;
          console.log('[Corridor] Shielded address:', shieldedAddr);
        } else if (typeof (api as any).getShieldedAddress === 'function') {
          const s = await (api as any).getShieldedAddress();
          shieldedAddr = s?.shieldedAddress ?? null;
          console.log('[Corridor] Shielded address:', shieldedAddr);
        }
      } catch (e) {
        console.warn('[Corridor] Could not get shielded address:', e);
      }

      console.log('[Corridor] Unshielded address:', unshielded.unshieldedAddress);
      console.log('[Corridor] Balances:', dust);
      setWalletAddress(unshielded.unshieldedAddress);
      setShieldedAddress(shieldedAddr);
      setIsConnected(true);
      setUnshieldedBalances(dust);
    } catch (err) {
      console.error('[Corridor] Wallet connection error:', err);
      if (isDAppConnectorError(err)) {
        const code = (err as { code?: string }).code;
        const reason = (err as { reason?: string }).reason ?? '';
        if (code === 'Rejected' && !reason) {
          // Wallet rejected without explanation — usually a network mismatch.
          setError(
            `Wallet rejected the connection. Make sure your Lace wallet is set to the "${NETWORK_ID}" network. ` +
            `Open Lace → Settings → Network, select "${NETWORK_ID}", then try again.`,
          );
        } else {
          setError(`Wallet error [${code ?? '?'}]: ${reason || JSON.stringify(err)}`);
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
      const unshielded = await api.getUnshieldedBalances();
      setUnshieldedBalances(unshielded);
      if (typeof (api as any).getShieldedBalances === 'function') {
        const shielded = await (api as any).getShieldedBalances();
        setShieldedBalances(shielded);
      }
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
