import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is fully static; the Stellar reads happen client-side against a
// public RPC. No env vars, no server.
export default defineConfig({
  plugins: [react()],
  define: { global: "globalThis" },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: { stellar: ["@stellar/stellar-sdk/minimal"] },
      },
    },
  },
});
