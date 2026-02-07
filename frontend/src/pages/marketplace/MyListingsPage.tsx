import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MyListingCard from "../../components/marketplace/MyListingCard";
import EditListingModal from "../../components/marketplace/EditListingModal";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";
import "../../styles/marketplace.css";

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
  const { auth } = useAuth();

  const authLoading = auth.loading;
  const userId = auth.user?.userId;

  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editingListing, setEditingListing] = useState<MyListing | null>(null);
  const [busyListingIds, setBusyListingIds] = useState<Record<number, boolean>>({});

  const setBusy = (listingId: number, v: boolean) => {
    setBusyListingIds((prev) => ({ ...prev, [listingId]: v }));
  };

  const loadListings = useCallback(async () => {
    if (authLoading) return;

    setLoading(true);
    setErr(null);

    if (!userId) {
      setLoading(false);
      setErr("You are not logged in. Please login again.");
      setItems([]);
      return;
    }

    try {
      const res = await axios.get<{
        success: boolean;
        data?: MyListing[];
        error?: string;
      }>(`${API_ROOT}/products/my-listings`, {
        params: { userId },
        withCredentials: true,
      });

      if (!res.data.success || !res.data.data) {
        setItems([]);
        return;
      }

      setItems(res.data.data);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setItems([]);
      } else {
        setErr(
          e?.response?.data?.error ||
            e?.response?.data?.details ||
            "Unable to load your listings (endpoint may not exist yet)."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, userId]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const handleDeleteListing = async (listingId: number) => {
    if (!userId) {
      alert("Session expired. Please login again.");
      return;
    }

    const ok = confirm("Delete this listing? Buyers will no longer see it in the marketplace.");
    if (!ok) return;

    try {
      setBusy(listingId, true);

      await axios.delete(`${API_ROOT}/products/listings/${listingId}`, {
        params: { userId },
        withCredentials: true,
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

  const handleUpdateAvailability = async (listingId: number, nextStatus: MyListing["status"]) => {
    if (!userId) {
      alert("Session expired. Please login again.");
      return;
    }

    const prevItems = items;
    setItems((prev) =>
      prev.map((x) => (x.listing_id === listingId ? { ...x, status: nextStatus } : x))
    );

    try {
      setBusy(listingId, true);

      await axios.patch(
        `${API_ROOT}/products/listings/${listingId}/availability`,
        { userId, status: nextStatus },
        { withCredentials: true }
      );
    } catch (e: any) {
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

  const handleEditListing = (listingId: number) => {
    const listing = items.find((x) => x.listing_id === listingId);
    if (listing) setEditingListing(listing);
  };

  const handleSaveEdit = async (listingId: number, price: string, currency: string, notes: string) => {
    if (!userId) throw new Error("Session expired. Please login again.");

    const res = await axios.put(
      `${API_ROOT}/products/listings/${listingId}`,
      {
        userId,
        price: price === "" ? null : parseFloat(price),
        currency,
        notes,
      },
      { withCredentials: true }
    );

    if (res.data?.success) {
      setItems((prev) =>
        prev.map((x) => (x.listing_id === listingId ? { ...x, price, currency, notes } : x))
      );
      alert("Listing updated successfully. Changes are now visible in the marketplace.");
    } else {
      throw new Error(res.data?.error || res.data?.details || "Update failed.");
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
      <div className="marketplace-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="marketplace-title">My Listings</h1>
          <p className="marketplace-subtitle">Manage listings that you created.</p>
        </div>

        <button
          onClick={() => navigate("/consumer/create-listing")}
          className="btn btn-primary"
        >
          + Create Listing
        </button>
      </div>

      {loading && <p className="marketplace-subtitle">Loading…</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

      {!loading && !err && items.length === 0 && (
        <div className="marketplace-empty" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>No listings yet</h3>
          <p style={{ margin: 0, fontSize: 13 }}>
            You currently have no active listings to manage. Once you list a product, it will appear
            here with controls to update availability or delete the listing.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="marketplace-grid" style={{ marginTop: 16 }}>
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
