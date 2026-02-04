import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { API_ROOT } from "../../config/api";
import "../../styles/marketplace.css";

type Props = {
  open: boolean;
  onClose: () => void;
  sellerId: number;
  onCompleted?: () => void;
};

type SellerRequest = {
  request_id: number;
  product_id: number;
  listing_id: number | null;
  seller_id: number;
  buyer_id: number;
  offered_price: string;
  offered_currency: string;
  status: string;
  payment_tx_hash: string | null;
  created_on: string;
  updated_on: string;
  serial_no: string;
  model: string | null;
  seller_username: string;
  buyer_username: string;
};

const SellerPurchaseRequestModal: React.FC<Props> = ({ open, onClose, sellerId, onCompleted }) => {
  const [requestId, setRequestId] = useState<string>("");
  const [transferTxHash, setTransferTxHash] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const parseRequestId = () => {
    const rid = Number(requestId);
    if (!rid || Number.isNaN(rid)) throw new Error("Enter a valid Request ID");
    return rid;
  };

  const loadRequests = async () => {
    setLoadingList(true);
    try {
      const res = await axios.get<{ success: boolean; data?: SellerRequest[] }>(
        `${API_ROOT}/products/marketplace/purchase/requests/seller`,
        { params: { sellerId }, withCredentials: true }
      );
      if (!res.data?.success || !res.data?.data) {
        setRequests([]);
        return;
      }
      setRequests(res.data.data);
    } catch {
      setRequests([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadRequests();
  }, [open]);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const rid = parseRequestId();
      const res = await axios.post(
        `${API_ROOT}/products/marketplace/purchase/accept`,
        { requestId: rid, sellerId },
        { withCredentials: true }
      );

      if (!res.data?.success) throw new Error(res.data?.error || "Accept failed");

      setSuccess("Purchase request accepted. Waiting for buyer payment.");
      onCompleted?.();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Accept failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const rid = parseRequestId();
      const res = await axios.post(
        `${API_ROOT}/products/marketplace/purchase/reject`,
        { requestId: rid, sellerId, reason: reason || undefined },
        { withCredentials: true }
      );

      if (!res.data?.success) throw new Error(res.data?.error || "Reject failed");

      setSuccess("Purchase request rejected.");
      onCompleted?.();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Reject failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const rid = parseRequestId();
      if (!transferTxHash.trim()) throw new Error("Transfer tx hash is required");

      const res = await axios.post(
        `${API_ROOT}/products/marketplace/purchase/finalize`,
        { requestId: rid, sellerId, transferTxHash: transferTxHash.trim() },
        { withCredentials: true }
      );

      if (!res.data?.success) throw new Error(res.data?.error || "Finalize failed");

      setSuccess("Transfer finalized and ownership updated.");
      onCompleted?.();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Finalize failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="marketplace-modal-backdrop">
      <div className="marketplace-modal">
        <h2 className="marketplace-modal-title">Handle Purchase Request</h2>
        <p style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
          Enter a Request ID and choose an action.
        </p>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
            Request ID
          </label>
          <input
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            className="marketplace-input"
            placeholder="e.g. 123"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Incoming Requests</p>
            <button className="btn btn-ghost" onClick={loadRequests} disabled={loadingList}>
              Refresh
            </button>
          </div>
          {loadingList && <p className="marketplace-subtitle">Loading requests…</p>}
          {!loadingList && requests.length === 0 && (
            <p className="marketplace-subtitle" style={{ marginTop: 6 }}>No requests yet.</p>
          )}
          {!loadingList && requests.length > 0 && (
            <div style={{ marginTop: 8, display: "grid", gap: 8, maxHeight: 160, overflow: "auto" }}>
              {requests.map((r) => (
                <button
                  key={r.request_id}
                  className="btn btn-ghost"
                  onClick={() => setRequestId(String(r.request_id))}
                  style={{ textAlign: "left" }}
                >
                  #{r.request_id} • {r.model || r.serial_no} • {r.status} • buyer {r.buyer_username}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
            Transfer Tx Hash (for finalize)
          </label>
          <input
            value={transferTxHash}
            onChange={(e) => setTransferTxHash(e.target.value)}
            className="marketplace-input"
            placeholder="Blockchain transfer tx hash"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
            Reject Reason (optional)
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="marketplace-input"
            placeholder="Optional reason"
            style={{ width: "100%" }}
          />
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
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleAccept} disabled={loading}>
            Accept
          </button>
          <button className="btn btn-danger" onClick={handleReject} disabled={loading}>
            Reject
          </button>
          <button className="btn btn-success" onClick={handleFinalize} disabled={loading}>
            Finalize
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SellerPurchaseRequestModal;
