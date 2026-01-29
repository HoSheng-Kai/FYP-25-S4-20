// frontend/src/components/marketplace/MyListingCard.tsx

import React, { useMemo } from "react";
import type { MyListing, ListingStatus } from "../../pages/marketplace/MyListingsPage";

type Props = {
  listing: MyListing;
  isBusy: boolean;
  onDelete: (listingId: number) => void;

  // US-019
  onUpdateAvailability: (listingId: number, nextStatus: ListingStatus) => void;
  
  // Edit listing
  onEdit: (listingId: number) => void;
};

export default function MyListingCard({
  listing,
  isBusy,
  onDelete,
  onUpdateAvailability,
  onEdit,
}: Props) {
  const priceText = useMemo(() => {
    return listing.price && listing.currency
      ? `${listing.price} ${listing.currency}`
      : "—";
  }, [listing.price, listing.currency]);

  const statusPill = useMemo(() => {
    const map: Record<ListingStatus, { bg: string; text: string }> = {
      available: { bg: "#dcfce7", text: "#166534" },
      reserved: { bg: "#fef3c7", text: "#92400e" },
      sold: { bg: "#e5e7eb", text: "#374151" },
    };
    return map[listing.status];
  }, [listing.status]);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        opacity: isBusy ? 0.75 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15 }}>
            {listing.model ?? "Unknown Product"}
          </h3>
          <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#6b7280" }}>
            Serial: <strong>{listing.serial_no}</strong>
          </p>
        </div>

        <span
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            background: statusPill.bg,
            color: statusPill.text,
            height: "fit-content",
            whiteSpace: "nowrap",
            fontWeight: 700,
          }}
        >
          {listing.status}
        </span>
      </div>

      <div style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Price</p>
        <p style={{ margin: "2px 0 0 0", fontWeight: 700 }}>{priceText}</p>

        <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#6b7280" }}>
          Listed on: {new Date(listing.created_on).toLocaleString()}
        </p>
      </div>

      {/* US-019: Update Availability */}
      <div style={{ marginTop: 14 }}>
        <p style={{ margin: "0 0 6px 0", fontSize: 12, color: "#6b7280" }}>
          Availability
        </p>

        <select
          value={listing.status}
          disabled={isBusy}
          onChange={(e) =>
            onUpdateAvailability(
              listing.listing_id,
              e.target.value as ListingStatus
            )
          }
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 13,
            background: isBusy ? "#f3f4f6" : "white",
            cursor: isBusy ? "not-allowed" : "pointer",
          }}
        >
          <option value="available">available</option>
          <option value="reserved">reserved</option>
          <option value="sold">sold</option>
        </select>

        {isBusy && (
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#6b7280" }}>
            Saving…
          </p>
        )}
      </div>

      {/* Edit and Delete Actions */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
        }}
      >
        <button
          disabled={isBusy}
          onClick={() => onEdit(listing.listing_id)}
          style={{
            background: isBusy ? "#93c5fd" : "#0066cc",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "9px 12px",
            cursor: isBusy ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Edit
        </button>
        <button
          disabled={isBusy}
          onClick={() => onDelete(listing.listing_id)}
          style={{
            background: isBusy ? "#fca5a5" : "#ef4444",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "9px 12px",
            cursor: isBusy ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
