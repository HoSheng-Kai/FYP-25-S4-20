import { useMemo } from "react";
import type { MyListing, ListingStatus } from "../../pages/marketplace/MyListingsPage";
import "../../styles/marketplace.css";

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

  const statusClass =
    listing.status === "available"
      ? "pill pill-success"
      : listing.status === "reserved"
      ? "pill pill-warning"
      : "pill pill-neutral";

  return (
    <div className="marketplace-card" style={{ opacity: isBusy ? 0.75 : 1 }}>
      <div className="marketplace-card-header">
        <div>
          <h3 className="marketplace-card-title">
            {listing.model ?? "Unknown Product"}
          </h3>
          <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#6b7280" }}>
            Serial: <strong>{listing.serial_no}</strong>
          </p>
        </div>

        <span className={statusClass}>{listing.status}</span>
      </div>

      <div style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Price</p>
        <p style={{ margin: "2px 0 0 0", fontWeight: 700 }}>{priceText}</p>

        <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#6b7280" }}>
          Listed on: {new Date(listing.created_on).toLocaleString()}
        </p>
      </div>

      <div style={{ marginTop: 14 }}>
        <p style={{ margin: "0 0 6px 0", fontSize: 12, color: "#6b7280" }}>Availability</p>

        <select
          value={listing.status}
          disabled={isBusy}
          onChange={(e) => onUpdateAvailability(listing.listing_id, e.target.value as ListingStatus)}
          className="marketplace-select"
          style={{ width: "100%" }}
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

      <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          disabled={isBusy}
          onClick={() => onEdit(listing.listing_id)}
          className="btn btn-primary"
        >
          Edit
        </button>
        <button
          disabled={isBusy}
          onClick={() => onDelete(listing.listing_id)}
          className="btn btn-danger"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
