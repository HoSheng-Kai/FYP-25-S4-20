import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import ListingCard from "../../components/marketplace/ListingCard";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

const API = `${API_ROOT}/api/products`;

export type MarketplaceListing = {
  listingId: number;
  productId: number;
  serialNumber: string;
  productName: string | null;
  productStatus: string;
  registeredOn: string;

  price: string | null;
  currency: string | null;
  listingStatus: string;
  listingCreatedOn: string;
  notes: string | null;

  seller: {
    userId: number;
    username: string;
    role: string;
    publicKey: string | null;
  };

  blockchainStatus: "on blockchain" | "pending";
  isAuthentic: boolean;
};

const MarketplacePage: React.FC = () => {
  const { auth } = useAuth();
  const authLoading = auth.loading;
  const userId = auth.user?.userId;

  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("latest");

  const fetchMarketplace = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const res = await axios.get<{
        success: boolean;
        data?: MarketplaceListing[];
        error?: string;
      }>(`${API}/marketplace/listings`, { withCredentials: true });

      if (!res.data.success || !res.data.data) {
        setErr(res.data.error || "Failed to load marketplace listings.");
        setItems([]);
        return;
      }

      setItems(res.data.data);
    } catch (e) {
      console.error(e);
      setErr("Unable to load marketplace listings.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMarketplace();
  }, [fetchMarketplace]);

  const handlePurchaseSuccess = () => {
    // Reload the marketplace to remove purchased items
    void fetchMarketplace();
  };

  // Filter out user's own listings AFTER auth resolves
  const visibleItems = useMemo(() => {
    if (authLoading) return items; // while checking session, just show all
    if (!userId) return items; // not logged in, no filtering needed

    return items.filter((item) => Number(item.seller.userId) !== userId);
  }, [items, authLoading, userId]);

  const filteredItems = useMemo(() => {
    let result = visibleItems.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          (item.productName?.toLowerCase().includes(query) || false) ||
          item.serialNumber.toLowerCase().includes(query) ||
          item.seller.username.toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      // Price filter
      if (minPrice || maxPrice) {
        const itemPrice = parseFloat(item.price || "0") || 0;
        if (minPrice && itemPrice < parseFloat(minPrice)) return false;
        if (maxPrice && itemPrice > parseFloat(maxPrice)) return false;
      }

      return true;
    });

    // Sorting
    result = result.sort((a, b) => {
      switch (sortBy) {
        case "latest":
          return new Date(b.listingCreatedOn).getTime() - new Date(a.listingCreatedOn).getTime();
        case "oldest":
          return new Date(a.listingCreatedOn).getTime() - new Date(b.listingCreatedOn).getTime();
        case "price-high":
          return (parseFloat(b.price || "0") || 0) - (parseFloat(a.price || "0") || 0);
        case "price-low":
          return (parseFloat(a.price || "0") || 0) - (parseFloat(b.price || "0") || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [visibleItems, searchQuery, minPrice, maxPrice, sortBy]);

  return (
    <div style={{ padding: 24, maxWidth: "100%", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "fixed", top: 18, right: 32, zIndex: 2000 }}>
        <WalletMultiButton />
      </div>

      <h1 style={{ margin: 0, fontSize: 24 }}>Consumer Marketplace</h1>
      <p style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>
        Browse blockchain-registered products listed for sale.
      </p>

      {/* Search and Filter Section */}
      <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by product name, serial number, or seller..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: "10px 12px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontFamily: "inherit",
          }}
        />

        <input
          type="number"
          placeholder="Min Price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          style={{
            padding: "10px 12px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontFamily: "inherit",
            width: 120,
          }}
        />

        <input
          type="number"
          placeholder="Max Price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          style={{
            padding: "10px 12px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontFamily: "inherit",
            width: 120,
          }}
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: "10px 12px",
            fontSize: 13,
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          <option value="latest">Latest Posted</option>
          <option value="oldest">Oldest Posted</option>
          <option value="price-high">Price: High to Low</option>
          <option value="price-low">Price: Low to High</option>
        </select>

        {(searchQuery || minPrice || maxPrice) && (
          <button
            onClick={() => {
              setSearchQuery("");
              setMinPrice("");
              setMaxPrice("");
            }}
            style={{
              padding: "10px 14px",
              fontSize: 13,
              background: "#e5e7eb",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && <p style={{ color: "#6b7280", marginTop: 16 }}>Loading…</p>}
      {err && <p style={{ color: "#b91c1c", marginTop: 16 }}>{err}</p>}

      {!loading && !err && filteredItems.length > 0 && (
        <p style={{ marginTop: 16, color: "#6b7280", fontSize: 13 }}>
          Showing {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
        </p>
      )}

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 20,
        }}
      >
        {filteredItems.map((x) => (
          <ListingCard key={x.listingId} listing={x} onPurchaseSuccess={handlePurchaseSuccess} />
        ))}
      </div>

      {!loading && !err && visibleItems.length === 0 && (
        <p style={{ marginTop: 12, color: "#6b7280" }}>No available listings right now.</p>
      )}

      {!loading && !err && visibleItems.length > 0 && filteredItems.length === 0 && (
        <p style={{ marginTop: 12, color: "#6b7280" }}>
          No items match your filters. Try adjusting your search.
        </p>
      )}
    </div>
  );
};

export default MarketplacePage;
