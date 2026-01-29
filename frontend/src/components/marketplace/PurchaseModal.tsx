
import React from "react";

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  price: string;
  sellerName: string;
  onConfirm: () => void;
  loading: boolean;
  solAmount: number;
  error?: string | null;
  success?: string | null;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  open,
  onClose,
  productName,
  price,
  sellerName,
  onConfirm,
  loading,
  solAmount,
  error,
  success,
}) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.35)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)"
    }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 36, minWidth: 360, boxShadow: "0 4px 32px rgba(0,0,0,0.18)", position: "relative", maxWidth: 420 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1e293b", letterSpacing: 0.2 }}>Confirm Purchase</h2>
        <div style={{ margin: "18px 0 0 0", fontSize: 16, color: "#334155" }}>
          <div style={{ marginBottom: 8 }}><b>Product:</b> {productName}</div>
          <div style={{ marginBottom: 8 }}><b>Price:</b> {price} <span style={{ color: "#64748b" }}>(~{solAmount.toFixed(4)} SOL)</span></div>
          <div><b>Seller:</b> <span style={{ color: "#0ea5e9", fontWeight: 600 }}>{sellerName}</span></div>
        </div>
        {error && (
          <div style={{ marginTop: 18, background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: "10px 14px", fontWeight: 500, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div style={{ marginTop: 18, background: "#dcfce7", color: "#166534", borderRadius: 8, padding: "10px 14px", fontWeight: 500, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span> {success}
          </div>
        )}
        <div style={{ marginTop: 28, display: "flex", gap: 14, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "11px 22px", borderRadius: 9, border: "none", background: "#f1f5f9", fontWeight: 600, fontSize: 15, color: "#334155", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.18s" }} disabled={loading}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: "11px 22px", borderRadius: 9, border: "none", background: loading ? "#a7f3d0" : "#22c55e", color: "white", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: loading ? "none" : "0 2px 8px rgba(34,197,94,0.08)" }} disabled={loading || !!success}>
            {loading ? <span style={{ display: "inline-block", width: 18, height: 18, border: "3px solid #fff", borderTop: "3px solid #22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> : "Pay & Transfer"}
          </button>
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
};

export default PurchaseModal;
