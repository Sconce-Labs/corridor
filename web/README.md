# corridor-web

The public site for Corridor — what it is, how it works, live testnet state,
and an operator **clearance checker** that calls
`corridor_attestation.is_cleared` read-only from the browser.

Deployed to Vercel from the repo root (`../vercel.json` builds this directory).

```bash
npm install
npm run dev        # local dev server
npm run build      # -> dist/
npm run preview    # serve the build
npm run typecheck
```

## Layout

| File | Role |
|------|------|
| `src/App.tsx` | the whole page — hero, how-it-works, live panel, checker, privacy, footer |
| `src/corridor.ts` | read-only Soroban client (RPC simulation, no wallet) |
| `src/config.ts` | contract addresses — **keep in sync with `corridor-contracts/deployments/testnet.json`** |
| `src/Logo.tsx` | the Corridor mark, inlined |
| `public/favicon.svg` | copied from `../assets/favicon.svg` |

After a testnet redeploy, update `src/config.ts` (and `corridor-sdk/src/networks.ts`).
