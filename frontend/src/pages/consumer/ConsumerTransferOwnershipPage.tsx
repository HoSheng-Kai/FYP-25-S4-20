import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TransferOwnershipModal from "../../components/transfers/TransferOwnershipModal";
import axios from "axios";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";


const API = "https://fyp-25-s4-20.duckdns.org/api/products";

type OwnedProduct = {
  productId: number;
  serialNo: string;
  model: string | null;
  batchNo: string | null;
  category: string | null;
  status: string;
  registeredOn: string;
  listingStatus: "none" | "available" | "reserved" | "sold";
  canCreateListing: boolean;
};

export default function ConsumerTransferOwnershipPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [products, setProducts] = useState<OwnedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notif, setNotif] = useState<string | null>(null);

  const userId = (() => {
    const raw = localStorage.getItem("userId");
    return raw ? Number(raw) : NaN;
  })();

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      if (!Number.isFinite(userId)) {
        setError("No userId found. Please login again.");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get<{ success: boolean; data?: OwnedProduct[]; error?: string }>(`${API}/owned`, { params: { userId } });
        if (res.data.success && res.data.data) {
          setProducts(res.data.data);
        } else {
          setError(res.data.error || "Failed to load products");
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || "Failed to load your products");
      } finally {
        setLoading(false);
      }
    };
    void loadProducts();
  }, [userId]);

  const handleProductSelect = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 0 }}>
      <div style={{
        background: "white",
        borderRadius: 18,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        padding: 32,
        border: "1px solid #e5e7eb",
        marginBottom: 32,
      }}>
        <div style={{ marginBottom: 18, display: "flex", justifyContent: "flex-end" }}>
          <WalletMultiButton />
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 18, color: "#1a1a1a" }}>
          Transfer Ownership
        </h2>
        <div style={{ color: "#555", fontSize: 15, marginBottom: 18 }}>
          Select one or more products below to transfer ownership to another user. You will sign the transfer with your wallet.
        </div>
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: "#2563eb" }}>Your Products</h3>
          {loading ? (
            <div style={{ color: "#999", fontSize: 15, padding: 18, textAlign: "center" }}>Loading products...</div>
          ) : error ? (
            <div style={{ color: "#a11", fontSize: 15, padding: 18, textAlign: "center" }}>{error}</div>
          ) : products.length === 0 ? (
            <div style={{ color: "#666", fontSize: 15, padding: 18, textAlign: "center" }}>No products found.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {products.map((p) => (
                <label key={p.productId} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  background: selectedProductIds.includes(p.productId) ? "#f3f6fd" : "#f9fafb",
                  border: selectedProductIds.includes(p.productId) ? "2px solid #2563eb" : "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "12px 16px",
                  transition: "all 0.2s",
                }}>
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.productId)}
                    onChange={() => handleProductSelect(p.productId)}
                    disabled={loading}
                    style={{ width: 18, height: 18, accentColor: "#2563eb" }}
                  />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#1a1a1a" }}>
                      {p.model || p.serialNo}
                    </div>
                    <div style={{ color: "#888", fontSize: 13 }}>
                      Serial: <span style={{ fontFamily: "monospace" }}>{p.serialNo}</span> &nbsp;|&nbsp; ID: #{p.productId}
                    </div>
                    <div style={{ color: "#2563eb", fontSize: 13, marginTop: 2 }}>
                      {p.category}
                    </div>
                  </div>
                  {/* No icon, just clean layout */}
                </label>
              ))}
            </div>
          )}
        </div>
        <button
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 12,
            background: selectedProductIds.length > 0 ? "#2563eb" : "#cbd5e1",
            color: "white",
            fontWeight: 700,
            fontSize: 17,
            border: "none",
            cursor: selectedProductIds.length > 0 && !loading ? "pointer" : "not-allowed",
            marginTop: 10,
            boxShadow: selectedProductIds.length > 0 ? "0 2px 8px rgba(37,99,235,0.08)" : "none",
            transition: "all 0.2s",
          }}
          onClick={() => setModalOpen(true)}
          disabled={selectedProductIds.length === 0 || loading}
        >
          Start Ownership Transfer
        </button>
      </div>
      <TransferOwnershipModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fromUserId={userId}
        selectedProductIds={selectedProductIds}
        title="Ownership Transfer"
        onTransferred={(results) => {
          setModalOpen(false);
          // Find the recipient username if possible
          const recipient = results && results.length > 0 && results[0].ok && results[0].message ? results[0].message : "another consumer";
          setNotif(`Ownership transfer proposed to ${recipient}.`);
          setTimeout(() => {
            setNotif(null);
            navigate("/consumer");
          }, 2200);
        }}
      />
      {notif && (
        <div style={{
          position: "fixed",
          top: 30,
          left: 0,
          right: 0,
          margin: "0 auto",
          maxWidth: 400,
          background: "#2563eb",
          color: "white",
          padding: 16,
          borderRadius: 10,
          textAlign: "center",
          fontWeight: 600,
          fontSize: 16,
          zIndex: 9999,
          boxShadow: "0 2px 12px rgba(37,99,235,0.15)"
        }}>
          {notif}
        </div>
      )}
    </div>
  );
}
