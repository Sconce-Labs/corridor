// Corridor testnet deployment. Kept in sync with
// corridor-contracts/deployments/testnet.json — update both together after a
// redeploy (corridor ROADMAP M2).
//
// The legacy 2026-09-10 stack below had its corridor 0x…04 policy swapped to
// the real UltraHonk verifier on 2026-10-07, and corridor 0x…05 was registered
// on it with the real verifier. verifier_mock backs no corridor (tests only).

export const NETWORK = {
  passphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
} as const;

export const CONTRACTS = {
  registry: "CDGMQ24E6OIBZB3EKJN5TUA5POYE6D5FNBL2II6SRLTYF32TE4HIEXJ6",
  attestation: "CCHWKVRCEKPJHEXREP5SCZ4TEKNBFYEFYA2VR3SET5AMG4WOC76LDL4K",
  verifier: "CCUWJKEAVQ2CSJWHJ6LEQYZUWRB7VGKUV6ETQJI4NZC2CKXVQZZVO2VW",
} as const;

// The demo corridor the site reads live. Corridor 0x…05 was registered with
// the real verifier; its policy is read in the "Live" panel.
export const DEMO_CORRIDOR_ID =
  "0x0000000000000000000000000000000000000000000000000000000000000005";

// A nullifier actually cleared by a real bb 0.87.0 UltraHonk proof on
// corridor 0x…05 (2026-10-07, tx 948b6084…de4c) — pre-filled in the clearance
// checker so the demo shows a genuine pass.
export const DEMO_NULLIFIER =
  "0x1383085a55152ea6c3d5bbcb7a8d894dca0e28c2772a08659f195e1b6ada9cc7";

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
