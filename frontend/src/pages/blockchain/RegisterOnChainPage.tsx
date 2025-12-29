import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SystemProgram } from "@solana/web3.js";
import axios from "axios";

import { getProvider, getProgram } from "../../lib/anchorClient";
import { deriveProductPda } from "../../lib/pdas";
import { encodeJsonBytes, sha256Bytes, type ProductMetadata } from "../../lib/metadata";

export default function RegisterOnChainPage() {
  const wallet = useWallet();

  console.log("wallets", (window as any).solana, (window as any).phantom);
  
  const [serialNo, setSerialNo] = useState("");
  const [productName, setProductName] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [category, setCategory] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");

  const manufacturerId = 2; // keep consistent for now

  async function cancelPending() {
  try {
    if (!serialNo.trim()) throw new Error("Serial number is required to cancel");

    const manufacturerId = 2;

    setStatus("Cancelling pending DB registration...");

    const resp = await axios.delete("http://localhost:3000/api/products/cancel-by-serial", {
      data: { manufacturerId, serialNo },
    });

    const cancelled = resp.data?.data;
    setStatus(
      `✅ Cancelled pending product\nproductId=${cancelled?.product_id}\nserial=${cancelled?.serial_no}`
    );

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
  let productId: number | null = null;

  try {
    if (!wallet.publicKey) throw new Error("Connect wallet first");
    if (!serialNo.trim()) throw new Error("Serial number is required");

    const manufacturerId = 2;

    // 1) Make / reuse DB row
    setStatus("1/5 Ensure product exists in DB...");

    try {
      const dbRes = await axios.post("http://localhost:3000/api/products/register", {
        manufacturerId,
        serialNo,
        productName,
        batchNo,
        category,
        manufactureDate,
        description,
      });

      productId = dbRes.data?.data?.product?.product_id;
    } catch (e: any) {
      // If serial already exists, reuse it (resume flow)
      if (e?.response?.status === 409) {
        const v = await axios.get("http://localhost:3000/api/products/verify", {
          params: { serial: serialNo },
        });
        // adjust if your verify returns a different shape
        productId = v.data?.data?.productId ?? v.data?.data?.product?.product_id;
      } else {
        throw e;
      }
    }

    if (!productId) throw new Error("Could not resolve productId from DB");

    // 2) Build metadata object (NO hashing on frontend)
    setStatus(`2/5 Build metadata... productId=${productId}`);

    const meta: ProductMetadata = {
      serialNo,
      productName,
      batchNo,
      category,
      manufactureDate,
      description,
    };

    // 3) Backend stores JSON + returns URI + SHA256 HEX (THIS is the hash we use on-chain)
    setStatus("3/5 Upload metadata to backend...");

    const metaRes = await axios.post("http://localhost:3000/api/products/metadata", {
      productId,
      metadata: meta,
    });

    const metadataUri: string = metaRes.data?.metadataUri;
    const hashHex: string = metaRes.data?.metadataSha256Hex;

    if (!metadataUri || !hashHex) throw new Error("Backend did not return metadataUri/hash");

    const metadataHash = Uint8Array.from(Buffer.from(hashHex, "hex"));


    // 4) Derive PDA and check if already exists on-chain
    setStatus("4/5 Check chain (resume if already exists)...");

    const [productPda, _bump, serialHash] = await deriveProductPda(wallet.publicKey, serialNo);

    const provider = getProvider(wallet);
    const program = getProgram(provider);

    const info = await provider.connection.getAccountInfo(productPda);

    // ✅ If PDA exists → RESUME/CONFIRM (do not register again)
    if (info) {
      setStatus(`PDA already exists. Resuming confirm...\nPDA=${productPda.toBase58()}`);

      const sigs = await provider.connection.getSignaturesForAddress(productPda, { limit: 1 });
      const txHash = sigs?.[0]?.signature ?? null;

      await axios.post(`http://localhost:3000/api/products/${productId}/confirm`, {
        manufacturerId,
        txHash,
        productPda: productPda.toBase58(),
      });

      setStatus(
        `✅ Resumed & confirmed!\nproductId=${productId}\nPDA=${productPda.toBase58()}\ntx=${txHash ?? "—"}`
      );
      return;
    }

    // 5) PDA not exists → do normal on-chain register
    setStatus("5/5 Registering on-chain...");

    const txSig = await program.methods
      .registerProduct(
        Array.from(serialHash),            // u8[32]
        Array.from(metadataHash),     // u8[32] from backend hash
        metadataUri                        // string
      )
      .accounts({
        product: productPda,
        manufacturer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // confirm DB
    await axios.post(`http://localhost:3000/api/products/${productId}/confirm`, {
      manufacturerId,
      txHash: txSig,
      productPda: productPda.toBase58(),
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
        <input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} placeholder="Serial No" style={{ padding: 10 }} />
        <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product Name" style={{ padding: 10 }} />
        <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="Batch No" style={{ padding: 10 }} />
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" style={{ padding: 10 }} />
        <input value={manufactureDate} onChange={(e) => setManufactureDate(e.target.value)} placeholder="Manufacture Date (YYYY-MM-DD)" style={{ padding: 10 }} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" style={{ padding: 10, minHeight: 90 }} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
      <button onClick={submit} style={{ padding: 10, flex: 1 }}>
        Submit to Blockchain
      </button>

      <button
        onClick={cancelPending}
        style={{ padding: 10, flex: 1, background: "#400", color: "#fff" }}
      >
        Cancel Pending
      </button>
    </div>

      

      <pre style={{ marginTop: 16, background: "#111", color: "#0f0", padding: 12, whiteSpace: "pre-wrap" }}>
        {status || "Status..."}
      </pre>
    </main>
  );
}
