import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { API_ROOT, NOTIFICATIONS_API_BASE_URL, USERS_API_BASE_URL } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";
import { getProgram, getProvider } from "../../lib/anchorClient";
import { deriveTransferPda } from "../../lib/pdas";
import "../../styles/marketplace.css";

type RequestRow = {
  request_id: number;
  product_id: number;
  listing_id: number | null;
  seller_id: number;
  buyer_id: number;
  offered_price: string;
  offered_currency: string;
  status: string;
  payment_tx_hash: string | null;
  transfer_pda?: string | null;
  product_pda?: string | null;
  created_on: string;
  updated_on: string;
  serial_no: string;
  model: string | null;
  seller_username: string;
  buyer_username: string;
};

export default function PurchaseRequestsPage() {
  const { auth } = useAuth();
  const userId = auth.user?.userId;
  const wallet = useWallet();

  if (auth.loading) {
    return (
      <div className="marketplace-page">
        <p className="marketplace-subtitle">Checking session…</p>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="marketplace-page">
        <p className="marketplace-subtitle">You are not logged in.</p>
      </div>
    );
  }

  const [tab, setTab] = useState<"buyer" | "seller">("buyer");
  const [buyerRows, setBuyerRows] = useState<RequestRow[]>([]);
  const [sellerRows, setSellerRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [usersById, setUsersById] = useState<Record<number, string>>({});
  const [walletHint, setWalletHint] = useState<string | null>(null);

  const sseRef = useRef<EventSource | null>(null);

  const loadBuyer = useCallback(async () => {
    if (!userId) return;
    const res = await axios.get<{ success: boolean; data?: RequestRow[] }>(
      `${API_ROOT}/products/marketplace/purchase/requests/buyer`,
      { params: { buyerId: userId }, withCredentials: true }
    );
    if (res.data?.success && res.data?.data) setBuyerRows(res.data.data);
    else setBuyerRows([]);
  }, [userId]);

  const loadSeller = useCallback(async () => {
    if (!userId) return;
    const res = await axios.get<{ success: boolean; data?: RequestRow[] }>(
      `${API_ROOT}/products/marketplace/purchase/requests/seller`,
      { params: { sellerId: userId }, withCredentials: true }
    );
    if (res.data?.success && res.data?.data) setSellerRows(res.data.data);
    else setSellerRows([]);
  }, [userId]);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadBuyer(), loadSeller()]);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [userId, loadBuyer, loadSeller]);

  useEffect(() => {
    if (auth.loading) return;
    if (!userId) return;
    void loadAll();
  }, [auth.loading, userId, loadAll]);

  useEffect(() => {
    if (auth.loading || !auth.user) return;

    (async () => {
      try {
        const res = await axios.get<{ success: boolean; data?: { user_id: number; public_key: string | null }[] }>(
          `${USERS_API_BASE_URL}/list`,
          { withCredentials: true }
        );
        if (res.data?.success && Array.isArray(res.data.data)) {
          const map: Record<number, string> = {};
          res.data.data.forEach((u) => {
            if (u.public_key) map[u.user_id] = u.public_key;
          });
          setUsersById(map);
        }
      } catch {
        setUsersById({});
      }
    })();
  }, [auth.loading, auth.user]);

  // SSE autorefresh via notifications stream
  useEffect(() => {
    if (!userId) return;

    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const url = `${NOTIFICATIONS_API_BASE_URL}/stream?userId=${userId}`;
    let es: EventSource;
    try {
      es = new EventSource(url, { withCredentials: true });
    } catch {
      es = new EventSource(url);
    }

    sseRef.current = es;

    const onNotification = () => {
      if (document.hidden) return;
      if (busyId !== null) return;
      void loadAll();
    };

    es.addEventListener("notification", onNotification as any);

    return () => {
      es.removeEventListener("notification", onNotification as any);
      es.close();
      if (sseRef.current === es) sseRef.current = null;
    };
  }, [userId, busyId, loadAll]);

  const ensureWalletConnected = (action: string) => {
    if (!wallet.publicKey || !wallet.connected) {
      setError(`Wallet not connected. Please connect to ${action}.`);
      return false;
    }
    return true;
  };

  const resolveUserPubkey = (id: number, label: string) => {
    const key = usersById[id];
    if (!key) throw new Error(`Missing ${label} wallet public key.`);
    return new PublicKey(key);
  };

  const fetchProductPda = async (productId: number): Promise<PublicKey> => {
    const res = await axios.get<{ success: boolean; data?: { product_pda?: string }; error?: string }>(
      `${API_ROOT}/distributors/product/${productId}`,
      { withCredentials: true }
    );
    if (!res.data?.success) throw new Error(res.data?.error || "Failed to load product info");
    const pda = res.data?.data?.product_pda;
    if (!pda) throw new Error("Missing product_pda in backend response");
    return new PublicKey(pda);
  };

  const handleReject = async (requestId: number) => {
    if (!userId) return;
    setBusyId(requestId);
    try {
      await axios.post(
        `${API_ROOT}/products/marketplace/purchase/reject`,
        { requestId, sellerId: userId },
        { withCredentials: true }
      );
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleProposeOnChain = async (row: RequestRow) => {
    if (!userId) return;
    if (!ensureWalletConnected("propose this transfer")) return;

    setBusyId(row.request_id);
    setError(null);
    setWalletHint(null);

    try {
      const sellerPubkey = resolveUserPubkey(row.seller_id, "seller");
      if (wallet.publicKey!.toBase58() !== sellerPubkey.toBase58()) {
        setWalletHint(`Wrong wallet connected. Expected seller: ${sellerPubkey.toBase58()}`);
        return;
      }

      const buyerPubkey = resolveUserPubkey(row.buyer_id, "buyer");
      const productPda = row.product_pda ? new PublicKey(row.product_pda) : await fetchProductPda(row.product_id);
      const transferPda = row.transfer_pda
        ? new PublicKey(row.transfer_pda)
        : (await deriveTransferPda(productPda, sellerPubkey, buyerPubkey))[0];

      const provider = getProvider(wallet);
      const program = getProgram(provider);

      await program.methods
        .proposeTransfer()
        .accounts({
          fromOwner: wallet.publicKey!,
          product: productPda,
          toOwner: buyerPubkey,
          transferRequest: transferPda,
        })
        .rpc();

      await axios.post(
        `${API_ROOT}/products/marketplace/purchase/accept`,
        {
          requestId: row.request_id,
          sellerId: userId,
          transferPda: transferPda.toBase58(),
          productPda: productPda.toBase58(),
        },
        { withCredentials: true }
      );

      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Propose failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleBuyerAcceptOnChain = async (row: RequestRow) => {
    if (!userId) return;
    if (!ensureWalletConnected("accept this transfer")) return;

    setBusyId(row.request_id);
    setError(null);
    setWalletHint(null);

    try {
      const buyerPubkey = resolveUserPubkey(row.buyer_id, "buyer");
      if (wallet.publicKey!.toBase58() !== buyerPubkey.toBase58()) {
        setWalletHint(`Wrong wallet connected. Expected buyer: ${buyerPubkey.toBase58()}`);
        return;
      }

      const sellerPubkey = resolveUserPubkey(row.seller_id, "seller");
      const productPda = row.product_pda ? new PublicKey(row.product_pda) : await fetchProductPda(row.product_id);
      const transferPda = row.transfer_pda
        ? new PublicKey(row.transfer_pda)
        : (await deriveTransferPda(productPda, sellerPubkey, buyerPubkey))[0];

      const provider = getProvider(wallet);
      const program = getProgram(provider);

      await program.methods
        .acceptTransfer()
        .accounts({
          toOwner: wallet.publicKey!,
          transferRequest: transferPda,
        })
        .rpc();

      await axios.post(
        `${API_ROOT}/products/marketplace/purchase/buyer-accept`,
        { requestId: row.request_id, buyerId: userId },
        { withCredentials: true }
      );

      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Accept failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleBuyerReject = async (row: RequestRow) => {
    if (!userId) return;
    setBusyId(row.request_id);
    setError(null);
    try {
      await axios.post(
        `${API_ROOT}/products/marketplace/purchase/buyer-cancel`,
        { requestId: row.request_id, buyerId: userId },
        { withCredentials: true }
      );
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Cancel failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleExecuteOnChain = async (row: RequestRow) => {
    if (!userId) return;
    if (!ensureWalletConnected("execute this transfer")) return;

    setBusyId(row.request_id);
    setError(null);
    setWalletHint(null);

    try {
      const sellerPubkey = resolveUserPubkey(row.seller_id, "seller");
      if (wallet.publicKey!.toBase58() !== sellerPubkey.toBase58()) {
        setWalletHint(`Wrong wallet connected. Expected seller: ${sellerPubkey.toBase58()}`);
        return;
      }

      const buyerPubkey = resolveUserPubkey(row.buyer_id, "buyer");
      const productPda = row.product_pda ? new PublicKey(row.product_pda) : await fetchProductPda(row.product_id);
      const transferPda = row.transfer_pda
        ? new PublicKey(row.transfer_pda)
        : (await deriveTransferPda(productPda, sellerPubkey, buyerPubkey))[0];

      const provider = getProvider(wallet);
      const program = getProgram(provider);

      const executeTx = await program.methods
        .executeTransfer()
        .accounts({
          fromOwner: wallet.publicKey!,
          product: productPda,
          transferRequest: transferPda,
        })
        .rpc();

      await axios.post(
        `${API_ROOT}/products/marketplace/purchase/finalize`,
        { requestId: row.request_id, sellerId: userId, transferTxHash: executeTx },
        { withCredentials: true }
      );

      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Execute failed");
    } finally {
      setBusyId(null);
    }
  };

  const rows = useMemo(() => (tab === "buyer" ? buyerRows : sellerRows), [tab, buyerRows, sellerRows]);

  return (
    <div className="marketplace-page">
      <div className="marketplace-header" style={{ marginBottom: 12 }}>
        <div>
          <h1 className="marketplace-title">Purchase Requests</h1>
          <p className="marketplace-subtitle">Manage buyer and seller requests.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <WalletMultiButton className="btn btn-ghost" />
          <button className="btn btn-ghost" onClick={loadAll} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          className={`btn ${tab === "buyer" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("buyer")}
        >
          My Buy Requests
        </button>
        <button
          className={`btn ${tab === "seller" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTab("seller")}
        >
          Incoming Requests
        </button>
      </div>

      {loading && <p className="marketplace-subtitle">Loading…</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {walletHint && <p style={{ color: "#b45309" }}>{walletHint}</p>}

      {rows.length === 0 && !loading && (
        <div className="marketplace-empty">No requests to show.</div>
      )}

      {rows.length > 0 && (
        <div
          className="marketplace-grid"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          {rows.map((r) => (
            <div className="marketplace-card" key={r.request_id}>
              <div className="marketplace-card-header">
                <div>
                  <h3 className="marketplace-card-title">
                    {r.model || r.serial_no}
                  </h3>
                  <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#6b7280" }}>
                    Request #{r.request_id}
                  </p>
                </div>
                <span className="pill pill-neutral">{r.status}</span>
              </div>

              <div style={{ marginTop: 12, fontSize: 13, color: "#374151" }}>
                <div><b>Price:</b> {r.offered_price} {r.offered_currency}</div>
                <div><b>Buyer:</b> {r.buyer_username}</div>
                <div><b>Seller:</b> {r.seller_username}</div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                {r.status === "pending_seller" && "Awaiting seller review."}
                {r.status === "accepted_waiting_payment" && "Awaiting buyer confirmation."}
                {r.status === "paid_pending_transfer" && "Ready for seller to finalize transfer."}
                {r.status === "completed" && "Transfer completed."}
                {r.status === "rejected" && "Request rejected by seller."}
                {r.status === "cancelled" && "Request cancelled by buyer."}
              </div>

              {tab === "buyer" && r.status === "accepted_waiting_payment" && (
                <div className="marketplace-actions" style={{ marginTop: 14 }}>
                  <button
                    className="btn btn-success"
                    onClick={() => handleBuyerAcceptOnChain(r)}
                    disabled={busyId === r.request_id}
                  >
                    {busyId === r.request_id ? "Working…" : "Accept"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleBuyerReject(r)}
                    disabled={busyId === r.request_id}
                  >
                    Reject
                  </button>
                </div>
              )}

              {tab === "seller" && (
                <div className="marketplace-actions" style={{ marginTop: 14 }}>
                  {r.status === "pending_seller" && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleProposeOnChain(r)}
                      disabled={busyId === r.request_id}
                    >
                      {busyId === r.request_id ? "Working…" : "Accept"}
                    </button>
                  )}
                  {r.status === "paid_pending_transfer" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleExecuteOnChain(r)}
                      disabled={busyId === r.request_id}
                    >
                      {busyId === r.request_id ? "Working…" : "Finalize Transfer"}
                    </button>
                  )}
                  {r.status === "pending_seller" && (
                    <button
                      className="btn btn-danger"
                      onClick={() => handleReject(r.request_id)}
                      disabled={busyId === r.request_id}
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
