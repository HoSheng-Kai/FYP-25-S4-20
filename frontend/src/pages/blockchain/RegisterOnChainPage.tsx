// src/pages/blockchain/RegisterOnChainPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SystemProgram } from "@solana/web3.js";
import axios from "axios";
import { API_ROOT } from "../../config/api";
import { Buffer } from "buffer";
import { useSearchParams } from "react-router-dom";

import { getProvider, getProgram } from "../../lib/anchorClient";
import { deriveProductPda } from "../../lib/pdas";

type ProductMetadata = {
  serialNo: string;
  productName?: string;
  batchNo?: string;
  category?: string;
  manufactureDate?: string;
  description?: string;
};

type EditProductData = {
  productId: number;
  serialNumber: string;
  productName: string | null;
  batchNumber: string | null;
  category: string | null;
  manufactureDate: string | null;
  productDescription: string | null;
  status: string;
  registeredOn: string;
  qrImageUrl?: string;
  // ✅ optional if you add it on backend edit endpoint
  stage?: string | null;
  txHash?: string | null;
  productPda?: string | null;
};

type GetEditResponse = {
  success: boolean;
  data?: EditProductData;
  error?: string;
  details?: string;
};

const API_BASE = API_ROOT.replace(/\/api\s*$/, "");

export default function RegisterOnChainPage() {
  const wallet = useWallet();
  const [searchParams] = useSearchParams();

  // ✅ fixed: manufacturerId is not editable here
  const manufacturerId = useMemo(() => Number(localStorage.getItem("userId")) || 0, []);

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

  // locked after confirm-draft OR after finalized
  const isLocked = draftStage === "confirmed" || isFinalized;

  function prettyError(e: any) {
    return e?.response?.data
      ? JSON.stringify(e.response.data, null, 2)
      : e?.message ?? String(e);
  }

  // ==========================
  // AUTO LOAD BY ?productId=
  // ==========================
  useEffect(() => {
    const pidStr = searchParams.get("productId");
    if (!pidStr) return;

    const pid = Number(pidStr);
    if (!Number.isFinite(pid) || pid <= 0) return;

    setProductId(pid);
    void loadProduct(pid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProduct(pid: number) {
    try {
      setStatus("Loading product from DB...");
      const res = await axios.get<GetEditResponse>(`${API_BASE}/api/products/${pid}/edit`, {
        params: { manufacturerId },
      });

      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || "Failed to load product");
      }

      const d = res.data.data;

      setSerialNo(d.serialNumber ?? "");
      setProductName(d.productName ?? "");
      setBatchNo(d.batchNumber ?? "");
      setCategory(d.category ?? "");
      setManufactureDate(
        d.manufactureDate ? new Date(d.manufactureDate).toISOString().slice(0, 10) : ""
      );
      setDescription(d.productDescription ?? "");

      // ✅ If backend provides stage, use it; else assume confirmed when opened from list
      const stage = (d.stage || "").toLowerCase();
      if (stage === "confirmed") setDraftStage("confirmed");
      else if (stage === "draft") setDraftStage("draft");
      else setDraftStage("confirmed"); // fallback so send button can work if you navigated from eligible list

      // If already on-chain, show info and lock
      if (d.txHash) {
        setIsFinalized(true);
        setTxSig(d.txHash);
        if (d.productPda) setProductPdaStr(d.productPda);
      }

      setStatus(`✅ Loaded productId=${pid}.`);
    } catch (e: any) {
      setStatus(`❌ Load product failed:\n${prettyError(e)}`);
    }
  }

  // ==========================
  // A) SAVE DRAFT (DB ONLY)
  // ==========================
  async function saveDraft(): Promise<number> {
    const s = serialNo.trim();
    if (!s) throw new Error("Serial number is required");
    if (isLocked) throw new Error("Product is locked (confirmed/finalized).");

    const dbRes = await axios.post(`${API_BASE}/api/products/draft`, {
      manufacturerId,
      serialNo: s,
      productName,
      batchNo,
      category,
      manufactureDate,
      description,
    });

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
    setDraftStage("draft");
    setIsFinalized(false);
    setTxSig("");
    setProductPdaStr("");
    setMetadataUri("");
    setMetadataHashHex("");

    return pid;
  }

  async function onSaveDraftClick() {
    try {
      setStatus("Saving draft (DB only)...");
      const pid = await saveDraft();
      setStatus(`✅ Draft saved.\nproductId=${pid}\nserial=${serialNo.trim()}\nstage=draft`);
    } catch (e: any) {
      setStatus(`❌ Save Draft failed:\n${prettyError(e)}`);
    }
  }

  // ==========================
  // B) DELETE DRAFT
  // ==========================
  async function deleteDraft() {
    try {
      if (!productId) throw new Error("No productId. Save draft first.");
      if (isLocked) throw new Error("Draft is locked (confirmed/finalized). Cannot delete.");

      setStatus("Deleting draft (DB)...");

      const r = await axios.delete(`${API_BASE}/api/products/${productId}/draft`, {
        data: { manufacturerId },
        headers: { "Content-Type": "application/json" },
      });

      setStatus(`✅ Draft deleted.\n${JSON.stringify(r.data, null, 2)}`);
      setProductId(null);
      setDraftStage("unknown");
    } catch (e: any) {
      setStatus(`❌ Delete failed:\n${prettyError(e)}`);
    }
  }

  // ==========================
  // C) CONFIRM DRAFT (LOCKS)
  // ==========================
  async function confirmDraft() {
    try {
      if (!productId) throw new Error("No productId. Save draft first.");
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

  // ==========================================================
  // D) SEND TO BLOCKCHAIN (finalize metadata first, then chain, then DB confirm)
  // ==========================================================
  async function sendToBlockchain() {
    try {
      if (!wallet.publicKey) throw new Error("Connect wallet first");
      const s = serialNo.trim();
      if (!s) throw new Error("Serial number is required");
      if (!productId) throw new Error("No productId. Save draft first.");
      if (draftStage !== "confirmed") throw new Error("Draft not confirmed. Click 'Confirm Draft' first.");
      if (isFinalized) throw new Error("Already finalized.");

      // 1) finalize metadata first (backend creates metadata file + returns uri + hash)
      setStatus("1/3 Finalizing metadata (backend)...");
      const metaRes = await axios.post(`${API_BASE}/api/products/${productId}/metadata-final`, {
        manufacturerId,
        metadata: meta,
      });

      const uri: string = metaRes.data?.metadataUri;
      const hashHex: string = metaRes.data?.metadataSha256Hex;

      if (!uri || !hashHex) {
        throw new Error(
          `metadata-final did not return metadataUri/metadataSha256Hex.\nResponse:\n${JSON.stringify(metaRes.data, null, 2)}`
        );
      }

      setMetadataUri(uri);
      setMetadataHashHex(hashHex);

      const metadataHash = Buffer.from(hashHex, "hex");

      // 2) on-chain register
      setStatus("2/3 Registering on-chain...");
      const [productPda, _bump, serialHash] = await deriveProductPda(wallet.publicKey, s);

      const provider = getProvider(wallet);
      const program = getProgram(provider);

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

      // 3) confirm tx in DB
      setStatus("3/3 Confirming on-chain tx in DB...");
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
        <div><b>Manufacturer ID:</b> {manufacturerId}</div>
        <div><b>Stage:</b> {draftStage}</div>
        <div><b>Locked:</b> {isLocked ? "YES" : "NO"}</div>
        <div><b>Finalized:</b> {isFinalized ? "YES" : "NO"}</div>
        {txSig ? <div><b>Tx:</b> <span style={{ fontFamily: "monospace" }}>{txSig}</span></div> : null}
        {productPdaStr ? <div><b>PDA:</b> <span style={{ fontFamily: "monospace" }}>{productPdaStr}</span></div> : null}
        {metadataUri ? <div><b>Metadata URI:</b> <span style={{ fontFamily: "monospace" }}>{metadataUri}</span></div> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <label>
          Product ID (DB)
          <input
            type="text"
            value={productId ?? ""}
            readOnly
            placeholder="(auto after Save Draft / or from ?productId=)"
            style={{ width: "100%", padding: 8, background: "#f5f5f5" }}
          />
        </label>

        <div />

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
