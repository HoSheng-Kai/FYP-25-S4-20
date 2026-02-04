import { useState } from "react";
import type { MyListing } from "../../pages/marketplace/MyListingsPage";
import "../../styles/marketplace.css";

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
    <div className="marketplace-modal-backdrop" onClick={onClose}>
      <div className="marketplace-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="marketplace-modal-title">Edit Listing</h2>
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
            className="marketplace-input"
            style={{ width: "100%", boxSizing: "border-box" }}
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
            className="marketplace-select"
            style={{ width: "100%", boxSizing: "border-box" }}
          >
            <option value="SGD">SGD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
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
            className="marketplace-textarea"
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
            placeholder="Add any additional details about this listing..."
          />
          <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#6b7280" }}>
            Optional notes visible to buyers in the marketplace
          </p>
        </div>

        {error && (
          <div className="marketplace-alert error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="marketplace-modal-actions">
          <button onClick={onClose} disabled={isSaving} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
