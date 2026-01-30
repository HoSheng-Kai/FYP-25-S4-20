import React, { useState } from "react";
import axios from "axios";
import type { OwnedProduct } from "../../pages/consumer/MyProductsPage";

const API = "https://fyp-25-s4-20.duckdns.org/api/products";

interface QuickListingModalProps {
  product: OwnedProduct;
  userId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickListingModal({
  product,
  userId,
  onClose,
  onSuccess,
}: QuickListingModalProps) {
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"SGD" | "USD" | "EUR">("SGD");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post<{
        success: boolean;
        data?: any;
        error?: string;
        details?: string;
      }>(`${API}/listings`, {
        userId,
        productId: product.productId,
        price: priceNum,
        currency,
        status: "available",
        notes: notes.trim() || null,
      });

      if (!res.data.success) {
        setError(res.data.error || res.data.details || "Failed to create listing");
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "Unable to create listing"
      );
    } finally {
      setSubmitting(false);
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
        background: "rgba(0,0,0,0.5)",
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
          borderRadius: 12,
          padding: 32,
          maxWidth: 500,
          width: "90%",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 24 }}>List for Sale</h2>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
            Create a listing for your product
          </p>
        </div>

        {/* Product Info (Read-only) */}
        <div
          style={{
            background: "#f5f7fa",
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            borderLeft: "4px solid #007bff",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#666" }}>
              Product Name
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {product.model || "Product"}
            </p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#666" }}>
              Serial Number
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontFamily: "monospace",
                color: "#888",
                wordBreak: "break-all",
              }}
            >
              {product.serialNo}
            </p>
          </div>

          {product.category && (
            <div>
              <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#666" }}>
                Category
              </p>
              <p style={{ margin: 0, fontSize: 14 }}>{product.category}</p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Price */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              Price *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="e.g. 150.00"
              style={{
                width: "100%",
                padding: 10,
                fontSize: 14,
                border: "1px solid #ddd",
                borderRadius: 6,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Currency */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              Currency *
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "SGD" | "USD" | "EUR")}
              required
              style={{
                width: "100%",
                padding: 10,
                fontSize: 14,
                border: "1px solid #ddd",
                borderRadius: 6,
                boxSizing: "border-box",
              }}
            >
              <option value="SGD">SGD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Item is in good condition, slight scratches on back"
              maxLength={500}
              style={{
                width: "100%",
                padding: 10,
                fontSize: 14,
                border: "1px solid #ddd",
                borderRadius: 6,
                fontFamily: "inherit",
                resize: "vertical",
                minHeight: 80,
                boxSizing: "border-box",
              }}
            />
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: 12,
                color: "#999",
              }}
            >
              {notes.length}/500 characters
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#fee",
                color: "#c00",
                padding: 12,
                borderRadius: 6,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: "#f0f0f0",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: "10px 16px",
                background: submitting ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Creating..." : "Create Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
