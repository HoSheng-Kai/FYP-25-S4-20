import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SystemProgram } from "@solana/web3.js";
import axios from "axios";
import { Buffer } from "buffer";

import { getProvider, getProgram } from "../../lib/anchorClient";
import { deriveProductPda } from "../../lib/pdas";
import { encodeJsonBytes, sha256Bytes, type ProductMetadata } from "../../lib/metadata";

export default function RegisterOnChainPage() {
  const wallet = useWallet();

  const [serialNo, setSerialNo] = useState("");
  const [productName, setProductName] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [category, setCategory] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");

  const manufacturerId = 2;

  async function cancelPending() {
    try {
      const serialToUse = serialNo.trim();
      if (!serialToUse) throw new Error("Serial number is required to cancel");

      setStatus("Cancelling pending DB registration...");

      const resp = await axios.delete("http://localhost:3000/api/products/cancel-by-serial", {
        data: { manufacturerId, serialNo: serialToUse },
      });

      setStatus(`✅ Cancelled pending product\n${JSON.stringify(resp.data, null, 2)}`);

      // optional: clear form
      setSerialNo("");
      setProductName("");
      setBatchNo("");
      setCategory("");
      setManufactureDate("");
      setDescription("");
    } catch (e: any) {
      const msg = e?.response?.data
        ? JSON.stringify(e.response.data, null, 2)
        : (e?.message ?? String(e));
      setStatus(`❌ Cancel failed:\n${msg}`);
    }
  }

  async function submit() {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");

      const serialToUse = serialNo.trim();
      if (!serialToUse) throw new Error("Serial number is required");

      // 1) DB register (pending)
      setStatus("1/4 Ensure product exists in DB...");

      const dbRes = await axios.post("http://localhost:3000/api/products/register", {
        manufacturerId,
        serialNo: serialToUse,
        productName,
        batchNo,
        category,
        manufactureDate,
        description,
      });

      const productId: number | undefined = dbRes.data?.data?.product?.product_id;
      if (!productId) throw new Error("Could not resolve productId from DB");

      // 2) Build metadata + hash locally
      setStatus("2/4 Build metadata + hash locally...");

      const meta: ProductMetadata = {
        serialNo: serialToUse,
        productName,
        batchNo,
        category,
        manufactureDate,
        description,
      };

      const metadataBytes = encodeJsonBytes(meta);
      const metadataHash = await sha256Bytes(metadataBytes);
      const hashHex = Buffer.from(metadataHash).toString("hex");

      // ✅ hash-based metadataUri (will exist AFTER metadata-final)
      const metadataUri = `http://localhost:3000/metadata/${hashHex}.json`;

      // 3) Register on-chain
      setStatus("3/4 Registering on-chain...");

      const [productPda, _bump, serialHash] = await deriveProductPda(wallet.publicKey, serialToUse);

      const provider = getProvider(wallet);
      const program = getProgram(provider);

      const txSig = await program.methods
        .registerProduct(Array.from(serialHash), Array.from(metadataHash), metadataUri)
        .accounts({
          product: productPda,
          manufacturer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // 4) Confirm DB + finalize metadata in backend
      setStatus("4/4 Confirming in DB + finalizing metadata...");

      await axios.post(`http://localhost:3000/api/products/${productId}/confirm`, {
        manufacturerId,
        txHash: txSig,
        productPda: productPda.toBase58(),
      });

      await axios.post(`http://localhost:3000/api/products/${productId}/metadata-final`, {
        manufacturerId,
        metadata: meta,
      });

      setStatus(
        `✅ Done!\nproductId=${productId}\nPDA=${productPda.toBase58()}\ntx=${txSig}\nuri=${metadataUri}\nhash=${hashHex}`
      );
    } catch (e: any) {
      const msg = e?.response?.data
        ? JSON.stringify(e.response.data, null, 2)
        : (e?.message ?? String(e));
      setStatus(`❌ Failed:\n${msg}`);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Register Product (DB → On-chain)</h1>

      <div style={{ marginTop: 12 }}>
        <WalletMultiButton />
        <div style={{ marginTop: 6, fontFamily: "monospace" }}>
          Connected: {wallet.publicKey?.toBase58() ?? "—"}
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <input
          value={serialNo}
          onChange={(e) => setSerialNo(e.target.value)}
          placeholder="Serial No"
          style={{ padding: 10 }}
        />

        <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product Name" style={{ padding: 10 }} />
        <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="Batch No" style={{ padding: 10 }} />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" style={{ padding: 10 }} />
        <input value={manufactureDate} onChange={(e) => setManufactureDate(e.target.value)} placeholder="Manufacture Date (YYYY-MM-DD)" style={{ padding: 10 }} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" style={{ padding: 10, minHeight: 90 }} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={submit} style={{ padding: 10, flex: 1 }}>
          Submit to Blockchain
        </button>

        <button
          type="button"
          onClick={() => {
            setSerialNo("");
            setProductName("");
            setBatchNo("");
            setCategory("");
            setManufactureDate("");
            setDescription("");
            setStatus("");
          }}
          style={{ padding: 10 }}
        >
          Reset
        </button>

        <button onClick={cancelPending} style={{ padding: 10, flex: 1, background: "#400", color: "#fff" }}>
          Cancel Pending
        </button>
      </div>

      <pre style={{ marginTop: 16, background: "#111", color: "#0f0", padding: 12, whiteSpace: "pre-wrap" }}>
        {status || "Status..."}
      </pre>
    </main>
  );
}
