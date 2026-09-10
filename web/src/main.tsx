import { Buffer } from "buffer";
import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";

// @stellar/stellar-sdk expects a global Buffer in the browser.
const g = globalThis as unknown as { Buffer?: typeof Buffer };
if (typeof g.Buffer === "undefined") {
  g.Buffer = Buffer;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
