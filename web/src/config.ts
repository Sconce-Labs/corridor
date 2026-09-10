// Corridor testnet deployment. Kept in sync with
// corridor-contracts/deployments/testnet.json — update both together after a
// redeploy (corridor ROADMAP M2).

export const NETWORK = {
  passphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
} as const;

export const CONTRACTS = {
  registry: "CAV6DMVCBOU5DGQVFSPU2UIF62LNFW7PWAGC7HCPHVIUO6SWRPSX3B65",
  attestation: "CD76SRVQS6QSDFL2DYWGPK2JGWQPZO4NBFOGRDR5UWLGCABLBONNUXK5",
  verifierMock: "CBN7N7AT7CPAA7MBIAULEBY3GIV7NNB3XPNEUJSIAHFIM5BJ7GIGK46Y",
} as const;

// A corridor the site reads live as a demo. Registered by the deploy script's
// smoke test.
export const DEMO_CORRIDOR_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000004";

export const LINKS = {
  org: "https://github.com/Sconce-Labs",
  hub: "https://github.com/Sconce-Labs/corridor",
  contracts: "https://github.com/Sconce-Labs/corridor-contracts",
  circuits: "https://github.com/Sconce-Labs/corridor-circuits",
  sdk: "https://github.com/Sconce-Labs/corridor-sdk",
  architecture:
    "https://github.com/Sconce-Labs/corridor/blob/main/ARCHITECTURE.md",
  accumulator:
    "https://github.com/Sconce-Labs/corridor/blob/main/docs/CREDENTIAL_ACCUMULATOR.md",
  drips: "https://www.drips.network/wave/stellar",
  deployment:
    "https://github.com/Sconce-Labs/corridor-contracts/blob/main/deployments/testnet.json",
} as const;

export const stellarExpert = (contract: string) =>
  `https://stellar.expert/explorer/testnet/contract/${contract}`;

export const isDeployed = !CONTRACTS.registry.startsWith("__");
