import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  USERS_API_BASE_URL,
  PRODUCTS_API_BASE_URL,
  DISTRIBUTOR_API_BASE_URL,
} from "../../config/api";
import NotificationBell from "../../components/notifications/NotificationBell";

type VerifiedProduct = {
  productId: number;
  serialNumber: string;
  productName: string | null;
};

type VerifyResponse = {
  success: boolean;
  data?: {
    productId: number;
    serialNumber: string;
    productName: string | null;
  };
  error?: string;
  details?: string;
};

type ProductOption = {
  productId: number;
  label: string; // "SN-001 • Product A"
};

export default function DistributorDashboardPage() {
  const navigate = useNavigate();

  // ---------- LOGOUT ----------
  const handleLogout = async () => {
    try {
      await axios.post(`${USERS_API_BASE_URL}/logout-account`);

      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("username");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");

      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // =========================================================
  // Form State
  // =========================================================
  const [serialInput, setSerialInput] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");

  // Retailer inputs (no backend endpoint to list retailers)
  const [retailerUserId, setRetailerUserId] = useState<number | "">("");
  const [retailerPublicKey, setRetailerPublicKey] = useState("");

  // Optional display fields (pure UI)
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

  // =========================================================
  // Add product to dropdown by verifying serial (existing backend)
  // GET /api/products/verify?serial=...
  // =========================================================
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

      const verified: VerifiedProduct = res.data.data;

      // Prevent duplicates
      const exists = products.some((p) => p.productId === verified.productId);
      const label = `${verified.serialNumber} • ${verified.productName ?? "Unnamed Product"}`;

      if (!exists) {
        const next = [...products, { productId: verified.productId, label }];
        setProducts(next);
        setSelectedProductId(verified.productId);
      } else {
        // If already exists, just select it
        setSelectedProductId(verified.productId);
      }

      setOk("Product added.");
      setSerialInput("");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "Failed to verify/add product."
      );
    } finally {
      setAddingProduct(false);
    }
  };

  // =========================================================
  // Complete transfer (existing backend)
  // POST /api/distributor/update-ownership
  // =========================================================
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
      setError(
        "Missing distributor wallet keys. Ensure localStorage.publicKey and localStorage.privateKey are set."
      );
      return;
    }

    const payload = {
      from_user_id: fromUserId,
      from_public_key: fromPublicKey,
      from_private_key: fromPrivateKey,
      to_user_id: retailerUserId,
      to_public_key: retailerPublicKey.trim(),
      product_id: selectedProductId,
      notes, // backend ignores (safe to send)
    };

    try {
      setSubmitting(true);

      const res = await axios.post(`${DISTRIBUTOR_API_BASE_URL}/update-ownership`, payload);

      if (res.data?.success) {
        setOk("Transfer completed successfully.");
        setNotes("");
        // optional: keep product selection, or reset:
        // setSelectedProductId("");
      } else {
        setError("Transfer failed. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
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
    <div className="dashboard-container" style={{ display: "flex" }}>
      {/* =======================
          SIDEBAR NAVIGATION
      ======================== */}
      <aside
        className="sidebar"
        style={{
          width: "240px",
          background: "#0d1b2a",
          color: "white",
          padding: "20px",
          minHeight: "100vh",
          position: "relative",
        }}
      >
        <h2 style={{ marginBottom: "30px" }}>Distributor</h2>

        <nav className="sidebar-nav">
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: "20px" }}>
              <Link to="/QrInput" style={{ color: "white", textDecoration: "none" }}>
                Scan QR
              </Link>
            </li>

            <li style={{ marginBottom: "20px" }}>
              <a href="#transfer" style={{ color: "white", textDecoration: "none" }}>
                Transfer Ownership
              </a>
            </li>
          </ul>
        </nav>

        {/* =======================
            SETTINGS + LOGOUT
        ======================== */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "20px",
            right: "20px",
          }}
        >
          <div style={{ marginBottom: "15px", cursor: "pointer" }}>⚙ Settings</div>

          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ➜ Logout
          </button>
        </div>
      </aside>

      {/* =======================
          MAIN DASHBOARD CONTENT
      ======================== */}
      <main
        style={{
          padding: "40px",
          flexGrow: 1,
          background: "#f5f7fb",
        }}
      >
        {/* Top header row with notification bell */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1 style={{ marginBottom: "6px" }}>Supply Chain Transfer</h1>
            <p style={{ color: "#555", margin: 0 }}>Transfer products to retailers</p>
          </div>

          <NotificationBell />
        </div>

        {/* =======================
            TRANSFER CARD (matches screenshot layout)
        ======================== */}
        <section id="transfer" style={{ maxWidth: "980px" }}>
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
              padding: "22px",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: "12px",
                padding: "18px",
              }}
            >
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontWeight: 700, marginBottom: "4px", color: "#111827" }}>
                  Transfer Details
                </div>
                <div style={{ color: "#6b7280", fontSize: "14px" }}>
                  Move products to retailers
                </div>
              </div>

              {/* Add product by serial (so dropdown can exist using existing backend) */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                  Add Product by Serial <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    placeholder="Enter serial number (or scan QR)"
                    style={{
                      flex: "1 1 320px",
                      padding: "10px 12px",
                      borderRadius: "10px",
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
                      borderRadius: "10px",
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
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                  Select Product <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) =>
                    setSelectedProductId(e.target.value ? Number(e.target.value) : "")
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "white",
                    outline: "none",
                  }}
                >
                  <option value="">{products.length ? "Choose a product" : "Add a product above"}</option>
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.label}
                    </option>
                  ))}
                </select>

                {selectedProduct && (
                  <div style={{ marginTop: "6px", color: "#6b7280", fontSize: 13 }}>
                    Selected Product ID: <b>{selectedProduct.productId}</b>
                  </div>
                )}
              </div>

              {/* Select Retailer (manual inputs, since backend has no retailer list endpoint) */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
                  Select Retailer <span style={{ color: "#dc2626" }}>*</span>
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <input
                    value={retailerUserId === "" ? "" : String(retailerUserId)}
                    onChange={(e) =>
                      setRetailerUserId(e.target.value ? Number(e.target.value) : "")
                    }
                    placeholder="Retailer User ID (e.g. 6)"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
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
                      borderRadius: "10px",
                      border: "1px solid rgba(0,0,0,0.12)",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Optional fields for the green panel display */}
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input
                    value={retailerCompany}
                    onChange={(e) => setRetailerCompany(e.target.value)}
                    placeholder="Company (optional)"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
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
                      borderRadius: "10px",
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
                      borderRadius: "10px",
                      border: "1px solid rgba(0,0,0,0.12)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Retailer Info Panel (like screenshot) */}
              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid rgba(16,185,129,0.25)",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: "240px" }}>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>Company:</div>
                  <div style={{ fontWeight: 700 }}>{retailerCompany || "—"}</div>

                  <div style={{ height: "10px" }} />

                  <div style={{ fontSize: "13px", color: "#6b7280" }}>Type:</div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 700 }}>Retailer</span>
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "2px 10px",
                        borderRadius: "999px",
                        background: "#d1fae5",
                        color: "#065f46",
                        fontWeight: 700,
                      }}
                    >
                      Retailer
                    </span>
                  </div>
                </div>

                <div style={{ minWidth: "240px" }}>
                  <div style={{ fontSize: "13px", color: "#6b7280" }}>Email:</div>
                  <div style={{ fontWeight: 600 }}>{retailerEmail || "—"}</div>

                  <div style={{ height: "10px" }} />

                  <div style={{ fontSize: "13px", color: "#6b7280" }}>Phone:</div>
                  <div style={{ fontWeight: 600 }}>{retailerPhone || "—"}</div>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "6px" }}>
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
                    borderRadius: "10px",
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
                    marginBottom: "12px",
                    padding: "10px 12px",
                    borderRadius: "10px",
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
                    marginBottom: "12px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    border: "1px solid rgba(16,185,129,0.25)",
                    color: "#065f46",
                    fontWeight: 700,
                  }}
                >
                  {ok}
                </div>
              )}

              {/* Complete Transfer Button */}
              <button
                onClick={handleCompleteTransfer}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  background: "#0b1220",
                  color: "white",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <span style={{ fontSize: "14px" }}>⬡</span>
                {submitting ? "Processing Transfer..." : "Complete Transfer"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
