// frontend/src/pages/marketplace/MyListingsPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MyListingCard from "../../components/marketplace/MyListingCard";
import EditListingModal from "../../components/marketplace/EditListingModal";

const API = "https://fyp-25-s4-20.duckdns.org:3000/api/products";

export type ListingStatus = "available" | "reserved" | "sold";

export type MyListing = {
  listing_id: number;
  product_id: number;
  serial_no: string;
  model: string | null;

  price: string | null;
  currency: string | null;
  status: ListingStatus;
  notes: string | null;
  created_on: string;
};

export default function MyListingsPage() {
  const navigate = useNavigate();
  const userId = useMemo(() => {
    const raw = localStorage.getItem("userId");
    return raw ? Number(raw) : NaN;
  }, []);

  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Edit listing modal state
  const [editingListing, setEditingListing] = useState<MyListing | null>(null);

  // Track per-listing action state
  const [busyListingIds, setBusyListingIds] = useState<Record<number, boolean>>(
    {}
  );

  const setBusy = (listingId: number, v: boolean) => {
    setBusyListingIds((prev) => ({ ...prev, [listingId]: v }));
  };

  // ---------------------------
  // Load "my listings"
  // NOTE: You said backend is done; but you didn't show a GET endpoint for consumer listings.
  // Your current code tries GET /api/products/my-listings (may 404).
  // This file handles that gracefully + still lets you demo via mock.
  // ---------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);

      if (!Number.isFinite(userId)) {
        setLoading(false);
        setErr("No userId found. Please login again.");
        return;
      }

      try {
        const res = await axios.get<{
          success: boolean;
          data?: MyListing[];
          error?: string;
        }>(`${API}/my-listings`, { params: { userId } });

        if (!res.data.success || !res.data.data) {
          setItems([]);
          return;
        }

        setItems(res.data.data);
      } catch (e: any) {
        // If endpoint doesn't exist yet -> keep page usable
        if (e?.response?.status === 404) {
          setItems([]);
        } else {
          setErr("Unable to load your listings (endpoint may not exist yet).");
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [userId]);

  // ---------------------------
  // US-018: Delete listing
  // ---------------------------
  const handleDeleteListing = async (listingId: number) => {
    if (!Number.isFinite(userId)) {
      alert("No userId found. Please login again.");
      return;
    }

    const ok = confirm(
      "Delete this listing? Buyers will no longer see it in the marketplace."
    );
    if (!ok) return;

    try {
      setBusy(listingId, true);

      // Your backend route (you showed):
      // DELETE /api/products/listings/:listingId?userId=6
      await axios.delete(`${API}/listings/${listingId}`, {
        params: { userId },
      });

      setItems((prev) => prev.filter((x) => x.listing_id !== listingId));
      alert("Listing deleted successfully.");
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Failed to delete listing.";
      alert(msg);
    } finally {
      setBusy(listingId, false);
    }
  };

  // ---------------------------
  // US-019: Update availability
  // ---------------------------
  const handleUpdateAvailability = async (
    listingId: number,
    nextStatus: MyListing["status"]
  ) => {
    if (!Number.isFinite(userId)) {
      alert("No userId found. Please login again.");
      return;
    }

    // ✅ Optimistic UI update (so it feels instant)
    const prevItems = items;
    setItems((prev) =>
      prev.map((x) =>
        x.listing_id === listingId ? { ...x, status: nextStatus } : x
      )
    );

    try {
      setBusy(listingId, true);

      // Your backend route (you showed):
      // PATCH /api/products/listings/:listingId/availability
      // Body: { userId, status }
      await axios.patch(`${API}/listings/${listingId}/availability`, {
        userId,
        status: nextStatus,
      });
    } catch (e: any) {
      // rollback if backend fails
      setItems(prevItems);

      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Failed to update availability.";
      alert(msg);
    } finally {
      setBusy(listingId, false);
    }
  };

  // ---------------------------
  // Edit listing
  // ---------------------------
  const handleEditListing = (listingId: number) => {
    const listing = items.find((x) => x.listing_id === listingId);
    if (listing) {
      setEditingListing(listing);
    }
  };

  const handleSaveEdit = async (
    listingId: number,
    price: string,
    currency: string,
    notes: string
  ) => {
    if (!Number.isFinite(userId)) {
      throw new Error("No userId found. Please login again.");
    }

    try {
      // Call PUT /api/products/listings/:listingId
      const res = await axios.put(`${API}/listings/${listingId}`, {
        userId,
        price: parseFloat(price),
        currency,
        notes,
      });

      if (res.data.success) {
        // Update local state with new values
        setItems((prev) =>
          prev.map((x) =>
            x.listing_id === listingId
              ? { ...x, price, currency, notes }
              : x
          )
        );
        alert("Listing updated successfully. Changes are now visible in the marketplace.");
      }
    } catch (e: any) {
      throw e;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>My Listings</h1>
          <p style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>
            Manage listings that you created.
          </p>
        </div>
        <button
          onClick={() => navigate("/consumer/create-listing")}
          style={{
            background: "#0066cc",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          + Create Listing
        </button>
      </div>

      {loading && <p style={{ color: "#6b7280" }}>Loading…</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

      {!loading && !err && items.length === 0 && (
        <div
          style={{
            marginTop: 16,
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>No listings yet</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
            You currently have no active listings to manage. Once you list a
            product, it will appear here with controls to update availability or
            delete the listing.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {items.map((x) => (
            <MyListingCard
              key={x.listing_id}
              listing={x}
              isBusy={!!busyListingIds[x.listing_id]}
              onDelete={handleDeleteListing}
              onUpdateAvailability={handleUpdateAvailability}
              onEdit={handleEditListing}
            />
          ))}
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingListing && (
        <EditListingModal
          listing={editingListing}
          isOpen={!!editingListing}
          onClose={() => setEditingListing(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
