
import React from "react";
import { createPortal } from "react-dom";
import "../../styles/marketplace.css";

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
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="marketplace-modal-backdrop">
      <div className="marketplace-modal">
        <h2 className="marketplace-modal-title">Confirm Purchase Request</h2>
        <div style={{ margin: "18px 0 0 0", fontSize: 16, color: "#334155" }}>
          <div style={{ marginBottom: 8 }}><b>Product:</b> {productName}</div>
          <div style={{ marginBottom: 8 }}>
            <b>Price:</b> {price}
            {solAmount > 0 && (
              <span style={{ color: "#64748b" }}> (~{solAmount.toFixed(4)} SOL)</span>
            )}
          </div>
          <div><b>Seller:</b> <span style={{ color: "#0ea5e9", fontWeight: 600 }}>{sellerName}</span></div>
        </div>
        {error && (
          <div className="marketplace-alert error">
            <span style={{ fontSize: 18 }}>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="marketplace-alert success">
            <span style={{ fontSize: 18 }}>✅</span> {success}
          </div>
        )}
        <div className="marketplace-modal-actions">
          <button onClick={onClose} className="btn btn-ghost" disabled={loading}>
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-success" disabled={loading || !!success}>
            {loading ? <span style={{ display: "inline-block", width: 18, height: 18, border: "3px solid #fff", borderTop: "3px solid #22c55e", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> : "Send Request"}
          </button>
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>,
    document.body
  );
};

export default PurchaseModal;
