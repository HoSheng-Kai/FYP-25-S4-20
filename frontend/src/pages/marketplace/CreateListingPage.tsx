import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://34.177.85.28:3000/api/products";

type OwnedProduct = {
  productId: number;
  serialNo: string;
  model: string | null;
  batchNo: string | null;
  category: string | null;
  status: string;
  registeredOn: string;
  listingStatus: string;
  canCreateListing: boolean;
};

export default function CreateListingPage() {
  const navigate = useNavigate();
  
  const userId = useMemo(() => {
    const raw = localStorage.getItem("userId");
    return raw ? Number(raw) : NaN;
  }, []);

  const [products, setProducts] = useState<OwnedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"SGD" | "USD" | "EUR">("SGD");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const loadOwnedProducts = async () => {
      if (!Number.isFinite(userId)) {
        setError("No userId found. Please login again.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await axios.get<{
          success: boolean;
          data?: OwnedProduct[];
          error?: string;
        }>(`${API}/owned`, { params: { userId } });

        if (!res.data.success || !res.data.data) {
          setError(res.data.error || "Failed to load your products");
          setProducts([]);
          return;
        }

        setProducts(res.data.data);
      } catch (err: any) {
        console.error(err);
        setError("Unable to load your products");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadOwnedProducts();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedProductId) {
      setSubmitError("Please select a product");
      return;
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setSubmitError("Price must be greater than 0");
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
        productId: selectedProductId,
        price: priceNum,
        currency,
        status: "available",
        notes: notes.trim() || null,
      });

      if (!res.data.success) {
        setSubmitError(res.data.error || res.data.details || "Failed to create listing");
        return;
      }

      // Success - navigate to my listings
      navigate("/consumer/my-listings");
    } catch (err: any) {
      console.error(err);
      setSubmitError(
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        "Unable to create listing"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const availableProducts = products.filter((p) => p.canCreateListing);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Create Listing</h1>
        <button
          onClick={() => navigate("/consumer/my-listings")}
          style={{
            background: "none",
            border: "1px solid #ccc",
            padding: "8px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ← Back to My Listings
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fee",
            color: "#c00",
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {loading && <p>Loading your products...</p>}

      {!loading && !error && (
        <>
          {availableProducts.length === 0 ? (
            <div
              style={{
                background: "#fff",
                padding: 30,
                borderRadius: 12,
                textAlign: "center",
                color: "#666",
              }}
            >
              <p style={{ margin: 0, fontSize: 16 }}>
                You don't have any products available to list.
              </p>
              <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
                Products that already have active listings cannot be listed again.
              </p>
            </div>
          ) : (
            <div style={{ background: "#fff", padding: 30, borderRadius: 12 }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    Select Product *
                  </label>
                  <select
                    value={selectedProductId || ""}
                    onChange={(e) => setSelectedProductId(Number(e.target.value))}
                    required
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: 15,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                    }}
                  >
                    <option value="">-- Choose a product --</option>
                    {availableProducts.map((prod) => (
                      <option key={prod.productId} value={prod.productId}>
                        {prod.model || prod.serialNo} ({prod.serialNo}) - {prod.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
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
                      padding: 12,
                      fontSize: 15,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    Currency *
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "SGD" | "USD" | "EUR")}
                    required
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: 15,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                    }}
                  >
                    <option value="SGD">SGD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Item is in good condition, slight scratches on back"
                    maxLength={500}
                    style={{
                      width: "100%",
                      padding: 12,
                      fontSize: 15,
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      fontFamily: "inherit",
                      resize: "vertical",
                      minHeight: 100,
                    }}
                  />
                  <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#999" }}>
                    {notes.length}/500 characters
                  </p>
                </div>

                {submitError && (
                  <div
                    style={{
                      background: "#fee",
                      color: "#c00",
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 20,
                      fontSize: 14,
                    }}
                  >
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: submitting ? "#ccc" : "#0066cc",
                    color: "white",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Creating..." : "Create Listing"}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
