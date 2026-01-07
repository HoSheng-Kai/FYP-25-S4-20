// frontend/src/pages/consumer/MyProductsPage.tsx

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MyProductCard from "../../components/products/MyProductCard";

const API = "http://localhost:3000/api/products";

export type OwnedProduct = {
  productId: number;
  serialNo: string;
  model: string | null;
  batchNo: string | null;
  category: string | null;
  status: string;
  registeredOn: string;
  listingStatus: "none" | "available" | "reserved" | "sold";
  canCreateListing: boolean;
};

export default function MyProductsPage() {
  const userId = useMemo(() => {
    const raw = localStorage.getItem("userId");
    return raw ? Number(raw) : NaN;
  }, []);

  const [products, setProducts] = useState<OwnedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load owned products
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      if (!Number.isFinite(userId)) {
        setError("No userId found. Please login again.");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get<{
          success: boolean;
          data?: OwnedProduct[];
          error?: string;
        }>(`${API}/owned`, { params: { userId } });

        if (res.data.success && res.data.data) {
          setProducts(res.data.data);
        } else {
          setError(res.data.error || "Failed to load products");
        }
      } catch (e: any) {
        const msg =
          e?.response?.data?.error ||
          e?.message ||
          "Failed to load your products";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, [userId]);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>My Products</h1>
        <p style={{ color: "#666", margin: 0 }}>
          All products you own. Click on any product to see details or create a listing.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #f88",
            color: "#c00",
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
          Loading your products...
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            background: "#f9f9f9",
            borderRadius: 8,
            border: "1px dashed #ddd",
          }}
        >
          <p style={{ fontSize: 18, color: "#666", marginBottom: 12 }}>
            You don't own any products yet.
          </p>
          <p style={{ color: "#999" }}>
            Scan a QR code or receive a product transfer to add items to your collection.
          </p>
        </div>
      )}

      {/* Products Grid */}
      {!loading && products.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {products.map((product) => (
            <MyProductCard key={product.productId} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
