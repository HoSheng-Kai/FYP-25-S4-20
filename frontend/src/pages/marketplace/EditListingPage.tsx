import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";
import "../../styles/marketplace.css";

type ListingStatus = "available" | "reserved" | "sold";

type EditListingPrefill = {
  listingId: number;
  productId: number;
  serialNumber: string;
  productName: string | null;
  price: string | null;
  currency: string | null;
  status: ListingStatus;
  createdOn: string;
};

export default function EditListingPage() {
  const navigate = useNavigate();
  const { listingId } = useParams();
  const { auth } = useAuth();

  const authLoading = auth.loading;
  const userId = auth.user?.userId;

  const [data, setData] = useState<EditListingPrefill | null>(null);
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<string>("SGD");
  const [status, setStatus] = useState<ListingStatus>("available");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) return;
    if (authLoading) return;

    if (!userId) {
      setErr("You are not logged in. Please login again.");
      setData(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await axios.get<{
          success: boolean;
          data?: EditListingPrefill;
          error?: string;
          details?: string;
        }>(`${API_ROOT}/products/listings/${listingId}/edit`, {
          params: { userId },
          withCredentials: true,
        });

        if (!res.data.success || !res.data.data) {
          setErr(res.data.error || res.data.details || "Failed to load listing.");
          setData(null);
          return;
        }

        const d = res.data.data;
        setData(d);

        setPrice(d.price ?? "");
        setCurrency(d.currency ?? "SGD");
        setStatus(d.status ?? "available");
      } catch (e: any) {
        console.error(e);
        setErr(
          e?.response?.data?.error ||
            e?.response?.data?.details ||
            "Unable to load listing. Are you the seller of this listing?"
        );
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [listingId, authLoading, userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingId) return;

    if (authLoading) return;

    if (!userId) {
      setErr("Session expired. Please login again.");
      return;
    }

    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      const res = await axios.put<{
        success: boolean;
        data?: any;
        error?: string;
        details?: string;
      }>(
        `${API_ROOT}/products/listings/${listingId}`,
        {
          userId,
          price: price === "" ? null : Number(price),
          currency,
          status,
        },
        { withCredentials: true }
      );

      if (!res.data.success) {
        setErr(res.data.error || res.data.details || "Update failed.");
        return;
      }

      setOk("Listing updated successfully!");
      setTimeout(() => navigate("/consumer/my-listings"), 700);
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.error || e?.response?.data?.details || "Unable to update listing.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="marketplace-page">
        <p className="marketplace-subtitle">Checking session…</p>
      </div>
    );
  }

  return (
    <div className="marketplace-page">
      <h1 className="marketplace-title">Edit Listing</h1>
      <p className="marketplace-subtitle">Update the listing information for a product you own.</p>

      {loading && <p className="marketplace-subtitle">Loading…</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

      {data && (
        <form onSubmit={handleSave} className="marketplace-panel" style={{ marginTop: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Product</p>
            <p style={{ margin: "4px 0 0 0", fontWeight: 700 }}>
              {data.productName ?? "Unknown Product"} — {data.serialNumber}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#6b7280" }}>Price</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 199.90"
                className="marketplace-input"
                style={{ width: "100%", marginTop: 6 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#6b7280" }}>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="marketplace-select"
                style={{ width: "100%", marginTop: 6 }}
              >
                <option value="SGD">SGD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280" }}>Availability</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ListingStatus)}
              className="marketplace-select"
              style={{ width: "100%", marginTop: 6 }}
            >
              <option value="available">available</option>
              <option value="reserved">reserved</option>
              <option value="sold">sold</option>
            </select>
          </div>

          {ok && <p style={{ margin: 0, color: "#15803d", fontSize: 13 }}>{ok}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={() => navigate("/consumer/my-listings")} className="btn btn-ghost">
              Cancel
            </button>

            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
