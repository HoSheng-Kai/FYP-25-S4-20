import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";
import "../../styles/marketplace.css";

type OwnedProduct = {
  productId: number;
  serialNo: string;
  model: string | null;
  batchNo: string | null;
  category: string | null;
  status?: string | null;
  registeredOn: string;
  listingStatus: string;
  canCreateListing: boolean;
};

export default function CreateListingPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();

  const authLoading = auth.loading;
  const user = auth.user;
  const userId = user?.userId;

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
      // wait for /users/me to finish
      if (authLoading) return;

      // not logged in
      if (!userId) {
        setError("You are not logged in. Please login again.");
        setProducts([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await axios.get<{
          success: boolean;
          data?: OwnedProduct[];
          error?: string;
        }>(`${API_ROOT}/products/owned`, {
          params: { userId },
          withCredentials: true,
        });

        if (!res.data.success || !res.data.data) {
          setError(res.data.error || "Failed to load your products");
          setProducts([]);
          return;
        }

        setProducts(res.data.data);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.details ||
            "Unable to load your products"
        );
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadOwnedProducts();
  }, [authLoading, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // defensive: user might become null if session expires
    if (!userId) {
      setSubmitError("Session expired. Please login again.");
      return;
    }

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
      }>(
        `${API_ROOT}/products/listings`,
        {
          userId,
          productId: selectedProductId,
          price: priceNum,
          currency,
          status: "available",
          notes: notes.trim() || null,
        },
        { withCredentials: true }
      );

      if (!res.data.success) {
        setSubmitError(res.data.error || res.data.details || "Failed to create listing");
        return;
      }

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

  const availableProducts = useMemo(
    () => products.filter((p) => p.canCreateListing),
    [products]
  );

  // optional: show a stable loading state during auth check
  if (authLoading) return <p>Checking session...</p>;

  return (
    <div className="marketplace-page">
      <div className="marketplace-header" style={{ marginBottom: 24 }}>
        <h1 className="marketplace-title">Create Listing</h1>
        <button
          onClick={() => navigate("/consumer/my-listings")}
          className="btn btn-ghost"
        >
          ← Back to My Listings
        </button>
      </div>

      {error && (
        <div className="marketplace-alert error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && <p className="marketplace-subtitle">Loading your products...</p>}

      {!loading && !error && (
        <>
          {availableProducts.length === 0 ? (
            <div className="marketplace-empty">
              <p style={{ margin: 0, fontSize: 16 }}>You don't have any products available to list.</p>
              <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
                Products that already have active listings cannot be listed again.
              </p>
            </div>
          ) : (
            <div className="marketplace-panel">
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Select Product *</label>
                  <select
                    value={selectedProductId || ""}
                    onChange={(e) => setSelectedProductId(Number(e.target.value))}
                    required
                    className="marketplace-select"
                    style={{ width: "100%" }}
                  >
                    <option value="">-- Choose a product --</option>
                    {availableProducts.map((prod) => {
                      const statusLabel = prod.status || prod.listingStatus || "unlisted";
                      return (
                        <option key={prod.productId} value={prod.productId}>
                          {prod.model || prod.serialNo} ({prod.serialNo}) - {statusLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    placeholder="e.g. 150.00"
                    className="marketplace-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Currency *</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "SGD" | "USD" | "EUR")}
                    required
                    className="marketplace-select"
                    style={{ width: "100%" }}
                  >
                    <option value="SGD">SGD</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Item is in good condition, slight scratches on back"
                    maxLength={500}
                    className="marketplace-textarea"
                    style={{ width: "100%", minHeight: 100, resize: "vertical" }}
                  />
                  <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#999" }}>{notes.length}/500 characters</p>
                </div>

                {submitError && (
                  <div className="marketplace-alert error" style={{ marginBottom: 20 }}>
                    {submitError}
                  </div>
                )}

                <button type="submit" disabled={submitting} className="btn btn-primary">
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
