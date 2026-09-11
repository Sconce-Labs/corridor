/**
 * Read the Corridor issuer registry off the Midnight indexer — no wallet, no
 * proofs. Prints the admin key hash, every registered issuer id, its current
 * credential epoch, and the transparency counter.
 *
 *   npm run midnight:read -- --network preprod
 *   npm run midnight:read -- --issuer 0x<id>     # just one issuer's epoch
 */
import { WebSocket } from 'ws';
import { Buffer } from 'node:buffer';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { resolveNetwork, getDeployment } from './network';
import { loadContract } from './providers';

// @ts-expect-error wallet-sdk / indexer WS
globalThis.WebSocket = WebSocket;

const hex = (b: Uint8Array) => '0x' + Buffer.from(b).toString('hex');

async function main() {
  const { network, config } = resolveNetwork({ argv: process.argv });
  const deployment = getDeployment(network);
  if (!deployment) {
    console.error(`No deploy on file for '${network}'. Run: npm run midnight:deploy -- --network ${network}`);
    process.exit(1);
  }

  const only = argValue('--issuer');
  const { mod } = await loadContract();
  const pdp = indexerPublicDataProvider(config.indexer, config.indexerWS);

  const state = await pdp.queryContractState(deployment.address);
  if (!state) {
    console.error(`No contract state at ${deployment.address} on ${network}.`);
    process.exit(1);
  }
  const led = mod.ledger(state.data);

  console.log(`\n  network:  ${network}`);
  console.log(`  contract: ${deployment.address}`);
  console.log(`  admin:    ${hex(led.admin)}`);
  console.log(`  attested: ${led.attested.toString()}\n`);

  const rows: Array<[string, string]> = [];
  for (const id of led.issuers) {
    const idHex = hex(id);
    if (only && idHex !== normalizeHex(only)) continue;
    const epoch = led.issuerEpoch.member(id) ? led.issuerEpoch.lookup(id).toString() : '—';
    rows.push([idHex, epoch]);
  }

  if (rows.length === 0) {
    console.log(only ? `  issuer ${only} is not registered\n` : '  no issuers registered\n');
    return;
  }
  console.log('  issuer id                                                             epoch');
  console.log('  ' + '─'.repeat(78));
  for (const [id, e] of rows) console.log(`  ${id}  ${e}`);
  console.log('');
}

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}
function normalizeHex(s: string): string {
  return '0x' + s.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
