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
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15 }}>
            {listing.productName ?? "Unknown Product"}
          </h3>
          <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#6b7280" }}>
            Serial: <strong>{listing.serialNumber}</strong>
          </p>
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

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Price</p>
          <p style={{ margin: "2px 0 0 0", fontWeight: 700 }}>{priceText}</p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Seller</p>
          <p style={{ margin: "2px 0 0 0", fontSize: 13 }}>
            {listing.seller.username} ({listing.seller.role})
          </p>
        </div>
      </div>

      {listing.notes && (
        <div style={{ 
          marginTop: 12, 
          padding: 12, 
          background: "#f9fafb", 
          borderRadius: 8,
          borderLeft: "3px solid #3b82f6"
        }}>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>Seller Notes:</p>
          <p style={{ margin: 0, fontSize: 12, color: "#374151" }}>{listing.notes}</p>
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            background: listing.isAuthentic ? "#dcfce7" : "#fee2e2",
            color: listing.isAuthentic ? "#166534" : "#991b1b",
            whiteSpace: "nowrap",
          }}
        >
          {statusBadge}
        </span>

        <button
          style={{
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "9px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            marginRight: 8,
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/consumer/product/${listing.productId}`);
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#545b62";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#6c757d";
          }}
          title="View product journey timeline"
        >
          🕒 Timeline
        </button>

        <button
          style={{
            background: purchasing ? "#6c757d" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "9px 16px",
            cursor: purchasing ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            opacity: purchasing ? 0.6 : 1,
          }}
          onClick={handlePurchase}
          disabled={purchasing}
          onMouseEnter={(e) => {
            if (!purchasing) {
              (e.currentTarget as HTMLButtonElement).style.background = "#218838";
            }
          }}
          onMouseLeave={(e) => {
            if (!purchasing) {
              (e.currentTarget as HTMLButtonElement).style.background = "#28a745";
            }
          }}
        >
          {purchasing ? "Processing..." : "🛒 Buy Now"}
        </button>
      </div>
    </div>
  );
};

export default ListingCard;
