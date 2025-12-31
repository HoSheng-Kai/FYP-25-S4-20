import React, { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram } from "@solana/web3.js";

import { getProvider, getProgram } from "../../lib/anchorClient";
import { deriveProductPda } from "../../lib/pdas";

export default function RegisterTestPage() {
  const wallet = useWallet();
  const [status, setStatus] = useState<string>("");

  async function register() {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");

      setStatus("Preparing...");

      const provider = getProvider(wallet);
      const program = getProgram(provider);

      // ✅ generate unique serial each click
      const serialNo = `TEST-${Date.now()}`;

      setStatus("Deriving PDA...");
      const [productPda, bump, serialHash] = await deriveProductPda(
        wallet.publicKey,
        serialNo
      );

      setStatus("Sending transaction (approve in Phantom)...");
      const sig = await program.methods
        .registerProduct(Array.from(serialHash))
        .accounts({
          product: productPda,
          manufacturer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus(
        `✅ Registered!\nserialNo=${serialNo}\nproductPda=${productPda.toBase58()}\nTx=${sig}`
      );
    } catch (e: any) {
      setStatus(`❌ Failed: ${e?.message ?? String(e)}`);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Register Test</h1>

      <div style={{ marginTop: 12 }}>
        <WalletMultiButton />
        <div style={{ marginTop: 8, fontFamily: "monospace" }}>
          Connected: {wallet.publicKey?.toBase58() ?? "—"}
        </div>
      </div>

      <button onClick={register} style={{ marginTop: 16, padding: 10 }}>
        Register Product
      </button>

      <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{status}</pre>
    </main>
  );
}
