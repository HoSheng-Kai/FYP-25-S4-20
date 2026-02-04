import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import type { MarketplaceListing } from "../../pages/marketplace/MarketplacePage";
import { API_ROOT } from "../../config/api";
import "../../styles/marketplace.css";

type Props = {
  open: boolean;
  onClose: () => void;
  listing: MarketplaceListing;
  buyerId: number;
  onCompleted?: () => void;
};

type BuyerRequest = {
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

const PurchaseRequestModal: React.FC<Props> = ({ open, onClose, listing, buyerId, onCompleted }) => {
  const wallet = useWallet();
  const [requestId, setRequestId] = useState<number | null>(null);
  const [requestIdInput, setRequestIdInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const priceValue = useMemo(() => {
    const p = parseFloat(listing.price || "0");
    return Number.isFinite(p) ? p : 0;
  }, [listing.price]);

  const currency = listing.currency || "SGD";

  const convertToSol = async (amount: number, cur: string): Promise<number> => {
    try {
      const vsCurrency = cur.toLowerCase();
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=${vsCurrency}`
      );
      const data = await res.json();
      const solPrice = data.solana?.[vsCurrency] || 0;
      if (!solPrice) return 0;
      return amount / solPrice;
    } catch {
      return 0;
    }
  };

  const loadRequests = async () => {
    setLoadingList(true);
    try {
      const res = await axios.get<{ success: boolean; data?: BuyerRequest[] }>(
        `${API_ROOT}/products/marketplace/purchase/requests/buyer`,
        { params: { buyerId }, withCredentials: true }
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

  const handlePropose = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await axios.post(
        `${API_ROOT}/products/marketplace/purchase/propose`,
        {
          listingId: listing.listingId,
          buyerId,
          offeredPrice: priceValue,
          offeredCurrency: currency,
        },
        { withCredentials: true }
      );

      if (!res.data?.success) throw new Error(res.data?.error || "Failed to create request");

      const reqId = Number(res.data?.data?.request_id ?? res.data?.data?.requestId);
      if (!reqId) throw new Error("Missing requestId from response");

      setRequestId(reqId);
      setRequestIdInput(String(reqId));
      setSuccess("Request created. Share the Request ID with the seller for acceptance.");
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to create request");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const rid = requestId ?? Number(requestIdInput);
      if (!rid || Number.isNaN(rid)) throw new Error("Enter a valid Request ID");

      if (!wallet.connected || !wallet.publicKey) throw new Error("Connect wallet first");
      if (!listing.seller.publicKey) throw new Error("Seller wallet missing");
      if (!priceValue || priceValue <= 0) throw new Error("Invalid price");

      const solAmount = await convertToSol(priceValue, currency);
      if (!solAmount || solAmount <= 0) throw new Error("Failed to convert price to SOL");

      const connection = new Connection("https://api.devnet.solana.com");
      const toPubkey = new PublicKey(listing.seller.publicKey);
      const fromPubkey = wallet.publicKey;
      const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      // @ts-ignore
      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      const res = await axios.post(
        `${API_ROOT}/products/marketplace/purchase/pay`,
        {
          requestId: rid,
          buyerId,
          paymentTxHash: signature,
        },
        { withCredentials: true }
      );

      if (!res.data?.success) throw new Error(res.data?.error || "Payment update failed");

      setSuccess("Payment recorded. Waiting for seller to finalize transfer.");
      onCompleted?.();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRequestId = async () => {
    if (!requestId) return;
    try {
      await navigator.clipboard.writeText(String(requestId));
      setSuccess("Request ID copied to clipboard.");
    } catch {
      setSuccess("Request ID ready. Copy it to share with the seller.");
    }
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="marketplace-modal-backdrop">
      <div className="marketplace-modal">
        <h2 className="marketplace-modal-title">Purchase Request</h2>
        <p style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
          Create a request, wait for seller acceptance, then pay to proceed.
        </p>

        <div style={{ marginTop: 16, fontSize: 14, color: "#334155" }}>
          <div style={{ marginBottom: 6 }}><b>Product:</b> {listing.productName || "Unknown Product"}</div>
          <div><b>Price:</b> {listing.price} {currency}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
            Request ID
          </label>
          <input
            value={requestIdInput}
            onChange={(e) => setRequestIdInput(e.target.value)}
            className="marketplace-input"
            placeholder="Enter request ID (after seller accepts)"
            style={{ width: "100%" }}
          />
          {requestId && (
            <button
              className="btn btn-ghost"
              onClick={handleCopyRequestId}
              style={{ marginTop: 8 }}
            >
              Copy Request ID
            </button>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>My Requests</p>
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
                  onClick={() => setRequestIdInput(String(r.request_id))}
                  style={{ textAlign: "left" }}
                >
                  #{r.request_id} • {r.model || r.serial_no} • {r.status}
                </button>
              ))}
            </div>
          )}
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
          <button className="btn btn-primary" onClick={handlePropose} disabled={loading}>
            Create Request
          </button>
          <button className="btn btn-success" onClick={handlePay} disabled={loading}>
            Pay Now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PurchaseRequestModal;
