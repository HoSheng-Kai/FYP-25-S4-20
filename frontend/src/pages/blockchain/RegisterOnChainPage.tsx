import React, { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SystemProgram } from "@solana/web3.js";
import axios from "axios";

import { getProvider, getProgram } from "../../lib/anchorClient";
import { deriveProductPda } from "../../lib/pdas";
import { encodeJsonBytes, sha256Bytes } from "../../lib/metadata";

type ProductMetadata = {
  serialNo: string;
  productName?: string;
  batchNo?: string;
  category?: string;
  manufactureDate?: string;
  description?: string;
};

const API_BASE = "http://localhost:3000";

export default function RegisterProductPage() {
  const wallet = useWallet();

  const [manufacturerId, setManufacturerId] = useState<number>(2);

  const [serialNo, setSerialNo] = useState("");
  const [productName, setProductName] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [category, setCategory] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [description, setDescription] = useState("");

  const [productId, setProductId] = useState<number | null>(null);

  // workflow flags
  const [draftStage, setDraftStage] = useState<"draft" | "confirmed" | "unknown">("unknown");
  const [txSig, setTxSig] = useState<string>("");
  const [productPdaStr, setProductPdaStr] = useState<string>("");
  const [metadataUri, setMetadataUri] = useState<string>("");
  const [metadataHashHex, setMetadataHashHex] = useState<string>("");
  const [isFinalized, setIsFinalized] = useState<boolean>(false);

  const [status, setStatus] = useState<string>("");

  const meta: ProductMetadata = useMemo(
    () => ({
      serialNo: serialNo.trim(),
      productName: productName.trim() || undefined,
      batchNo: batchNo.trim() || undefined,
      category: category.trim() || undefined,
      manufactureDate: manufactureDate || undefined,
      description: description.trim() || undefined,
    }),
    [serialNo, productName, batchNo, category, manufactureDate, description]
  );

  const isLocked = draftStage === "confirmed" || isFinalized;

  function prettyError(e: any) {
    return e?.response?.data
      ? JSON.stringify(e.response.data, null, 2)
      : e?.message ?? String(e);
  }

  // ==========================
  // A) SAVE DRAFT (DB ONLY)
  // ==========================
  async function saveDraft(): Promise<number> {
    const s = serialNo.trim();
    if (!s) throw new Error("Serial number is required");

    const dbRes = await axios.post(`${API_BASE}/api/products/draft`, {
      manufacturerId,
      serialNo: s,
      productName,
      batchNo,
      category,
      manufactureDate,
      description,
    });

    // tolerate multiple shapes
    const pid: number | null =
      dbRes.data?.data?.product?.product_id ??
      dbRes.data?.data?.productId ??
      dbRes.data?.data?.product?.productId ??
      null;

    if (!pid) {
      throw new Error(
        `Draft saved but could not parse productId.\nResponse:\n${JSON.stringify(dbRes.data, null, 2)}`
      );
    }

    setProductId(pid);
    setDraftStage("draft"); // your backend draft stage should be draft after register
    setIsFinalized(false);
    setTxSig("");
    setProductPdaStr("");
    setMetadataUri("");
    setMetadataHashHex("");

    return pid;
  }

  async function onSaveDraftClick() {
    try {
      if (isLocked) throw new Error("Product is locked (confirmed/finalized). Cannot edit draft.");
      setStatus("Saving draft (DB only)...");
      const pid = await saveDraft();
      setStatus(`✅ Draft saved.\nproductId=${pid}\nserial=${serialNo.trim()}\nstage=draft`);
    } catch (e: any) {
      setStatus(`❌ Save Draft failed:\n${prettyError(e)}`);
    }
  }
}

  // // -----------------------------
  // // B) RESUME (by serial)
  // // -----------------------------
  // async function resumeBySerial() {
  //   try {
  //     const s = serialNo.trim();
  //     if (!s) throw new Error("Enter serial number first");

  //     setStatus("Resuming from DB...");

  //     const r = await axios.get(`${API_BASE}/api/products/resume`, {
  //       params: { serial: s },
  //     });

  //     const d = r.data?.data;
  //     if (!d) throw new Error("Resume returned no data");

  //     setProductId(d.productId ?? null);
  //     setSerialNo(d.serialNo ?? s);
  //     setProductName(d.productName ?? "");
  //     setBatchNo(d.batchNo ?? "");
  //     setCategory(d.category ?? "");
  //     setManufactureDate(d.manufactureDate ? String(d.manufactureDate).slice(0, 10) : "");
  //     setDescription(d.description ?? "");

  //     // infer lock from tx hash if your resume returns it
  //     const confirmedOnChain = Boolean(d.txHash);
  //     setIsFinalized(false);
  //     setTxSig(d.txHash ?? "");
  //     setProductPdaStr(d.productPda ?? "");

  //     // stage: if your resume endpoint returns stage, use it; otherwise infer:
  //     const stage = d.stage as string | undefined;
  //     if (stage === "draft" || stage === "confirmed") {
  //       setDraftStage(stage);
  //     } else {
  //       // fallback inference
  //       setDraftStage(confirmedOnChain ? "confirmed" : "draft");
  //     }

  //     setStatus(`✅ Resumed.\nproductId=${d.productId}\ndbStatus=${d.status}\nchain=${d.blockchainStatus}`);
  //   } catch (e: any) {
  //     setStatus(`❌ Resume failed:\n${prettyError(e)}`);
  //   }
  // }

  // =======================================
  // C) DELETE DRAFT (only before confirm)
  // =======================================
  async function deleteDraft() {
    try {
      if (!productId) throw new Error("No productId. Save draft or resume first.");
      if (isLocked) throw new Error("Draft is locked (confirmed/on-chain). Cannot delete.");

      setStatus("Deleting draft (DB)...");

      const r = await axios.delete(`${API_BASE}/api/products/${productId}/draft`, {
        data: { manufacturerId }, // ✅ goes to req.body
        headers: { "Content-Type": "application/json" },
      });

      setStatus(`✅ Draft deleted.\n${JSON.stringify(r.data, null, 2)}`);
      setProductId(null);
      setDraftStage("unknown");
    } catch (e: any) {
      setStatus(`❌ Delete failed:\n${prettyError(e)}`);
    }
  }



  // =================================
  // D) CONFIRM DRAFT (locks draft)
  // =================================
  async function confirmDraft() {
    try {
      if (!productId) throw new Error("No productId. Save draft or resume first.");
      if (isLocked) throw new Error("Already locked.");

      setStatus("Confirming draft (DB)...");
      await axios.post(`${API_BASE}/api/products/${productId}/confirm-draft`, {
        manufacturerId,
      });

      setDraftStage("confirmed");
      setStatus(`✅ Draft confirmed.\nproductId=${productId}\nDraft is now LOCKED (no edits/deletes).`);
    } catch (e: any) {
      setStatus(`❌ Confirm draft failed:\n${prettyError(e)}`);
    }
  }

  // ======================================================================
  // E) SEND TO BLOCKCHAIN (after confirm) + confirm tx + finalize metadata
  // ======================================================================
  async function sendToBlockchain() {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      const s = serialNo.trim();
      if (!s) throw new Error("Serial number is required");
      if (!productId) throw new Error("No productId. Save draft first.");
      if (draftStage !== "confirmed") {
        throw new Error("Draft not confirmed yet. Click 'Confirm Draft' first.");
      }
      if (isFinalized) throw new Error("Already finalized.");

      // 1) Build metadata hash locally
      setStatus("1/4 Building metadata hash...");
      const metadataBytes = encodeJsonBytes(meta);
      const metadataHash = await sha256Bytes(metadataBytes);
      const hashHex = Buffer.from(metadataHash).toString("hex");
      const uri = `${API_BASE}/metadata/${hashHex}.json`;

      setMetadataHashHex(hashHex);
      setMetadataUri(uri);

      // 2) Register on-chain
      setStatus("2/4 Registering on-chain...");
      const [productPda, _bump, serialHash] = await deriveProductPda(wallet.publicKey, s);

    if (!metadataUri || !hashHex) throw new Error("Backend did not return metadataUri/hash");

      const sig = await program.methods
        .registerProduct(Array.from(serialHash), Array.from(metadataHash), uri)
        .accounts({
          product: productPda,
          manufacturer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxSig(sig);
      setProductPdaStr(productPda.toBase58());

      // 3) Confirm on-chain in DB
      setStatus("3/4 Finalizing metadata...");
      await axios.post(`${API_BASE}/api/products/${productId}/metadata-final`, {
        manufacturerId,
        metadata: meta,
      });
    

      // 4) Finalize metadata
      setStatus("4/4 Confirming on-chain tx in DB...");
      await axios.post(`${API_BASE}/api/products/${productId}/confirm`, {
        manufacturerId,
        txHash: sig,
        productPda: productPda.toBase58(),
      });

      setIsFinalized(true);

      setStatus(
        `✅ SENT + FINALIZED!\nproductId=${productId}\nPDA=${productPda.toBase58()}\ntx=${sig}\nuri=${uri}\nhash=${hashHex}\n\nProduct is now PERMANENTLY LOCKED.`
      );
    } catch (e: any) {
      setStatus(`❌ Send to blockchain failed:\n${prettyError(e)}`);
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
    <div style={{ maxWidth: 820, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Manufacturer Registration (Draft → Confirm → Blockchain)</h2>

      <div style={{ marginTop: 12 }}>
        <WalletMultiButton />
        <div style={{ marginTop: 6, fontFamily: "monospace" }}>
          Connected: {wallet.publicKey?.toBase58() ?? "—"}
        </div>
      </div>

      <div style={{ marginTop: 10, padding: 10, background: "#f7f7f7", borderRadius: 8 }}>
        <div><b>Stage:</b> {draftStage}</div>
        <div><b>Locked:</b> {isLocked ? "YES" : "NO"}</div>
        <div><b>Finalized:</b> {isFinalized ? "YES" : "NO"}</div>
        {txSig ? <div><b>Tx:</b> <span style={{ fontFamily: "monospace" }}>{txSig}</span></div> : null}
        {productPdaStr ? <div><b>PDA:</b> <span style={{ fontFamily: "monospace" }}>{productPdaStr}</span></div> : null}
        {metadataUri ? <div><b>Metadata URI:</b> <span style={{ fontFamily: "monospace" }}>{metadataUri}</span></div> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <label>
          Manufacturer ID
          <input
            type="number"
            value={manufacturerId}
            onChange={(e) => setManufacturerId(Number(e.target.value))}
            style={{ width: "100%", padding: 8 }}
            disabled={isFinalized}
          />
        </label>

        <label>
          Product ID (DB)
          <input
            type="text"
            value={productId ?? ""}
            readOnly
            placeholder="(auto after Save Draft / Resume)"
            style={{ width: "100%", padding: 8, background: "#f5f5f5" }}
          />
        </label>

        <label style={{ gridColumn: "1 / -1" }}>
          Serial No (editable until Confirm Draft)
          <input
            value={serialNo}
            onChange={(e) => setSerialNo(e.target.value)}
            placeholder="e.g. SER-008"
            style={{ width: "100%", padding: 8 }}
            disabled={isLocked}
          />
        </label>

        <label>
          Product Name
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            disabled={isLocked}
          />
        </label>

        <label>
          Batch No
          <input
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            disabled={isLocked}
          />
        </label>

        <label>
          Category
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            disabled={isLocked}
          />
        </label>

        <label>
          Manufacture Date
          <input
            type="date"
            value={manufactureDate}
            onChange={(e) => setManufactureDate(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            disabled={isLocked}
          />
        </label>

        <label style={{ gridColumn: "1 / -1" }}>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 8 }}
            disabled={isLocked}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button onClick={onSaveDraftClick} style={{ padding: "10px 14px" }} disabled={isLocked}>
          Save Draft (DB)
        </button>

        {/* <button onClick={resumeBySerial} style={{ padding: "10px 14px" }}>
          Resume by Serial
        </button> */}

        <button onClick={deleteDraft} style={{ padding: "10px 14px" }} disabled={isLocked || !productId}>
          Delete Draft
        </button>

        <button onClick={confirmDraft} style={{ padding: "10px 14px", fontWeight: 700 }} disabled={isLocked || !productId}>
          Confirm Draft (Lock)
        </button>

        <button
          onClick={sendToBlockchain}
          style={{ padding: "10px 14px", fontWeight: 800 }}
          disabled={draftStage !== "confirmed" || isFinalized || !productId}
          title={draftStage !== "confirmed" ? "Confirm draft first" : ""}
        >
          Send to Blockchain (Finalize & Lock)
        </button>
      </div>

      <pre
        style={{
          marginTop: 16,
          padding: 12,
          background: "#111",
          color: "#0f0",
          borderRadius: 8,
          whiteSpace: "pre-wrap",
        }}
      >
        {status || "Status log will appear here..."}
      </pre>
    </div>
  );
}
