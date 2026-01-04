import { Buffer } from "buffer";
(globalThis as any).Buffer = Buffer;

// import React, { useMemo } from "react";
import { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";


import "@solana/wallet-adapter-react-ui/styles.css";
import "./styles/globals.css";
import "./styles/transaction-history.css";

const endpoint = "https://api.devnet.solana.com";

function Root() {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false} // ✅ IMPORTANT: don’t auto-connect on load
        onError={(e: Error) => {
        console.error("WalletProvider onError:", e);
      }}
      >
        <WalletModalProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // ✅ Remove StrictMode for now (it can double-mount in dev)
  <Root />
);
