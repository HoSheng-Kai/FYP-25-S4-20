import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SystemProgram } from "@solana/web3.js";
import axios from "axios";
import { API_ROOT } from "../../config/api";
import { Buffer } from "buffer";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
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
  registeredOn: string;
  qrImageUrl?: string;

  stage?: string | null;

  // handle both below camelCase or snake_case
  txHash?: string | null;
  productPda?: string | null;

  tx_hash?: string | null;
  product_pda?: string | null;
};

type GetEditResponse = {
  success: boolean;
  data?: EditProductData;
  error?: string;
  details?: string;
};

const styles: Record<string, React.CSSProperties> = {
  page: {
  maxWidth: 980,
  width: "100%",
  boxSizing: "border-box",
  margin: "28px auto",
  padding: "0 16px 32px",
},

  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 14,
  },
  titleWrap: { minWidth: 0 },
  h1: { fontSize: 26, margin: 0, fontWeight: 800, letterSpacing: -0.2 },
  subtitle: { marginTop: 6, color: "#6b7280", fontSize: 14 },
  rightTop: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 },
  walletHint: { fontSize: 12, color: "#6b7280" },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "16px 18px",
    borderBottom: "1px solid #eef2f7",
    background: "#fafafa",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  cardHeaderTitle: { fontWeight: 800, fontSize: 14, color: "#111827" },
  cardBody: { padding: 18 },

  sectionTitle: { fontWeight: 800, fontSize: 13, marginBottom: 10, color: "#111827" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 14,
    alignItems: "start",
  },

  field: { display: "flex", flexDirection: "column", gap: 6 },
  labelRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  label: { fontSize: 12, fontWeight: 700, color: "#111827" },
  required: { color: "#ef4444", fontWeight: 900, marginLeft: 4 },
  helper: { fontSize: 12, color: "#6b7280" },

  input: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 14,
    background: "#fff",
  },
  inputReadOnly: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 14,
    background: "#f9fafb",
    color: "#6b7280",
  },
  textarea: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 14,
    background: "#fff",
    resize: "vertical",
    minHeight: 110,
  },
  disabled: { opacity: 0.55, cursor: "not-allowed" },

  actionsWrap: {
    marginTop: 16,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
  },
  btnDanger: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fff",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 13,
    color: "#b91c1c",
  },
  btnPrimary: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 13,
  },
  btnEmphasis: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #111827",
    background: "#fff",
    color: "#111827",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 13,
  },

  statusCard: {
    marginTop: 18,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    padding: 14,
  },
  statusRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  badge: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#111827",
  },
  badgeMuted: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#6b7280",
  },

  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },

  // ✅ error banner
  alertError: {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid #fecaca",
  },
};

