import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";

import { getProvider, getProgram } from "../../lib/anchorClient";

export default function ExecuteTransferPage() {
  const [params] = useSearchParams();
  const wallet = useWallet();

  const productPda = params.get("productPda") ?? "";
  const transferPda = params.get("transferPda") ?? "";

  const [status, setStatus] = useState("");

  async function execute() {
    try {
      if (!wallet.publicKey) throw new Error("Connect seller wallet");
      if (!productPda) throw new Error("Missing productPda");
      if (!transferPda) throw new Error("Missing transferPda");

      setStatus("Executing transfer (seller signs)...");

      const provider = getProvider(wallet);
      const program = getProgram(provider);

      await program.methods
        .executeTransfer()
        .accounts({
          fromOwner: wallet.publicKey,
          product: new PublicKey(productPda),
          transferRequest: new PublicKey(transferPda),
        })
        .rpc();

      setStatus("✅ Executed. Ownership updated.");
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? String(e)}`);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Seller: Execute Transfer</h1>

      <div style={{ marginTop: 10 }}>
        <WalletMultiButton />
        <div style={{ marginTop: 8, fontFamily: "monospace" }}>
          Connected: {wallet.publicKey?.toBase58() ?? "—"}
        </div>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <b>Product PDA:</b>{" "}
          <span style={{ fontFamily: "monospace" }}>{productPda}</span>
        </div>
        <div>
          <b>Transfer PDA:</b>{" "}
          <span style={{ fontFamily: "monospace" }}>{transferPda}</span>
        </div>

        <button onClick={execute} style={{ padding: 10, width: 240 }}>
          Execute (Sign)
        </button>

        <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#0f0", padding: 12 }}>
          {status || "Status..."}
        </pre>
      </div>
    </main>
  );
}
