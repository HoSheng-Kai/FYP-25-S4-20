import React from "react";
import type { MarketplaceListing } from "../../pages/marketplace/MarketplacePage";

type Props = {
  listing: MarketplaceListing;
};

const ListingCard: React.FC<Props> = ({ listing }) => {
  const priceText =
    listing.price && listing.currency ? `${listing.price} ${listing.currency}` : "—";

  const statusBadge =
    listing.productStatus === "verified" ? "Verified" : listing.productStatus;

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
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "9px 12px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
          onClick={() => alert("Hook up view details / buy flow later")}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default ListingCard;
