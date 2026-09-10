import { Buffer } from "buffer";
import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";

// @stellar/stellar-sdk expects a global Buffer in the browser.
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
