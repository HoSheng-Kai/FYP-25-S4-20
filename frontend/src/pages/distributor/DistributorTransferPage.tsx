// src/pages/distributor/DistributorTransferPage.tsx
// -----------------------------------------------------------------------------
// Transfer Ownership page (US for distributor flows)
// - No sidebar here (DistributorLayout owns the sidebar)
// - This used to be inside DistributorDashboardPage
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import axios from "axios";
import { PRODUCTS_API_BASE_URL, DISTRIBUTOR_API_BASE_URL } from "../../config/api";
import NotificationBell from "../../components/notifications/NotificationBell";

type VerifiedProduct = {
  productId: number;
  serialNumber: string;
  productName: string | null;
};

type VerifyResponse = {
  success: boolean;
  data?: VerifiedProduct;
  error?: string;
  details?: string;
};

type ProductOption = {
  productId: number;
  label: string;
};

export default function DistributorTransferPage() {
  const [serialInput, setSerialInput] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");

  const [retailerUserId, setRetailerUserId] = useState<number | "">("");
  const [retailerPublicKey, setRetailerPublicKey] = useState("");

  const [retailerCompany, setRetailerCompany] = useState("Test Company");
  const [retailerEmail, setRetailerEmail] = useState("bob_ret@test.com");
  const [retailerPhone, setRetailerPhone] = useState("+1 234 567 8903");

  const [notes, setNotes] = useState("");

  const [addingProduct, setAddingProduct] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const selectedProduct = useMemo(() => {
    if (selectedProductId === "") return null;
    return products.find((p) => p.productId === selectedProductId) || null;
  }, [selectedProductId, products]);

  const handleAddProductBySerial = async () => {
    setError(null);
    setOk(null);

    const serial = serialInput.trim();
    if (!serial) {
      setError("Please enter a serial number.");
      return;
    }

    try {
      setAddingProduct(true);

      const res = await axios.get<VerifyResponse>(`${PRODUCTS_API_BASE_URL}/verify`, {
        params: { serial },
      });

      if (!res.data?.success || !res.data.data) {
        setError(res.data?.error || res.data?.details || "Failed to verify product.");
        return;
      }

      const verified = res.data.data;

      const exists = products.some((p) => p.productId === verified.productId);
      const label = `${verified.serialNumber} • ${verified.productName ?? "Unnamed Product"}`;

      if (!exists) setProducts((prev) => [...prev, { productId: verified.productId, label }]);
      setSelectedProductId(verified.productId);

      setOk("Product added.");
      setSerialInput("");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "Failed to verify/add product."
      );
    } finally {
      setAddingProduct(false);
    }
  };

  const handleCompleteTransfer = async () => {
    setError(null);
    setOk(null);

    if (selectedProductId === "") {
      setError("Please select a product.");
      return;
    }
    if (retailerUserId === "" || !retailerPublicKey.trim()) {
      setError("Please enter retailer user ID and retailer public key.");
      return;
    }

    const fromUserId = Number(localStorage.getItem("userId"));
    const fromPublicKey = localStorage.getItem("publicKey") || "";
    const fromPrivateKey = localStorage.getItem("privateKey") || "";

    if (!fromUserId) {
      setError("Missing distributor userId (localStorage.userId).");
      return;
    }
    if (!fromPublicKey || !fromPrivateKey) {
      setError("Missing distributor wallet keys (publicKey/privateKey in localStorage).");
      return;
    }

    const payload = {
      from_user_id: fromUserId,
      from_public_key: fromPublicKey,
      from_private_key: fromPrivateKey,
      to_user_id: retailerUserId,
      to_public_key: retailerPublicKey.trim(),
      product_id: selectedProductId,
      notes,
    };

    try {
      setSubmitting(true);
      const res = await axios.post(`${DISTRIBUTOR_API_BASE_URL}/update-ownership`, payload);

      if (res.data?.success) {
        setOk("Transfer completed successfully.");
        setNotes("");
      } else {
        setError("Transfer failed. Please try again.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.details ||
          err?.response?.data?.error ||
          "Transfer failed due to a server error."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6 }}>Transfer Ownership</h1>
          <p style={{ color: "#555", margin: 0 }}>Transfer products to retailers</p>
        </div>

        <NotificationBell />
      </div>

      {/* Transfer UI */}
      <section style={{ maxWidth: 980 }}>
        <div
          style={{
            background: "white",
            borderRadius: 14,
            boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
            padding: 22,
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 12,
              padding: 18,
            }}
          >
            {/* Add Product */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: "#111827" }}>
                Transfer Details
              </div>
              <div style={{ color: "#6b7280", fontSize: 14 }}>Move products to retailers</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                Add Product by Serial <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder="Enter serial number (or scan QR)"
                  style={{
                    flex: "1 1 320px",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "white",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleAddProductBySerial}
                  disabled={addingProduct}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "none",
                    cursor: addingProduct ? "not-allowed" : "pointer",
                    background: "#0b1220",
                    color: "white",
                    fontWeight: 800,
                    opacity: addingProduct ? 0.7 : 1,
                  }}
                >
                  {addingProduct ? "Adding..." : "Add"}
                </button>
              </div>
            </div>

            {/* Select Product */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                Select Product <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : "")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  outline: "none",
                }}
              >
                <option value="">
                  {products.length ? "Choose a product" : "Add a product above"}
                </option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.label}
                  </option>
                ))}
              </select>

              {selectedProduct && (
                <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>
                  Selected Product ID: <b>{selectedProduct.productId}</b>
                </div>
              )}
            </div>

            {/* Retailer inputs */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                Select Retailer <span style={{ color: "#dc2626" }}>*</span>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  value={retailerUserId === "" ? "" : String(retailerUserId)}
                  onChange={(e) => setRetailerUserId(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Retailer User ID (e.g. 6)"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                  }}
                />
                <input
                  value={retailerPublicKey}
                  onChange={(e) => setRetailerPublicKey(e.target.value)}
                  placeholder="Retailer Public Key"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input
                  value={retailerCompany}
                  onChange={(e) => setRetailerCompany(e.target.value)}
                  placeholder="Company (optional)"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                  }}
                />
                <input
                  value={retailerEmail}
                  onChange={(e) => setRetailerEmail(e.target.value)}
                  placeholder="Email (optional)"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                  }}
                />
                <input
                  value={retailerPhone}
                  onChange={(e) => setRetailerPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                Shipping/Transfer Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add shipping details, tracking number, or other notes..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "white",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Error / Success */}
            {error && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#fef2f2",
                  border: "1px solid rgba(220,38,38,0.25)",
                  color: "#991b1b",
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}
            {ok && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#ecfdf5",
                  border: "1px solid rgba(16,185,129,0.25)",
                  color: "#065f46",
                  fontWeight: 700,
                }}
              >
                {ok}
              </div>
            )}

            <button
              onClick={handleCompleteTransfer}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                background: "#0b1220",
                color: "white",
                fontWeight: 800,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Processing Transfer..." : "Complete Transfer"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
