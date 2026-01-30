import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MarketplaceListing } from "../../pages/marketplace/MarketplacePage";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from "@solana/web3.js";
import PurchaseModal from "./PurchaseModal";

type Props = {
  listing: MarketplaceListing;
  onPurchaseSuccess?: () => void;
};

const API = "https://fyp-25-s4-20.duckdns.org/api/products";

const ListingCard: React.FC<Props> = ({ listing, onPurchaseSuccess }) => {
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [solAmount, setSolAmount] = useState(0);
  const [modalError, setModalError] = useState<string|null>(null);
  const [modalSuccess, setModalSuccess] = useState<string|null>(null);
  const wallet = useWallet();

  const priceText =
    listing.price && listing.currency ? `${listing.price} ${listing.currency}` : "—";

  const statusBadge =
    listing.productStatus === "verified" ? "Verified" : listing.productStatus;

  // Helper: Convert SGD to SOL (placeholder, replace with real API if needed)
  const convertSgdToSol = async (sgd: number): Promise<number> => {
    try {
      // Use a real price API in production
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=sgd");
      const data = await res.json();
      const solPrice = data.solana?.sgd || 0;
      if (!solPrice) return 0;
      return sgd / solPrice;
    } catch {
      return 0;
    }
  };

  const handleBuyNowClick = async () => {
    setModalError(null);
    setModalSuccess(null);
    if (!wallet.connected || !wallet.publicKey) {
      setModalError("Please connect your Phantom wallet to purchase.");
      setModalOpen(true);
      return;
    }
    if (!listing.seller.publicKey) {
      setModalError("Seller has not connected their wallet. Cannot proceed.");
      setModalOpen(true);
      return;
    }
    const priceNum = parseFloat(listing.price || "0");
    if (!priceNum) {
      setModalError("Invalid price");
      setModalOpen(true);
      return;
    }
    setPurchasing(true);
    const sol = await convertSgdToSol(priceNum);
    setSolAmount(sol);
    setPurchasing(false);
    setModalOpen(true);
  };

  const handleModalConfirm = async () => {
    setPurchasing(true);
    setModalError(null);
    setModalSuccess(null);
    try {
      if (!wallet.connected || !wallet.publicKey) throw new Error("Wallet not connected");
      if (!listing.seller.publicKey) throw new Error("Seller wallet missing");
      // 1. Send SOL from buyer to seller
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
      // Send transaction using wallet adapter
      // @ts-ignore
      const signature = await wallet.sendTransaction(tx, connection);
      // Optionally: Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      // 2. Call backend to transfer ownership
      const userId = localStorage.getItem("userId");
      if (!userId) throw new Error("User not logged in");
      const res = await axios.post(
        `${API}/listings/${listing.listingId}/purchase`,
        {
          buyerId: Number(userId),
          solTx: signature,
          buyerPublicKey: wallet.publicKey.toBase58(),
        }
      );
      if (res.data.success) {
        setModalSuccess(`Purchase successful! You now own ${listing.productName || 'this product'}`);
        setTimeout(() => {
          setModalOpen(false);
          setModalSuccess(null);
          if (onPurchaseSuccess) onPurchaseSuccess();
        }, 1800);
      } else {
        throw new Error(res.data.error || "Ownership transfer failed");
      }
    } catch (e: any) {
      setModalError(e?.response?.data?.error || e?.message || "Failed to complete payment");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827" }}>
            {listing.productName ?? "Unknown Product"}
          </h3>
        </div>

        <span
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            background:
              listing.blockchainStatus === "on blockchain" ? "#dcfce7" : "#fef3c7",
            color:
              listing.blockchainStatus === "on blockchain" ? "#166534" : "#92400e",
            height: "fit-content",
            whiteSpace: "nowrap",
          }}
        >
          {listing.blockchainStatus}
        </span>
      </div>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Price</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: 700, fontSize: 16, color: "#111827" }}>{priceText}</p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Seller</p>
          <p style={{ margin: "4px 0 0 0", fontSize: 14, fontWeight: 500, color: "#111827" }}>
            {listing.seller.username} ({listing.seller.role})
          </p>
        </div>
      </div>

      {listing.notes && (
        <div style={{ 
          marginTop: 16, 
          padding: 14, 
          background: "#f9fafb", 
          borderRadius: 10,
          borderLeft: "3px solid #3b82f6"
        }}>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Seller Notes</p>
          <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{listing.notes}</p>
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s",
            }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/consumer/product/${listing.productId}`);
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#545b62";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#6c757d";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
            title="View product journey timeline"
          >
            Timeline
          </button>

          <button
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s",
            }}
            onClick={async (e) => {
              e.stopPropagation();
              const userId = localStorage.getItem("userId");
              if (!userId) { alert("Please log in to chat"); return; }
              try {
                const res = await axios.post("https://fyp-25-s4-20.duckdns.org/api/chats/create-thread", {
                  listingId: listing.listingId,
                  userId: Number(userId),
                  otherUserId: listing.seller.userId,
                });
                if (res.data.success) {
                  navigate(`/consumer/chats/${res.data.thread.thread_id}`);
                } else {
                  alert(res.data.error || "Failed to open chat");
                }
              } catch (err: any) {
                alert(err?.response?.data?.error || "Failed to open chat");
              }
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#2563eb";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
            title="Chat with seller"
          >
            Message
          </button>

          <button
            style={{
              background: purchasing ? "#6c757d" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              cursor: purchasing ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              opacity: purchasing ? 0.6 : 1,
              transition: "all 0.2s",
            }}
            onClick={handleBuyNowClick}
            disabled={purchasing}
            onMouseEnter={(e) => {
              if (!purchasing) {
                (e.currentTarget as HTMLButtonElement).style.background = "#218838";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!purchasing) {
                (e.currentTarget as HTMLButtonElement).style.background = "#28a745";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }
            }}
          >
            {purchasing ? "Processing..." : "Buy Now"}
          </button>
              <PurchaseModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setModalError(null); setModalSuccess(null); }}
                productName={listing.productName || "Unknown Product"}
                price={priceText}
                sellerName={listing.seller.username}
                onConfirm={handleModalConfirm}
                loading={purchasing}
                solAmount={solAmount}
                error={modalError}
                success={modalSuccess}
              />
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