export default function RegisterProductPage() {
  const wallet = useWallet();
  const [searchParams] = useSearchParams();
  const { auth } = useAuth();

  if (auth.loading) return <p style={{ padding: 20 }}>Loading…</p>;
  if (!auth.user) return <p style={{ padding: 20 }}>Not logged in.</p>;

  const manufacturerId = auth.user.userId ?? 0;
  const [serialNo, setSerialNo] = useState("");
  const [productName, setProductName] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [category, setCategory] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [description, setDescription] = useState("");

  const [productId, setProductId] = useState<number | null>(null);

  const [draftStage, setDraftStage] = useState<"draft" | "confirmed" | "unknown">("unknown");
  const [txSig, setTxSig] = useState<string>("");
  const [productPdaStr, setProductPdaStr] = useState<string>("");
  const [isFinalized, setIsFinalized] = useState<boolean>(false);


  // QR (from backend)
  const [qrUrl, setQrUrl] = useState<string>("");

  // ✅ visible UI error instead of swallowing
  const [uiError, setUiError] = useState<string>("");

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

  // cleanup object URL whenever it changes + on unmount
  useEffect(() => {
    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
  }, [qrUrl]);

  const pidStr = searchParams.get("productId");
  const stageParam = (searchParams.get("stage") || "").toLowerCase();
      // ====== Required-field gating ======
  const isNonEmpty = (v: string) => v.trim().length > 0;

  // ALL fields required.
  const allFieldsFilled =
    isNonEmpty(serialNo) &&
    isNonEmpty(productName) &&
    isNonEmpty(batchNo) &&
    isNonEmpty(category) &&
    isNonEmpty(manufactureDate) &&
    isNonEmpty(description);

  const hasDraftSaved = !!productId && draftStage === "draft";
  const hasConfirmed = !!productId && draftStage === "confirmed";

  // Button enable rules
  const canSaveDraft = !isLocked && !productId && allFieldsFilled;
  // If want to allow re-saving draft updates, change `!productId` to `draftStage !== "confirmed" && !isFinalized`

  const canDeleteDraft = !isLocked && hasDraftSaved;
  const canConfirmDraft = !isLocked && hasDraftSaved;

  const sendInFlightRef = useRef(false);
  const [isSendingChain, setIsSendingChain] = useState(false);

  const canSendToBlockchain =
    hasConfirmed &&
    !isFinalized &&
    allFieldsFilled &&
    !!wallet.publicKey &&
    !isSendingChain;

  useEffect(() => {
    setUiError("");

    if (!pidStr) return;

    const pid = Number(pidStr);
    if (!Number.isFinite(pid) || pid <= 0) return;

    setProductId(pid);
    if (stageParam === "confirmed") setDraftStage("confirmed");
    else if (stageParam === "draft") setDraftStage("draft");
    void loadProduct(pid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pidStr]);

  async function fetchQr(pid: number) {
    setQrUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });

    const res = await axios.get(`${API_ROOT}/products/${pid}/qrcode`, {
      responseType: "arraybuffer", withCredentials: true,
    });

    const blob = new Blob([res.data], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    setQrUrl(url);
  }

  async function loadProduct(pid: number) {
    try {
      setUiError("");

      const res = await axios.get<GetEditResponse>(`${API_ROOT}/products/${pid}/edit`, {
        params: { manufacturerId }, withCredentials: true,
      });

      if (!res.data.success || !res.data.data) throw new Error(res.data.error || "Failed to load product");

      const d: any = res.data.data;

      setSerialNo(d.serialNumber ?? "");
      setProductName(d.productName ?? "");
      setBatchNo(d.batchNumber ?? "");
      setCategory(d.category ?? "");
      setManufactureDate(d.manufactureDate ? new Date(d.manufactureDate).toISOString().slice(0, 10) : "");
      setDescription(d.productDescription ?? "");

      const stage = String(d.stage || "").toLowerCase();
      if (stage === "confirmed") setDraftStage("confirmed");
      else if (stage === "draft") setDraftStage("draft");

      // ✅ handle both camelCase and snake_case
      const tx = d.txHash ?? d.tx_hash ?? null;
      const pda = d.productPda ?? d.product_pda ?? null;

      if (tx) {
        setIsFinalized(true);
        setTxSig(tx);
        if (pda) setProductPdaStr(pda);
      } else {
        setIsFinalized(false);
        setTxSig("");
        setProductPdaStr("");
      }

      // Auto-load QR if confirmed/finalized
      if ((stage === "confirmed" || !!tx) && pid) {
        await fetchQr(pid);
      }
    } catch (e: any) {
      console.error("loadProduct error:", e);
      setUiError(e?.message || "Failed to load product.");
    }
  }

  // Safety net: if confirmed/finalized but qr missing, fetch it
  useEffect(() => {
    if (!productId) return;
    if (!(draftStage === "confirmed" || isFinalized)) return;
    if (qrUrl) return;

    void fetchQr(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, draftStage, isFinalized]);

  async function saveDraft(): Promise<number> {
    const s = serialNo.trim();
    if (!s) throw new Error("Serial number is required");
    if (isLocked) throw new Error("Product is locked (confirmed/finalized).");

    const dbRes = await axios.post(`${API_ROOT}/products/draft`, {
      manufacturerId,
      serialNo: s,
      productName,
      batchNo,
      category,
      manufactureDate,
      description,
    }, { withCredentials: true } );

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

    setQrUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });

    return pid;
  }

  async function onSaveDraftClick() {
    try {
      setUiError("");
      await saveDraft();
    } catch (e: any) {
      console.error("saveDraft error:", e);
      setUiError(e?.message || "Save draft failed.");
    }
  }

  async function deleteDraft() {
    try {
      setUiError("");
      if (!productId) throw new Error("No productId. Save draft first.");
      if (isLocked) throw new Error("Draft is locked (confirmed/finalized). Cannot delete.");

      await axios.delete(`${API_ROOT}/products/${productId}/draft`, {
        data: { manufacturerId }, withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });

      setProductId(null);
      setDraftStage("unknown");

      setQrUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
    } catch (e: any) {
      console.error("deleteDraft error:", e);
      setUiError(e?.message || "Delete draft failed.");
    }
  }

  async function confirmDraft() {
    try {
      setUiError("");
      if (!productId) throw new Error("No productId. Save draft first.");
      if (isLocked) throw new Error("Already locked.");

      await axios.post(`${API_ROOT}/products/${productId}/confirm-draft`, 
        { manufacturerId }, { withCredentials: true });
      setDraftStage("confirmed");

      await fetchQr(productId);
    } catch (e: any) {
      console.error("confirmDraft error:", e);
      setUiError(e?.message || "Confirm draft failed.");
    }
  }

  async function sendToBlockchain() {
    if (sendInFlightRef.current) return; // hard guard
    sendInFlightRef.current = true;
    setIsSendingChain(true);

    try {
      setUiError("");

      if (!wallet.publicKey) throw new Error("Connect wallet first");
      const s = serialNo.trim();
      if (!s) throw new Error("Serial number is required");
      if (!productId) throw new Error("No productId. Save draft first.");
      if (draftStage !== "confirmed") throw new Error("Draft not confirmed. Click 'Confirm Draft' first.");
      if (isFinalized) throw new Error("Already finalized.");

      const metaRes = await axios.post(`${API_ROOT}/products/${productId}/metadata-final`, {
        manufacturerId, 
        metadata: meta,
      }, { withCredentials: true });

      const uri: string = metaRes.data?.metadataUri;
      const hashHex: string = metaRes.data?.metadataSha256Hex;

      if (!uri || !hashHex) {
        throw new Error(
          `metadata-final did not return metadataUri/metadataSha256Hex.\nResponse:\n${JSON.stringify(
            metaRes.data,
            null,
            2
          )}`
        );
      }

      const metadataHash = Buffer.from(hashHex, "hex");

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

      await axios.post(`${API_ROOT}/products/${productId}/confirm`, {
        manufacturerId,
        txHash: sig,
        productPda: productPda.toBase58(),
      }, { withCredentials: true });

      setIsFinalized(true);

      if (!qrUrl) await fetchQr(productId);
    } 
    catch (e: any) {
      const msg = String(e?.message ?? "");

      if (msg.includes("AlreadyProcessed")) {
        setUiError("That transaction was already processed. Refreshing status…");
        if (productId) await loadProduct(productId);
        return;
      }

      console.error("sendToBlockchain error:", e);
      setUiError(msg || "Send to blockchain failed.");
      alert(msg || "Send to blockchain failed.");
    }

    finally {
    setIsSendingChain(false);
    sendInFlightRef.current = false;
  }
  }

  return (
    <div className="rp-page" style={styles.page}>
      <div className="rp-header" style={styles.headerRow}>
        <div style={styles.titleWrap}>
          <h1 style={styles.h1}>Register New Product</h1>
          <div style={styles.subtitle}>Add a new product to the blockchain system</div>
        </div>

        <div className="rp-rightTop" style={styles.rightTop}>
          <WalletMultiButton />
          <div style={styles.walletHint}>
            Connected:{" "}
            <span style={styles.mono}>
              {wallet.publicKey?.toBase58().slice(0, 6) ?? "—"}
              {wallet.publicKey ? "…" : ""}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>Product Information</div>
        </div>

        <div style={styles.cardBody}>
          {/* visible errors */}
          {uiError && <div style={styles.alertError}>{uiError}</div>}

          <div style={styles.sectionTitle}>Enter the details of the product you want to register</div>

          <div className="rp-grid" style={styles.grid}>
            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Product ID</span>
                <span style={styles.helper}></span>
              </div>
              <input
                type="text"
                value={productId ?? ""}
                readOnly
                placeholder="e.g., 12345"
                style={styles.inputReadOnly}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>
                  Serial Number<span style={styles.required}>*</span>
                </span>
                <span style={styles.helper}>{isLocked ? "Locked" : "Editable until Confirm"}</span>
              </div>
              <input
                value={serialNo}
                onChange={(e) => setSerialNo(e.target.value)}
                placeholder="e.g., SER-008"
                style={{ ...styles.input, ...(isLocked ? styles.disabled : {}) }}
                disabled={isLocked}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Product Name</span>
              </div>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., iPhone 15 Pro Max"
                style={{ ...styles.input, ...(isLocked ? styles.disabled : {}) }}
                disabled={isLocked}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Batch Number</span>
              </div>
              <input
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="e.g., BATCH-2024-A1"
                style={{ ...styles.input, ...(isLocked ? styles.disabled : {}) }}
                disabled={isLocked}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Category</span>
              </div>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Electronics"
                style={{ ...styles.input, ...(isLocked ? styles.disabled : {}) }}
                disabled={isLocked}
              />
            </div>

            <div style={styles.field}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Manufacture Date</span>
              </div>
              <input
                type="date"
                value={manufactureDate}
                onChange={(e) => setManufactureDate(e.target.value)}
                style={{ ...styles.input, ...(isLocked ? styles.disabled : {}) }}
                disabled={isLocked}
              />
            </div>

            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <div style={styles.labelRow}>
                <span style={styles.label}>Product Description</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the product..."
                style={{ ...styles.textarea, ...(isLocked ? styles.disabled : {}) }}
                disabled={isLocked}
              />
            </div>

            {(txSig || productPdaStr) && (
              <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
                <div style={styles.statusRow}>
                  {txSig && <span style={styles.badge}>Registered on blockchain</span>}
                  {productPdaStr && <span style={styles.badge}>Metadata verified</span>}
                </div>
              </div>
            )}
          </div>

          <div style={styles.statusCard}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Registration Status</div>
            <div style={styles.statusRow}>
              <span style={styles.badgeMuted}>
                Manufacturer ID: <span style={styles.mono}>{manufacturerId}</span>
              </span>
              <span style={styles.badge}>
                Stage: <b>{draftStage}</b>
              </span>
              <span style={styles.badge}>
                Locked: <b>{isLocked ? "YES" : "NO"}</b>
              </span>
              <span style={styles.badge}>
                Finalized: <b>{isFinalized ? "YES" : "NO"}</b>
              </span>
            </div>

            {(draftStage === "confirmed" || isFinalized || !!qrUrl) && productId && (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 14,
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 6 }}>QR Code</div>

                <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 160,
                      height: 160,
                      background: "#fff",
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt="Product QR Code"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <span style={{ fontSize: 12, color: "#6b7280" }}>Generating…</span>
                    )}
                  </div>

                  <div style={{ fontSize: 13 }}>
                    <div>
                      <b>Product ID:</b> {productId}
                    </div>
                    <div>
                      <b>Serial No:</b> {serialNo || "—"}
                    </div>
                    <div>
                      <b>Manufacturer ID:</b> {manufacturerId}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={styles.actionsWrap}>
            <button
              type="button"
              onClick={onSaveDraftClick}
              style={{ ...styles.btn, ...(canSaveDraft ? {} : styles.disabled) }}
              disabled={!canSaveDraft}
              title={
                !allFieldsFilled
                  ? "Fill in all fields first"
                  : productId
                    ? "Draft already saved"
                    : isLocked
                      ? "Locked"
                      : ""
              }
            >
              Save Draft
            </button>

            <button
              type="button"
              onClick={deleteDraft}
              style={{ ...styles.btnDanger, ...(canDeleteDraft ? {} : styles.disabled) }}
              disabled={!canDeleteDraft}
              title={
                !productId
                  ? "Save draft first"
                  : draftStage !== "draft"
                    ? "Only drafts can be deleted"
                    : isLocked
                      ? "Locked"
                      : ""
              }
            >
              Delete Draft
            </button>

            <button
              type="button"
              onClick={confirmDraft}
              style={{ ...styles.btnEmphasis, ...(canConfirmDraft ? {} : styles.disabled) }}
              disabled={!canConfirmDraft}
              title={
                !productId
                  ? "Save draft first"
                  : draftStage !== "draft"
                    ? "Draft already confirmed"
                    : isLocked
                      ? "Locked"
                      : ""
              }
            >
              Lock Draft
            </button>

            <button
              type="button"
              onClick={sendToBlockchain}
              style={{ ...styles.btnPrimary, ...(canSendToBlockchain ? {} : styles.disabled) }}
              disabled={!canSendToBlockchain}
              title={
                !allFieldsFilled
                  ? "Fill in all fields first"
                  : !productId
                    ? "Save draft first"
                    : draftStage !== "confirmed"
                      ? "Confirm draft first"
                      : isFinalized
                        ? "Already finalized"
                        : !wallet.publicKey
                          ? "Connect wallet first"
                          : ""
              }
            >
              Register on Blockchain
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
