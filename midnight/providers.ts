/**
 * Shared Midnight.js provider + compiled-contract setup for the Corridor
 * issuer-registry scripts (`deploy.ts`, `issuer.ts`, `read.ts`).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

import type { NetworkConfig } from './network';
import { unshieldedToken, type WalletContext } from './wallet';

export const CONTRACT_NAME = 'corridor';
/** Witness-free — admin/issuer control secrets are supplied per call. */
export const PRIVATE_STATE_ID = 'corridorIssuerRegistry';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const zkConfigPath = path.resolve(
  __dirname,
  '..',
  'contracts',
  'managed',
  CONTRACT_NAME,
);

const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

export async function loadContract() {
  if (!fs.existsSync(contractPath)) {
    console.error('\n❌ Contract not compiled! Run: npm run compile\n');
    process.exit(1);
  }
  const mod = await import(pathToFileURL(contractPath).href);
  const compiled = CompiledContract.make(CONTRACT_NAME, mod.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );
  return { mod, compiled };
}

export function createProviders(
  walletCtx: WalletContext,
  networkConfig: NetworkConfig,
) {
  const privateStatePassword =
    process.env.PRIVATE_STATE_PASSWORD?.trim() ||
    'Local-Devnet-Development-Placeholder-1';

  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        {
          shieldedSecretKeys: walletCtx.shieldedSecretKeys,
          dustSecretKey: walletCtx.dustSecretKey,
        },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'corridor-issuer-registry',
      accountId,
      privateStoragePasswordProvider: () => privateStatePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(
      networkConfig.indexer,
      networkConfig.indexerWS,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(
      networkConfig.proofServer,
      zkConfigProvider,
    ),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

export { unshieldedToken };
