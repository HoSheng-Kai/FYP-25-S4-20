import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const API = "https://fyp-25-s4-20.duckdns.org/api/products";

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

  const userId = useMemo(() => {
    const raw = localStorage.getItem("userId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, []);

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
    if (!userId) {
      setErr("userId not found in localStorage. Please login again.");
      return;
    }

    const load = async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await axios.get<{ success: boolean; data?: any; error?: string; details?: string }>(
          `${API}/listings/${listingId}/edit`,
          { params: { userId } }
        );

        if (!res.data.success || !res.data.data) {
          setErr(res.data.error || res.data.details || "Failed to load listing.");
          return;
        }

        const d = res.data.data as EditListingPrefill;
        setData(d);

        setPrice(d.price ?? "");
        setCurrency(d.currency ?? "SGD");
        setStatus(d.status ?? "available");
      } catch (e) {
        setErr("Unable to load listing. Are you the seller of this listing?");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [listingId, userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingId) return;
    if (!userId) {
      setErr("userId missing. Please login again.");
      return;
    }

    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      const res = await axios.put<{ success: boolean; data?: any; error?: string; details?: string }>(
        `${API}/listings/${listingId}`,
        {
          userId,
          price: price === "" ? null : Number(price),
          currency,
          status,
        }
      );

      if (!res.data.success) {
        setErr(res.data.error || res.data.details || "Update failed.");
        return;
      }

      setOk("Listing updated successfully!");
      // go back after a short success message
      setTimeout(() => navigate("/my-listings"), 700);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.response?.data?.details || "Unable to update listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Edit Listing</h1>
      <p style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>
        Update the listing information for a product you own.
      </p>

      {loading && <p style={{ color: "#6b7280" }}>Loading…</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

      {data && (
        <form
          onSubmit={handleSave}
          style={{
            marginTop: 16,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
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
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#6b7280" }}>Currency</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="e.g. SGD"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#6b7280" }}>Availability</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              style={{
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                background: "white",
              }}
            >
              <option value="available">available</option>
              <option value="reserved">reserved</option>
              <option value="sold">sold</option>
            </select>
          </div>

          {ok && <p style={{ margin: 0, color: "#15803d", fontSize: 13 }}>{ok}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate("/my-listings")}
              style={{
                flex: 1,
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                background: "#111827",
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: 600,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
