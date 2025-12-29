import React, { useEffect, useState } from "react";
import axios from "axios";
import ListingCard from "../../components/marketplace/ListingCard";

const API = "http://localhost:3000/api/products";

/**
 * This matches EXACTLY what your backend returns in ProductController.getMarketplaceListings()
 */
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

  seller: {
    userId: number;
    username: string;
    role: string;
  };

  blockchainStatus: "on blockchain" | "pending";
  isAuthentic: boolean;
};

const MarketplacePage: React.FC = () => {
  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await axios.get<{
          success: boolean;
          data?: MarketplaceListing[];
          error?: string;
        }>(`${API}/marketplace/listings`);

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
    };

    void load();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Consumer Marketplace</h1>
      <p style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>
        Browse blockchain-registered products listed for sale.
      </p>

      {loading && <p style={{ color: "#6b7280" }}>Loading…</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {items.map((x) => (
          <ListingCard key={x.listingId} listing={x} />
        ))}
      </div>

      {!loading && !err && items.length === 0 && (
        <p style={{ marginTop: 12, color: "#6b7280" }}>
          No available listings right now.
        </p>
      )}
    </div>
  );
};

export default MarketplacePage;
