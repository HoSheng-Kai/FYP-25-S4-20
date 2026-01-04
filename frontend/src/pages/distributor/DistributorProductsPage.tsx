import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type ProductRow = {
  productId: number;
  serialNumber: string;
  productName: string | null;
  category?: string | null;
  productStatus: string;
  lifecycleStatus: "active" | "transferred";
  blockchainStatus: string;
  registeredOn: string;
};

type TransferResult = {
  productId: number;
  ok: boolean;
  message: string;
};

export default function DistributorProductsPage() {
  const navigate = useNavigate();
  const distributorId = Number(localStorage.getItem("userId"));

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Transfer modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [recipientUserId, setRecipientUserId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferResults, setTransferResults] = useState<TransferResult[] | null>(null);

  const PRODUCTS_URL = `http://localhost:3000/api/products/distributor/${distributorId}/owned`;
  const TRANSFER_URL = "http://localhost:3000/api/distributors/update-ownership";

  // ----------------------
  // Helpers
  // ----------------------
  const isOnChainConfirmed = (p: ProductRow) => {
    const s = (p.blockchainStatus || "").toLowerCase();
    return s.includes("confirmed") || s.includes("on-chain") || s.includes("on blockchain");
  };

  const isTransferEligible = (p: ProductRow) =>
    isOnChainConfirmed(p) && p.lifecycleStatus !== "transferred";

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.productId)),
    [products, selectedIds]
  );

  const selectedEligibleProducts = useMemo(
    () => selectedProducts.filter(isTransferEligible),
    [selectedProducts]
  );

  const anyEligibleSelected = selectedEligibleProducts.length > 0;

  const toggleSelected = (productId: number) => {
    const row = products.find((p) => p.productId === productId);
    if (row && !isTransferEligible(row)) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  // ----------------------
  // Load products
  // ----------------------
  const loadProducts = async () => {
    try {
      const res = await axios.get(PRODUCTS_URL);
      if (res.data.success) {
        setProducts(res.data.data);
      } else {
        setError("Failed to load distributor products.");
      }
    } catch {
      setError("Error fetching distributor products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------
  // Transfer
  // ----------------------
  const openTransferModal = () => {
    if (!anyEligibleSelected) return;
    setIsTransferOpen(true);
    setRecipientUserId("");
    setTransferError(null);
    setTransferResults(null);
  };

  const closeTransferModal = () => {
    if (transferLoading) return;
    setIsTransferOpen(false);
  };

  const handleConfirmTransfer = async () => {
    const toId = Number(recipientUserId);
    if (!toId || Number.isNaN(toId)) {
      setTransferError("Invalid recipient user ID.");
      return;
    }

    setTransferLoading(true);
    setTransferError(null);

    try {
      const results: TransferResult[] = [];

      for (const p of selectedEligibleProducts) {
        try {
          const res = await axios.post(TRANSFER_URL, {
            from_user_id: distributorId,
            to_user_id: toId,
            product_id: p.productId,
          });

          if (res.data?.success) {
            results.push({
              productId: p.productId,
              ok: true,
              message: "Transferred ✅",
            });
          } else {
            results.push({
              productId: p.productId,
              ok: false,
              message: res.data?.error || "Transfer failed",
            });
          }
        } catch (err: any) {
          results.push({
            productId: p.productId,
            ok: false,
            message:
              err?.response?.data?.details ||
              err?.response?.data?.error ||
              err.message,
          });
        }
      }

      setTransferResults(results);

      if (!results.some((r) => !r.ok)) {
        await loadProducts();
        setSelectedIds(new Set());
      }
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) return <p>Loading products...</p>;

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>My Products</h1>

      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}

      {anyEligibleSelected && (
        <button onClick={openTransferModal} style={{ marginBottom: 20 }}>
          Transfer Ownership
        </button>
      )}

      <table style={{ width: "100%", background: "white", borderRadius: 8 }}>
        <thead>
          <tr>
            <th></th>
            <th>ID</th>
            <th>Name</th>
            <th>Serial</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {products.map((p) => (
            <tr key={p.productId}>
              <td>
                <input
                  type="checkbox"
                  disabled={!isTransferEligible(p)}
                  checked={selectedIds.has(p.productId)}
                  onChange={() => toggleSelected(p.productId)}
                />
              </td>
              <td>{p.productId}</td>
              <td>{p.productName || "—"}</td>
              <td>{p.serialNumber}</td>
              <td>{p.blockchainStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Transfer modal */}
      {isTransferOpen && (
        <div>
          <h3>Transfer Ownership</h3>

          <input
            placeholder="Recipient user ID"
            value={recipientUserId}
            onChange={(e) => setRecipientUserId(e.target.value)}
          />

          <button onClick={handleConfirmTransfer} disabled={transferLoading}>
            Confirm Transfer
          </button>

          <button onClick={closeTransferModal}>Cancel</button>

          {transferError && <div style={{ color: "red" }}>{transferError}</div>}

          {transferResults &&
            transferResults.map((r) => (
              <div key={r.productId}>
                Product {r.productId}: {r.message}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
