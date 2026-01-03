import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { PRODUCTS_API_BASE_URL } from "../../config/api";
import { useNavigate } from "react-router-dom";

type ProductRow = {
  productId: number;
  serialNumber: string;
  category?: string | null;
  productName: string | null;
  productStatus: "registered" | "verified" | "suspicious";
  lifecycleStatus: "active" | "transferred";
  blockchainStatus: string; // on blockchain / pending / confirmed
  registeredOn: string;
  price: string | null;
  currency: string | null;
  listingStatus: string | null;
  listingCreatedOn: string | null;
};

type EditProductData = {
  productId: number;
  serialNumber: string;
  productName: string | null;
  batchNumber: string | null;
  category: string | null;
  manufactureDate: string | null; // ISO string/date
  productDescription: string | null;
  status: string;
  registeredOn: string;
  qrImageUrl?: string; // optional
};

type GetEditResponse = {
  success: boolean;
  data?: EditProductData;
  error?: string;
  details?: string;
};

type UpdateResponse = {
  success: boolean;
  data?: {
    productId: number;
    serialNumber: string;
    productName: string | null;
    batchNumber: string | null;
    category: string | null;
    manufactureDate: string | null;
    productDescription: string | null;
    status: string;
    registeredOn: string;
    qrPayload?: string;
    qrImageUrl?: string;
  };
  error?: string;
  details?: string;
};

