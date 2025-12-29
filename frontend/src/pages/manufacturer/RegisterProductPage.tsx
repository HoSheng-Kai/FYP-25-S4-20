import React, { useState } from "react";
import { SystemProgram } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import { getProvider, getProgram } from "../../lib/anchorClient";
import { deriveProductPda } from "../../lib/pdas";

type FormState = {
  productName: string;
  serialNo: string;
  batchNo: string;
  category: string;
  manufactureDate: string; // YYYY-MM-DD
  description: string;
  price: string; // optional
  currency: "SGD" | "USD" | "EUR";
};

export default function RegisterProductOnChainPage() {
  const wallet = useWallet();

  const [form, setForm] = useState<FormState>({
    productName: "",
    serialNo: "",
    batchNo: "",
    category: "",
    manufactureDate: "",
    description: "",
    price: "",
    currency: "SGD",
  });

  const [status, setStatus] = useState<string>("");
  const [productPda, setProductPda] = useState<string>("");
  const [txSig, setTxSig] = useState<string>("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitToBlockchain() {
    try {
      setStatus("");
      setProductPda("");
      setTxSig("");

      if (!wallet.publicKey) throw new Error("Please connect manufacturer wallet");
      if (!form.serialNo.trim()) throw new Error("Serial Number is required");
      if (!form.productName.trim()) throw new Error("Product Name is required");

      setStatus("Deriving PDA + sending transaction...");

      // 1) derive PDA + serial hash
      const [pda, _bump, serialHash] = await deriveProductPda(wallet.publicKey, form.serialNo.trim());
      setProductPda(pda.toBase58());

      // 2) call anchor program
      const provider = getProvider(wallet);
      const program = getProgram(provider);

      // IDL name is "register_product" => in Anchor JS it becomes registerProduct(...)
      const sig = await program.methods
        .registerProduct(Array.from(serialHash)) // u8[32]
        .accounts({
          product: pda,
          manufacturer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxSig(sig);
      setStatus("✅ Submitted to blockchain successfully!");

      // (Optional) also save metadata to your backend DB
      // await fetch("http://localhost:3000/api/products/register-offchain", { ... })
      // But on-chain is done already.

    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? String(e)}`);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Manufacturer: Product Registration</h1>

      <div style={{ marginTop: 10 }}>
        <WalletMultiButton />
        <div style={{ marginTop: 8, fontFamily: "monospace" }}>
          Connected wallet: {wallet.publicKey?.toBase58() ?? "—"}
        </div>
      </div>

      <hr style={{ margin: "18px 0" }} />

      <div style={{ display: "grid", gap: 12 }}>
        <label>
          <div><b>Product Name</b></div>
          <input
            value={form.productName}
            onChange={(e) => update("productName", e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="e.g. Nike Air Max 270"
          />
        </label>

        <label>
          <div><b>Serial Number</b></div>
          <input
            value={form.serialNo}
            onChange={(e) => update("serialNo", e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="e.g. NIKE-AIR-001"
          />
        </label>

        <label>
          <div><b>Batch Number</b></div>
          <input
            value={form.batchNo}
            onChange={(e) => update("batchNo", e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="e.g. BATCH-2024-001"
          />
        </label>

        <label>
          <div><b>Category</b></div>
          <input
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            style={{ width: "100%", padding: 10 }}
            placeholder="e.g. Footwear"
          />
        </label>

        <label>
          <div><b>Manufacture Date</b></div>
          <input
            type="date"
            value={form.manufactureDate}
            onChange={(e) => update("manufactureDate", e.target.value)}
            style={{ padding: 10 }}
          />
        </label>

        <label>
          <div><b>Description</b></div>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            style={{ width: "100%", padding: 10, minHeight: 90 }}
            placeholder="Optional"
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1 }}>
            <div><b>Price (optional)</b></div>
            <input
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              style={{ width: "100%", padding: 10 }}
              placeholder="e.g. 180.00"
            />
          </label>

          <label style={{ width: 140 }}>
            <div><b>Currency</b></div>
            <select
              value={form.currency}
              onChange={(e) => update("currency", e.target.value as any)}
              style={{ width: "100%", padding: 10 }}
            >
              <option value="SGD">SGD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
        </div>

        <button onClick={submitToBlockchain} style={{ padding: 12, width: 240 }}>
          Submit to Blockchain
        </button>

        <div style={{ marginTop: 6 }}>
          <div><b>Product ID (PDA)</b></div>
          <div style={{ fontFamily: "monospace" }}>{productPda || "—"}</div>
        </div>

        <div>
          <div><b>Transaction</b></div>
          <div style={{ fontFamily: "monospace" }}>{txSig || "—"}</div>
        </div>

        <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#0f0", padding: 12 }}>
          {status || "Status..."}
        </pre>
      </div>
    </main>
  );
}


// import { useState } from "react";
// import axios from "axios";
// import { PRODUCTS_API_BASE_URL } from "../../config/api";

// export default function RegisterProductPage() {
//   const manufacturerId = Number(localStorage.getItem("userId"));

//   const [serialNo, setSerialNo] = useState("");
//   const [productName, setProductName] = useState("");
//   const [batchNo, setBatchNo] = useState("");
//   const [category, setCategory] = useState("");
//   const [manufactureDate, setManufactureDate] = useState("");
//   const [description, setDescription] = useState("");

//   const [productId, setProductId] = useState<number | null>(null);
//   const [qrUrl, setQrUrl] = useState<string | null>(null);

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   const loadQr = (id: number) => {
//     // bust cache with ts
//     setQrUrl(`${PRODUCTS_API_BASE_URL}/${id}/qrcode?ts=${Date.now()}`);
//   };

//   const handleRegister = async () => {
//     setError(null);
//     setSuccess(null);

//     if (!serialNo.trim()) {
//       setError("Serial Number is required.");
//       return;
//     }

//     if (Number.isNaN(manufacturerId)) {
//       setError("Missing manufacturerId in localStorage. Please login again.");
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await axios.post(`${PRODUCTS_API_BASE_URL}/register`, {
//         manufacturerId,
//         serialNo: serialNo.trim(),
//         productName: productName.trim() || null,
//         batchNo: batchNo.trim() || null,
//         category: category.trim() || null,
//         manufactureDate: manufactureDate || null,
//         description: description.trim() || null,
//       });

//       const newProductId = res.data?.data?.product?.product_id;
//       if (!newProductId) {
//         setError("Registered, but product_id was not returned by backend.");
//         return;
//       }

//       setProductId(newProductId);
//       loadQr(newProductId);
//       setSuccess("Product registered. QR code generated.");
//     } catch (err: any) {
//       setError(err.response?.data?.error || "Failed to register product.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleClear = () => {
//     setSerialNo("");
//     setProductName("");
//     setBatchNo("");
//     setCategory("");
//     setManufactureDate("");
//     setDescription("");
//     setProductId(null);
//     setQrUrl(null);
//     setError(null);
//     setSuccess(null);
//   };

//   const handleDownloadQr = async () => {
//     if (!qrUrl || !productId) return;

//     const res = await axios.get(qrUrl, { responseType: "blob" });
//     const blob = new Blob([res.data], { type: "image/png" });
//     const url = URL.createObjectURL(blob);

//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `product-${productId}-qr.png`;
//     a.click();

//     URL.revokeObjectURL(url);
//   };

//   return (
//     <div style={page}>
//       <div style={container}>
//         {/* LEFT CARD */}
//         <section style={card}>
//           <h1 style={title}>Register New Product</h1>
//           <p style={subtitle}>Add a new product to the blockchain system</p>

//           {error && <div style={alertError}>{error}</div>}
//           {success && <div style={alertSuccess}>{success}</div>}

//           <div style={sectionTitle}>Product Information</div>
//           <div style={sectionHint}>Enter the details of the product you want to register.</div>

//           {/* Grid like your screenshot */}
//           <div style={grid2}>
//             <div>
//               <label style={label}>Serial Number *</label>
//               <input
//                 style={input}
//                 placeholder="e.g. NIKE-AIR-001"
//                 value={serialNo}
//                 onChange={(e) => setSerialNo(e.target.value)}
//               />
//             </div>

//             <div>
//               <label style={label}>Product Name</label>
//               <input
//                 style={input}
//                 placeholder="e.g. Air Force 1"
//                 value={productName}
//                 onChange={(e) => setProductName(e.target.value)}
//               />
//             </div>
//           </div>

//           <div style={grid2}>
//             <div>
//               <label style={label}>Batch Number</label>
//               <input
//                 style={input}
//                 placeholder="e.g. BATCH-2025-01"
//                 value={batchNo}
//                 onChange={(e) => setBatchNo(e.target.value)}
//               />
//             </div>

//             <div>
//               <label style={label}>Category</label>
//               <input
//                 style={input}
//                 placeholder="e.g. Footwear"
//                 value={category}
//                 onChange={(e) => setCategory(e.target.value)}
//               />
//             </div>
//           </div>

//           <div style={grid2}>
//             <div>
//               <label style={label}>Manufacture Date</label>
//               <input
//                 style={input}
//                 type="date"
//                 value={manufactureDate}
//                 onChange={(e) => setManufactureDate(e.target.value)}
//               />
//             </div>

//             <div>
//               {/* empty right column like screenshot spacing */}
//             </div>
//           </div>

//           <div style={{ marginTop: 12 }}>
//             <label style={label}>Product Description</label>
//             <textarea
//               style={textarea}
//               placeholder="Detailed description of the product..."
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//             />
//           </div>

//           <div style={actionsRow}>
//             <button style={primaryBtn} onClick={handleRegister} disabled={loading}>
//               {loading ? "Registering..." : "Register Product"}
//             </button>

//             <button style={secondaryBtn} onClick={handleClear} type="button">
//               Clear Form
//             </button>
//           </div>
//         </section>

//         {/* RIGHT CARD */}
//         <aside style={qrCard}>
//           <h2 style={qrTitle}>QR Code Generation</h2>
//           <p style={qrHint}>Generate a unique QR code for this product</p>

//           <div style={qrPreviewBox}>
//             {!qrUrl ? (
//               <div style={{ textAlign: "center" }}>
//                 <div style={qrPlaceholderIcon}>▦</div>
//                 <p style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
//                   QR code will appear after registration.
//                 </p>
//               </div>
//             ) : (
//               <div style={{ textAlign: "center" }}>
//                 <img src={qrUrl} alt="QR Code" style={qrImg} />
//                 <div style={qrOk}>✓ QR Code Generated</div>
//               </div>
//             )}
//           </div>

//           <button
//             style={qrBtn}
//             disabled={!productId}
//             onClick={() => productId && loadQr(productId)}
//           >
//             🔄 Regenerate QR Code
//           </button>

//           <button style={qrBtn} disabled={!qrUrl} onClick={handleDownloadQr}>
//             ⬇ Download QR Code
//           </button>

//           <div style={qrNote}>
//             Note: The QR code will be automatically generated upon product registration.
//           </div>
//         </aside>
//       </div>
//     </div>
//   );
// }

// /* ---------------- STYLES ---------------- */

// const page: React.CSSProperties = {
//   background: "#f5f7fb",
//   minHeight: "100vh",
//   padding: "28px",
// };

// const container: React.CSSProperties = {
//   display: "grid",
//   gridTemplateColumns: "2fr 1fr",
//   gap: "22px",
//   alignItems: "start",
// };

// const card: React.CSSProperties = {
//   background: "white",
//   borderRadius: 14,
//   padding: "22px 24px",
//   boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
// };

// const title: React.CSSProperties = {
//   margin: 0,
//   fontSize: 26,
// };

// const subtitle: React.CSSProperties = {
//   marginTop: 6,
//   marginBottom: 18,
//   color: "#555",
// };

// const sectionTitle: React.CSSProperties = {
//   marginTop: 10,
//   fontWeight: 700,
//   fontSize: 14,
// };

// const sectionHint: React.CSSProperties = {
//   marginTop: 4,
//   marginBottom: 14,
//   fontSize: 13,
//   color: "#666",
// };

// const grid2: React.CSSProperties = {
//   display: "grid",
//   gridTemplateColumns: "1fr 1fr",
//   gap: 14,
//   marginBottom: 12,
// };

// const label: React.CSSProperties = {
//   display: "block",
//   fontSize: 13,
//   fontWeight: 600,
//   marginBottom: 6,
//   color: "#222",
// };

// const input: React.CSSProperties = {
//   width: "100%",
//   padding: "10px 12px",
//   borderRadius: 10,
//   border: "1px solid #d9dbe1",
//   outline: "none",
//   fontSize: 14,
// };

// const textarea: React.CSSProperties = {
//   width: "100%",
//   padding: "10px 12px",
//   borderRadius: 10,
//   border: "1px solid #d9dbe1",
//   outline: "none",
//   fontSize: 14,
//   minHeight: 90,
//   resize: "vertical",
// };

// const actionsRow: React.CSSProperties = {
//   display: "flex",
//   gap: 12,
//   marginTop: 16,
//   alignItems: "center",
// };

// const primaryBtn: React.CSSProperties = {
//   flex: 1,
//   padding: "12px 14px",
//   borderRadius: 999,
//   border: "none",
//   background: "#0d1b2a",
//   color: "white",
//   fontWeight: 700,
//   cursor: "pointer",
// };

// const secondaryBtn: React.CSSProperties = {
//   padding: "12px 14px",
//   borderRadius: 999,
//   border: "1px solid #d9dbe1",
//   background: "white",
//   cursor: "pointer",
//   fontWeight: 600,
// };

// const qrCard: React.CSSProperties = {
//   background: "white",
//   borderRadius: 14,
//   padding: "22px 20px",
//   boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
// };

// const qrTitle: React.CSSProperties = {
//   margin: 0,
//   fontSize: 18,
// };

// const qrHint: React.CSSProperties = {
//   marginTop: 6,
//   marginBottom: 14,
//   fontSize: 13,
//   color: "#666",
// };

// const qrPreviewBox: React.CSSProperties = {
//   background: "#f2f5f9",
//   borderRadius: 14,
//   padding: 18,
//   height: 300,
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   marginBottom: 12,
// };

// const qrImg: React.CSSProperties = {
//   width: 170,
//   height: 170,
//   borderRadius: 12,
//   background: "white",
//   padding: 10,
// };

// const qrOk: React.CSSProperties = {
//   marginTop: 10,
//   fontSize: 13,
//   color: "#1a7f37",
//   fontWeight: 700,
// };

// const qrBtn: React.CSSProperties = {
//   width: "100%",
//   padding: "10px 12px",
//   borderRadius: 10,
//   border: "1px solid #d9dbe1",
//   background: "white",
//   cursor: "pointer",
//   fontWeight: 600,
//   marginTop: 10,
// };

// const qrNote: React.CSSProperties = {
//   marginTop: 14,
//   fontSize: 12,
//   color: "#777",
//   lineHeight: 1.4,
// };

// const alertError: React.CSSProperties = {
//   background: "#ffe6e6",
//   color: "#a11",
//   padding: "10px 12px",
//   borderRadius: 10,
//   fontSize: 13,
//   marginBottom: 12,
// };

// const alertSuccess: React.CSSProperties = {
//   background: "#e7ffef",
//   color: "#116a2b",
//   padding: "10px 12px",
//   borderRadius: 10,
//   fontSize: 13,
//   marginBottom: 12,
// };

// const qrPlaceholderIcon: React.CSSProperties = {
//   width: 72,
//   height: 72,
//   borderRadius: 14,
//   background: "#0d1b2a",
//   color: "white",
//   display: "inline-flex",
//   alignItems: "center",
//   justifyContent: "center",
//   fontSize: 26,
//   fontWeight: 800,
// };
