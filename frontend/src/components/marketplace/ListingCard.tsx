import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MarketplaceListing } from "../../pages/marketplace/MarketplacePage";
import axios from "axios";

type Props = {
  listing: MarketplaceListing;
  onPurchaseSuccess?: () => void;
};

const API = "http://localhost:3000/api/products";

const ListingCard: React.FC<Props> = ({ listing, onPurchaseSuccess }) => {
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);

  const priceText =
    listing.price && listing.currency ? `${listing.price} ${listing.currency}` : "—";

  const statusBadge =
    listing.productStatus === "verified" ? "Verified" : listing.productStatus;

  const handlePurchase = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please log in to purchase");
      return;
    }

    const confirm = window.confirm(
      `Purchase "${listing.productName || 'this product'}" for ${priceText}?`
    );
    
    if (!confirm) return;

    setPurchasing(true);
    try {
      const res = await axios.post(
        `${API}/listings/${listing.listingId}/purchase`,
        { buyerId: Number(userId) }
      );

      if (res.data.success) {
        alert(`Purchase successful! You now own ${listing.productName || 'this product'}`);
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
      }
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Failed to complete purchase";
      alert(errorMsg);
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
        <span
          style={{
            fontSize: 11,
            padding: "6px 14px",
            borderRadius: 999,
            background: listing.isAuthentic ? "#dcfce7" : "#fee2e2",
            color: listing.isAuthentic ? "#166534" : "#991b1b",
            whiteSpace: "nowrap",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            alignSelf: "flex-start",
          }}
        >
          {statusBadge}
        </span>

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
                const res = await axios.post("http://localhost:3000/api/chats/create-thread", {
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
            onClick={handlePurchase}
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
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