export default function ManufacturerProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const manufacturerId = Number(localStorage.getItem("userId"));

  // ---------- EDIT MODAL STATE ----------
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  // fields
  const [editSerial, setEditSerial] = useState("");
  const [editName, setEditName] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMfgDate, setEditMfgDate] = useState(""); // yyyy-mm-dd
  const [editDescription, setEditDescription] = useState("");

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  const canEdit = useMemo(
    () => !Number.isNaN(manufacturerId) && manufacturerId > 0,
    [manufacturerId]
  );

  // ----------------------
  // HELPERS (BLOCKCHAIN IMMUTABILITY)
  // ----------------------
  const isOnChainConfirmed = (p: ProductRow) => {
    const s = (p.blockchainStatus || "").toLowerCase();
    return (
      s.includes("confirmed") ||
      s.includes("on blockchain") ||
      s.includes("on-chain") ||
      s.includes("onchain")
    );
  };

  const safeDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  // ----------------------
  // LOAD PRODUCTS
  // ----------------------
  const loadProducts = async () => {
    try {
      const res = await axios.get(
        `${PRODUCTS_API_BASE_URL}/manufacturer/${manufacturerId}/listings`
      );

      if (res.data.success) {
        setProducts(res.data.data);
      } else {
        setError("Failed to load products.");
      }
    } catch (err) {
      setError("Error fetching products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------
  // DELETE PRODUCT (draft only)
  // ----------------------
  const handleDelete = async (productId: number) => {
    const row = products.find((x) => x.productId === productId);
    if (row && isOnChainConfirmed(row)) {
      alert("Cannot delete a product that is confirmed on blockchain.");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product? This cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const res = await axios.delete(
        `${PRODUCTS_API_BASE_URL}/${productId}/draft`,
        { data: { manufacturerId } }
      );

      if (res.data.success) {
        alert("Product deleted successfully.");
        loadProducts();
      } else {
        alert(res.data.error || "Failed to delete product.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.details || err.message;
      alert("Delete failed: " + msg);
    }
  };

  // ----------------------
  // OPEN EDIT MODAL
  // - If on-chain confirmed: show immutable message (frontend-only fix)
  // - Else: fetch /edit and allow updates
  // ----------------------
  const openEditModal = async (productId: number) => {
    if (!canEdit) {
      alert("Manufacturer ID missing. Please login again.");
      return;
    }

    const row = products.find((x) => x.productId === productId);

    // BLOCKCHAIN CONFIRMED -> NO /edit CALL
    if (row && isOnChainConfirmed(row)) {
      setIsEditOpen(true);
      setIsEditLoading(false);
      setEditSuccess(null);
      setEditingProductId(productId);

      setEditError(
        "This product is already confirmed on blockchain and cannot be edited (immutable)."
      );

      // Prefill what we can from list row
      setEditSerial(row.serialNumber ?? "");
      setEditName(row.productName ?? "");
      setEditCategory(row.category ?? "");
      setEditBatch("");
      setEditMfgDate("");
      setEditDescription("");
      setQrImageUrl(null);
      return;
    }

    // Draft / not-confirmed -> allow edit
    setIsEditOpen(true);
    setIsEditLoading(true);
    setEditError(null);
    setEditSuccess(null);
    setEditingProductId(productId);

    try {
      const res = await axios.get<GetEditResponse>(
        `${PRODUCTS_API_BASE_URL}/${productId}/edit`,
        { params: { manufacturerId } }
      );

      if (!res.data.success || !res.data.data) {
        setEditError(res.data.error || "Failed to load product for editing.");
        return;
      }

      const d = res.data.data;

      setEditSerial(d.serialNumber ?? "");
      setEditName(d.productName ?? "");
      setEditBatch(d.batchNumber ?? "");
      setEditCategory(d.category ?? "");
      setEditDescription(d.productDescription ?? "");

      // Convert to yyyy-mm-dd for input[type=date]
      const mfg = d.manufactureDate ? new Date(d.manufactureDate) : null;
      setEditMfgDate(
        mfg && !Number.isNaN(mfg.getTime())
          ? mfg.toISOString().slice(0, 10)
          : ""
      );

      setQrImageUrl(d.qrImageUrl ? withNoCache(d.qrImageUrl) : null);
    } catch (err: any) {
      setEditError(
        err.response?.data?.error ||
          err.response?.data?.details ||
          "Error loading product for edit."
      );
    } finally {
      setIsEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setIsEditLoading(false);
    setEditError(null);
    setEditSuccess(null);
    setEditingProductId(null);

    setEditSerial("");
    setEditName("");
    setEditBatch("");
    setEditCategory("");
    setEditMfgDate("");
    setEditDescription("");
    setQrImageUrl(null);
  };

  // ----------------------
  // UPDATE PRODUCT + GENERATE NEW QR
  // (draft only)
  // ----------------------
  const handleUpdateProduct = async () => {
    if (!editingProductId) return;

    const row = products.find((x) => x.productId === editingProductId);
    if (row && isOnChainConfirmed(row)) {
      setEditError("This product is confirmed on blockchain and cannot be updated.");
      return;
    }

    if (!canEdit) {
      setEditError("Manufacturer ID missing. Please login again.");
      return;
    }
    if (!editSerial.trim()) {
      setEditError("Serial Number is required.");
      return;
    }

    setEditError(null);
    setEditSuccess(null);
    setIsEditLoading(true);

    try {
      const payload = {
        manufacturerId,
        serialNo: editSerial.trim(),
        productName: editName.trim() || null,
        batchNo: editBatch.trim() || null,
        category: editCategory.trim() || null,
        manufactureDate: editMfgDate || null, // yyyy-mm-dd
        description: editDescription.trim() || null,
      };

      const res = await axios.put<UpdateResponse>(
        `${PRODUCTS_API_BASE_URL}/${editingProductId}`,
        payload
      );

      if (!res.data.success || !res.data.data) {
        setEditError(res.data.error || "Failed to update product.");
        return;
      }

      setEditSuccess("Updated successfully. New QR code generated.");

      const newQr =
        res.data.data.qrImageUrl ??
        `${PRODUCTS_API_BASE_URL}/${editingProductId}/qrcode`;
      setQrImageUrl(withNoCache(newQr));

      await loadProducts();
    } catch (err: any) {
      setEditError(
        err.response?.data?.error ||
          err.response?.data?.details ||
          "Update failed."
      );
    } finally {
      setIsEditLoading(false);
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Loading products...</p>;

  return (
    <div style={{ padding: "40px" }}>
      <h1 style={{ marginBottom: "20px" }}>My Products</h1>

      {error && (
        <div
          style={{
            background: "#ffe0e0",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "16px",
            color: "#a11",
          }}
        >
          {error}
        </div>
      )}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "white",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <thead style={{ background: "#e9ecef" }}>
          <tr>
            <th style={th}>Product ID</th>
            <th style={th}>Product Name</th>
            <th style={th}>Category</th>
            <th style={th}>Registered On</th>
            <th style={th}>Status</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {products.map((p) => {
            const locked = isOnChainConfirmed(p);

            return (
              <tr key={p.productId}>
                {/* FIXED: show productId in Product ID column */}
                <td style={td}>{p.productId}</td>
                <td style={td}>{p.productName || "—"}</td>
                <td style={td}>{p.category || "—"}</td>
                <td style={td}>{safeDate(p.registeredOn)}</td>

                <td style={td}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      textTransform: "capitalize",
                      background:
                        p.productStatus === "verified"
                          ? "#d4f5d4"
                          : p.productStatus === "registered"
                          ? "#dbeafe"
                          : "#fee2e2",
                      color:
                        p.productStatus === "verified"
                          ? "#1b6e1b"
                          : p.productStatus === "registered"
                          ? "#1d4ed8"
                          : "#b91c1c",
                    }}
                  >
                    {p.productStatus}
                  </span>

                  {/* Optional: small blockchain tag */}
                  {p.blockchainStatus && (
                    <span
                      style={{
                        marginLeft: 10,
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: 12,
                        background: locked ? "#e5e7eb" : "#fff7ed",
                        color: locked ? "#374151" : "#9a3412",
                      }}
                      title="Blockchain status"
                    >
                      {p.blockchainStatus}
                    </span>
                  )}
                </td>

                <td style={td}>
                  {/* VIEW (eye icon) */}
                  <button
                    onClick={() => navigate(`/manufacturer/products/${p.productId}`)}
                    style={iconBtn}
                    title="View"
                  >
                    👁
                  </button>

                  {/* EDIT (pencil icon) - disabled if on-chain confirmed */}
                  <button
                    onClick={() => void openEditModal(p.productId)}
                    style={{
                      ...iconBtn,
                      opacity: locked ? 0.4 : 1,
                      cursor: locked ? "not-allowed" : "pointer",
                    }}
                    title={
                      locked
                        ? "Product is already on blockchain and cannot be edited"
                        : "Edit"
                    }
                    disabled={locked}
                  >
                    ✏️
                  </button>

                  {/* DELETE (trash icon) - disabled if on-chain confirmed */}
                  <button
                    onClick={() => handleDelete(p.productId)}
                    style={{
                      ...iconBtn,
                      color: "red",
                      opacity: locked ? 0.4 : 1,
                      cursor: locked ? "not-allowed" : "pointer",
                    }}
                    title={
                      locked
                        ? "Product is already on blockchain and cannot be deleted"
                        : "Delete"
                    }
                    disabled={locked}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {products.length === 0 && (
        <p style={{ marginTop: 20, opacity: 0.6 }}>No products found.</p>
      )}

      {/* =======================
          EDIT PRODUCT MODAL
      ======================== */}
      {isEditOpen && (
        <div style={modalOverlay} onMouseDown={closeEditModal}>
          <div
            style={modalCard}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Edit Product Details</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  Update product information and generate a new unique QR code
                </p>
              </div>

              <button style={modalCloseBtn} onClick={closeEditModal} type="button">
                ✕
              </button>
            </div>

            {editError && <div style={alertError}>{editError}</div>}
            {editSuccess && <div style={alertSuccess}>{editSuccess}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Product Name *">
                <input
                  style={input}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. iPhone 15 Pro Max"
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>

              <Field label="Category *">
                <input
                  style={input}
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="e.g. Electronics"
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>

              <Field label="Batch Number *">
                <input
                  style={input}
                  value={editBatch}
                  onChange={(e) => setEditBatch(e.target.value)}
                  placeholder="e.g. BATCH-2024-A1"
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>

              <Field label="Serial Number *">
                <input
                  style={input}
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  placeholder="e.g. IMEI: 3569..."
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>

              <Field label="Manufacture Date *">
                <input
                  style={input}
                  type="date"
                  value={editMfgDate}
                  onChange={(e) => setEditMfgDate(e.target.value)}
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>

              <Field label="Price (Optional)">
                <input style={input} placeholder="(Optional) Not editable here" disabled />
              </Field>
            </div>

            <div style={{ marginTop: 14 }}>
              <Field label="Description">
                <textarea
                  style={{ ...input, minHeight: 80, resize: "vertical" }}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. 256GB, Titanium Blue, Factory Sealed"
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>
            </div>

            <div style={infoBox}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                🔒 Unique QR Code Generation
              </div>
              <div style={{ fontSize: 12, color: "#374151" }}>
                A new unique QR code will be automatically generated and tied to this product
                when you save your changes.
              </div>

              {qrImageUrl && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <img
                    src={qrImageUrl}
                    alt="QR Code"
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: 12,
                      background: "white",
                      padding: 8,
                    }}
                  />
                </div>
              )}
            </div>

            <div style={modalFooter}>
              <button
                type="button"
                onClick={closeEditModal}
                style={btnSecondary}
                disabled={isEditLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleUpdateProduct()}
                style={btnPrimary}
                disabled={
                  isEditLoading ||
                  !!(editError && editError.toLowerCase().includes("immutable"))
                }
                title={
                  editError && editError.toLowerCase().includes("immutable")
                    ? "On-chain product cannot be updated"
                    : "Update"
                }
              >
                {isEditLoading ? "Updating..." : "Update & Generate New QR Code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- helpers ----------------- */

function withNoCache(url: string) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}ts=${Date.now()}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

/* ----------------- STYLES ----------------- */

const th: React.CSSProperties = {
  padding: "14px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "14px",
  borderBottom: "1px solid #ddd",
};

const td: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #eee",
  fontSize: "14px",
};

const iconBtn: React.CSSProperties = {
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: "18px",
  marginRight: "10px",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  zIndex: 9999,
};

const modalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "white",
  borderRadius: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  padding: 18,
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const modalCloseBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
};

const infoBox: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
};

const modalFooter: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 14,
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const alertError: React.CSSProperties = {
  background: "#ffe6e6",
  color: "#a11",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 10,
};

const alertSuccess: React.CSSProperties = {
  background: "#e7ffef",
  color: "#116a2b",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 10,
};
