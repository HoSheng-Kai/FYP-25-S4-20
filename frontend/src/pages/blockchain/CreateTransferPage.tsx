import React, { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";

import { getProvider, getProgram } from "../../lib/anchorClient";
import { deriveProductPda, deriveTransferPda } from "../../lib/pdas";

export default function CreateTransferPage() {
  const wallet = useWallet();

  const [serialNo, setSerialNo] = useState("");
  const [manufacturer, setManufacturer] = useState(""); // manufacturer pubkey
  const [buyer, setBuyer] = useState(""); // buyer pubkey

  const [productPda, setProductPda] = useState("");
  const [transferPda, setTransferPda] = useState("");
  const [status, setStatus] = useState("");

  const acceptLink = useMemo(() => {
    if (!transferPda || !productPda || !buyer || !wallet.publicKey) return "";
    const url = new URL(window.location.origin + "/blockchain/accept");
    url.searchParams.set("productPda", productPda);
    url.searchParams.set("transferPda", transferPda);
    url.searchParams.set("seller", wallet.publicKey.toBase58());
    url.searchParams.set("buyer", buyer);
    return url.toString();
  }, [transferPda, productPda, buyer, wallet.publicKey]);

  async function propose() {
    try {
      if (!wallet.publicKey) throw new Error("Connect seller wallet first");
      if (!serialNo) throw new Error("Enter serial number");
      if (!manufacturer) throw new Error("Enter manufacturer pubkey");
      if (!buyer) throw new Error("Enter buyer pubkey");

      const manufacturerPk = new PublicKey(manufacturer);
      const buyerPk = new PublicKey(buyer);

      // optional UX check: seller must be current owner (your program may enforce this)
      const sellerPk = wallet.publicKey;

      setStatus("Deriving PDAs...");
    //   const [product] = await deriveProductPda(manufacturerPk, serialNo);
    //   const [transfer] = await deriveTransferPda(product, sellerPk, buyerPk);
    const { productPda } = await deriveProductPda(manufacturerPk, serialNo);
    const { transferPda } = await deriveTransferPda(productPda, sellerPk, buyerPk);

      setProductPda(productPda.toBase58());
      setTransferPda(transferPda.toBase58());

      setStatus("Proposing transfer (seller signs)...");
      const provider = getProvider(wallet);
      const program = getProgram(provider);

      await program.methods
        .proposeTransfer()
        .accounts({
          fromOwner: sellerPk,
          productPda,
          toOwner: buyerPk,
          transferRequest: transferPda,
          systemProgram: new PublicKey("11111111111111111111111111111111"),
        })
        .rpc();

      setStatus("✅ Proposed! Send buyer the accept link.");
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? String(e)}`);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Seller: Propose Transfer</h1>

      <div style={{ marginTop: 10 }}>
        <WalletMultiButton />
        <div style={{ marginTop: 8, fontFamily: "monospace" }}>
          Connected: {wallet.publicKey?.toBase58() ?? "—"}
        </div>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <div style={{ display: "grid", gap: 10 }}>
        <label>
          <b>Serial Number</b>
          <input
            value={serialNo}
            onChange={(e) => setSerialNo(e.target.value)}
            style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
            placeholder="e.g. NIKE-AIR-001"
          />
        </label>

        <label>
          <b>Manufacturer Pubkey</b>
          <input
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
            placeholder="manufacturer wallet address (base58)"
          />
        </label>

        <label>
          <b>Buyer Pubkey</b>
          <input
            value={buyer}
            onChange={(e) => setBuyer(e.target.value)}
            style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
            placeholder="buyer wallet address (base58)"
          />
        </label>

        <button onClick={propose} style={{ padding: 10, width: 260 }}>
          Propose Transfer (Sign)
        </button>

        {productPda && (
          <div>
            <b>Product PDA:</b> <span style={{ fontFamily: "monospace" }}>{productPda}</span>
          </div>
        )}
        {transferPda && (
          <div>
            <b>Transfer PDA:</b> <span style={{ fontFamily: "monospace" }}>{transferPda}</span>
          </div>
        )}

        {acceptLink && (
          <div style={{ marginTop: 10 }}>
            <b>Buyer Accept Link:</b>
            <div style={{ fontFamily: "monospace", marginTop: 6, wordBreak: "break-all" }}>
              {acceptLink}
            </div>
          </div>
        )}

        <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#0f0", padding: 12 }}>
          {status || "Status..."}
        </pre>
      </div>
    </main>
  );
}
