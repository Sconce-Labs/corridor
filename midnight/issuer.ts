/**
 * Admin operations on the Corridor issuer registry (Option B). Non-interactive.
 *
 *   npm run midnight:issuer -- init
 *   npm run midnight:issuer -- register   0x<issuerId> 0x<ctlHash>
 *   npm run midnight:issuer -- bump       0x<issuerId> <newEpoch>
 *   npm run midnight:issuer -- deregister 0x<issuerId>
 *
 * `issuerId` is Poseidon2(issuer_pk.x, issuer_pk.y) of the issuer's Grumpkin
 * signing key — the same id a Stellar corridor policy allowlists. Compute it
 * with `corridor-sdk`'s `issuerIdOf(publicKey(sk))`.
 *
 * The admin control secret is CORRIDOR_ADMIN_SECRET (hex), or — matching
 * deploy.ts — sha256("corridor-issuer-registry-admin/" + walletSeed).
 */
import { WebSocket } from 'ws';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  resolveNetwork,
  getOrCreateWallet,
  formatWalletBackupNotice,
  getDeployment,
} from './network';
import { createWallet, persistWalletState, unshieldedToken } from './wallet';
import { createProviders, loadContract, PRIVATE_STATE_ID } from './providers';

// @ts-expect-error wallet sync requires WebSocket
globalThis.WebSocket = WebSocket;

function bytes32(input: string, label: string): Uint8Array {
  const clean = input.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length === 0 || clean.length > 64) {
    throw new Error(`${label}: expected 1–64 hex digits, got "${input}"`);
  }
  return Uint8Array.from(Buffer.from(clean.padStart(64, '0'), 'hex'));
}

function adminSecret(seed: string): Uint8Array {
  const env = process.env.CORRIDOR_ADMIN_SECRET?.trim();
  if (env) return bytes32(env, 'CORRIDOR_ADMIN_SECRET');
  const h = createHash('sha256');
  h.update('corridor-issuer-registry-admin/');
  h.update(seed);
  return Uint8Array.from(h.digest());
}

async function main() {
  const [cmd, a, b] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const commands = ['init', 'register', 'bump', 'deregister'];
  if (!cmd || !commands.includes(cmd)) {
    console.error(`usage: npm run midnight:issuer -- <${commands.join('|')}> [args]`);
    process.exit(1);
  }

  const { network, config } = resolveNetwork({ argv: process.argv });
  const deployment = getDeployment(network);
  if (!deployment) {
    console.error(`No deploy on file for '${network}'. Run: npm run midnight:deploy -- --network ${network}`);
    process.exit(1);
  }

  const WALLET = getOrCreateWallet(network);
  const notice = formatWalletBackupNotice(WALLET, network);
  if (notice) console.log(notice);

  console.log(`\n  ${cmd} on ${network}  (contract ${deployment.address})\n`);
  console.log('  Syncing wallet…');
  const walletCtx = await createWallet({ network, networkConfig: config, seed: WALLET.seed });
  await walletCtx.wallet.waitForSyncedState();
  await persistWalletState(network, walletCtx);
  const bal = (await walletCtx.wallet.waitForSyncedState()).unshielded.balances[unshieldedToken().raw] ?? 0n;
  if (bal === 0n && network !== 'undeployed' && config.faucet) {
    console.error(`  ❌ wallet has 0 tNIGHT. Fund ${walletCtx.unshieldedKeystore.getBech32Address()} at ${config.faucet}`);
    await walletCtx.wallet.stop();
    process.exit(1);
  }

  const { compiled } = await loadContract();
  const providers = createProviders(walletCtx, config);
  const deployed: any = await findDeployedContract(providers, {
    compiledContract: compiled as any,
    contractAddress: deployment.address,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: {},
  });

  const sk = adminSecret(WALLET.seed);
  let tx: any;
  try {
    if (cmd === 'init') {
      tx = await deployed.callTx.initAdmin(sk);
    } else if (cmd === 'register') {
      tx = await deployed.callTx.registerIssuer(sk, bytes32(a, 'issuerId'), bytes32(b, 'ctlHash'));
    } else if (cmd === 'bump') {
      if (!/^\d+$/.test(b ?? '')) throw new Error('bump: newEpoch must be a positive integer');
      tx = await deployed.callTx.adminBumpEpoch(sk, bytes32(a, 'issuerId'), BigInt(b));
    } else if (cmd === 'deregister') {
      tx = await deployed.callTx.deregisterIssuer(sk, bytes32(a, 'issuerId'));
    }
    console.log(`\n  ✅ ${cmd} submitted — tx ${tx?.public?.txHash ?? tx?.public?.txId ?? 'ok'}\n`);
  } catch (err: any) {
    console.error(`\n  ❌ ${cmd} failed: ${err?.message ?? err}\n`);
    await walletCtx.wallet.stop();
    process.exit(1);
  }

  await persistWalletState(network, walletCtx);
  await walletCtx.wallet.stop();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
