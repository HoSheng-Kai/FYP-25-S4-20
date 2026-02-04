import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import ListingCard from "../../components/marketplace/ListingCard";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";
import "../../styles/marketplace.css";

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
      }>(`${API_ROOT}/products/marketplace/listings`, { withCredentials: true });

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
    void fetchMarketplace();
  };

  const visibleItems = useMemo(() => {
    if (authLoading) return items;
    if (!userId) return items;
    return items.filter((item) => Number(item.seller.userId) !== userId);
  }, [items, authLoading, userId]);

  const filteredItems = useMemo(() => {
    let result = visibleItems.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          (item.productName?.toLowerCase().includes(query) || false) ||
          item.serialNumber.toLowerCase().includes(query) ||
          item.seller.username.toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      if (minPrice || maxPrice) {
        const itemPrice = parseFloat(item.price || "0") || 0;
        if (minPrice && itemPrice < parseFloat(minPrice)) return false;
        if (maxPrice && itemPrice > parseFloat(maxPrice)) return false;
      }

      return true;
    });

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
    <div className="marketplace-page">
      <div className="marketplace-wallet">
        <WalletMultiButton />
      </div>

      <div className="marketplace-header">
        <div>
          <h1 className="marketplace-title">Consumer Marketplace</h1>
          <p className="marketplace-subtitle">
            Browse blockchain-registered products listed for sale.
          </p>
        </div>
      </div>

      <div className="marketplace-filters">
        <input
          type="text"
          placeholder="Search by product name, serial number, or seller..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="marketplace-input"
          style={{ flex: 1, minWidth: 220 }}
        />

        <input
          type="number"
          placeholder="Min Price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="marketplace-input"
          style={{ width: 120 }}
        />

        <input
          type="number"
          placeholder="Max Price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="marketplace-input"
          style={{ width: 120 }}
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="marketplace-select"
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
            className="btn btn-ghost"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && <p className="marketplace-subtitle">Loading…</p>}
      {err && <p style={{ color: "#b91c1c", marginTop: 16 }}>{err}</p>}

      {!loading && !err && filteredItems.length > 0 && (
        <p className="marketplace-subtitle" style={{ marginTop: 16 }}>
          Showing {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
        </p>
      )}

      <div className="marketplace-grid">
        {filteredItems.map((x) => (
          <ListingCard key={x.listingId} listing={x} onPurchaseSuccess={handlePurchaseSuccess} />
        ))}
      </div>

      {!loading && !err && visibleItems.length === 0 && (
        <p className="marketplace-subtitle" style={{ marginTop: 12 }}>
          No available listings right now.
        </p>
      )}

      {!loading && !err && visibleItems.length > 0 && filteredItems.length === 0 && (
        <p className="marketplace-subtitle" style={{ marginTop: 12 }}>
          No items match your filters. Try adjusting your search.
        </p>
      )}
    </div>
  );
};

export default MarketplacePage;
