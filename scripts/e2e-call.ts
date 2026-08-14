// Temporary end-to-end proof: connects to the deployed counter contract on
// Preview, reads the ledger, submits enterCorridor calls, and re-reads.
// Deleted after use.
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import { Buffer } from 'buffer';

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { resolveNetwork, getOrCreateWallet, getDeployment } from '../src/network';
import { createWallet, persistWalletState } from '../src/wallet';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

globalThis.WebSocket = WebSocket;
const PRIVATE_STATE_ID = 'corridorPrivateState';

const { network, config: networkConfig } = resolveNetwork();
const WALLET = getOrCreateWallet(network);
const deployment = getDeployment(network);
if (!deployment) {
  console.error(`No deploy on file for ${network}.`);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'counter');
const Counter = await import(pathToFileURL(path.join(zkConfigPath, 'contract', 'index.js')).href);
const compiledContract = CompiledContract.make('counter', Counter.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

console.log(`[1] syncing wallet on ${network}...`);
const walletCtx = await createWallet({ network, networkConfig, seed: WALLET.seed });
await walletCtx.wallet.waitForSyncedState();
await persistWalletState(network, walletCtx);
console.log('[2] wallet synced');

const privateStatePassword = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';
const walletProvider = {
  getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
  getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
  async balanceTx(tx: any, ttl?: Date) {
    const recipe = await walletCtx.wallet.balanceUnboundTransaction(
      tx,
      { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
      { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
    );
    return walletCtx.wallet.finalizeRecipe(recipe);
  },
  submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
};
const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();
const providers = {
  privateStateProvider: levelPrivateStateProvider({
    privateStateStoreName: 'corridor-state',
    accountId,
    privateStoragePasswordProvider: () => privateStatePassword,
  }),
  publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
  zkConfigProvider,
  proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
  walletProvider,
  midnightProvider: walletProvider,
};

async function readState(label: string) {
  const cs = await providers.publicDataProvider.queryContractState(deployment!.address);
  if (!cs) {
    console.log(`[${label}] no contract state found`);
    return;
  }
  const l = Counter.ledger(cs.data);
  console.log(`[${label}] passes=${l.passes} lastEntryTag="${Buffer.from(l.lastEntryTag).toString()}"`);
}

console.log(`[3] connecting to contract ${deployment.address}...`);
const deployed: any = await findDeployedContract(providers, {
  compiledContract: compiledContract as any,
  contractAddress: deployment.address,
  privateStateId: PRIVATE_STATE_ID,
  initialPrivateState: {},
});
console.log('[4] connected');

await readState('before');

for (const [entitlement, tag] of [
  [42n, 'e2e-proof-1'],
  [7n, 'e2e-proof-2'],
] as const) {
  console.log(`[5] calling enterCorridor(entitlement=${entitlement}, tag="${tag}")...`);
  const tx = await deployed.callTx.enterCorridor(entitlement, tag);
  console.log(`[6] submitted tx ${tx.public.txId} at block ${tx.public.blockHeight}`);
  // Give the indexer a moment to pick up the new state before re-reading.
  await new Promise((r) => setTimeout(r, 12_000));
  await readState('after');
}

console.log('[7] done — stopping wallet');
await walletCtx.wallet.stop();
process.exit(0);
