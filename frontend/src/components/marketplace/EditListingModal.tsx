import { useState } from "react";
import type { MyListing } from "../../pages/marketplace/MyListingsPage";

type Props = {
  listing: MyListing;
  isOpen: boolean;
  onClose: () => void;
  onSave: (listingId: number, price: string, currency: string, notes: string) => Promise<void>;
};

export default function EditListingModal({ listing, isOpen, onClose, onSave }: Props) {
  const [price, setPrice] = useState(listing.price || "");
  const [currency, setCurrency] = useState(listing.currency || "USD");
  const [notes, setNotes] = useState(listing.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Validate price
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid price greater than 0");
      return;
    }

    if (!currency.trim()) {
      setError("Please select a currency");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(listing.listing_id, price, currency, notes);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update listing");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          maxWidth: 500,
          width: "100%",
          margin: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: 0, fontSize: 20, marginBottom: 8 }}>Edit Listing</h2>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          Update the price and currency for this listing. Changes will be reflected in the marketplace.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: "#374151",
            }}
          >
            Product
          </label>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            {listing.model || "Unknown Product"} (SN: {listing.serial_no})
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="edit-price"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: "#374151",
            }}
          >
            Price *
          </label>
          <input
            id="edit-price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={isSaving}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 14,
              boxSizing: "border-box",
            }}
            placeholder="Enter price"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="edit-currency"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: "#374151",
            }}
          >
            Currency *
          </label>
          <select
            id="edit-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={isSaving}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
            <option value="SGD">SGD</option>
            <option value="MYR">MYR</option>
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="edit-notes"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: "#374151",
            }}
          >
            Notes / Description
          </label>
          <textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSaving}
            rows={4}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 14,
              boxSizing: "border-box",
              fontFamily: "inherit",
              resize: "vertical",
            }}
            placeholder="Add any additional details about this listing..."
          />
          <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#6b7280" }}>
            Optional notes visible to buyers in the marketplace
          </p>
        </div>

        {error && (
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#b91c1c" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              cursor: isSaving ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              color: "#374151",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: isSaving ? "#93c5fd" : "#0066cc",
              color: "white",
              cursor: isSaving ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
