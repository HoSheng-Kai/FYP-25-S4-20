import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/** =========================
 * Backend response for "products-by-user"
 * ========================= */
type BackendProduct = {
  product_id: number;
  serial_no: string;
  model: string | null;
  category: string | null;
  status: string | null; // e.g. 'registered' | 'verified' | 'suspicious'
  product_pda: string | null;
  tx_hash: string | null;
  track: boolean | null;

  owned_since?: string | null;
  relationship?: string | null; // 'owner' | 'manufacturer' | null
};

type GetProductsByUserResponse = {
  success: boolean;
  data?: {
    user_id: number;
    username: string;
    total_products: number;
    products: BackendProduct[];
  };
  error?: string;
  details?: string;
};

/** =========================
 * Your UI types
 * ========================= */
type ProductRow = {
  productId: number;
  serialNumber: string;
  category?: string | null;
  productName: string | null;
  productStatus: "registered" | "verified" | "suspicious";
  lifecycleStatus: "active" | "transferred";
  blockchainStatus: string; // pending / confirmed
  registeredOn: string;

  track: boolean;
  relationship?: "owner" | "manufacturer" | null;
};

type TransferResult = {
  productId: number;
  ok: boolean;
  message: string;
};

type FilterMode = "all" | "owned" | "registered";

export default function RetailerProductsPage() {
  const navigate = useNavigate();

  const retailerId = Number(localStorage.getItem("userId"));

  // ✅ keep full list, table shows filtered
  const [allProducts, setAllProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ filter
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // ======================
  // OWNERSHIP TRANSFER STATE
  // ======================
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [recipientUserId, setRecipientUserId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferResults, setTransferResults] = useState<TransferResult[] | null>(
    null
  );

  const GET_BY_USER_URL = "http://localhost:3000/api/distributors/products-by-user";
  const TRANSFER_URL = "http://localhost:3000/api/distributors/update-ownership";

  // ----------------------
  // HELPERS
  // ----------------------
  const isOnChainConfirmed = (p: ProductRow) => {
    const s = (p.blockchainStatus || "").toLowerCase();
    return (
      s.includes("confirmed") ||
      s.includes("on blockchain") ||
      s.includes("on-chain") ||
      s.includes("onchain")
    );
  };

  const isTransferEligible = (p: ProductRow) => {
    // Must be confirmed AND still owned by current user
    return isOnChainConfirmed(p) && p.lifecycleStatus !== "transferred" && p.track;
  };

  const safeDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  const normalizeStatus = (
    s: string | null | undefined
  ): ProductRow["productStatus"] => {
    const v = (s || "").toLowerCase();
    if (v === "verified") return "verified";
    if (v === "suspicious") return "suspicious";
    return "registered";
  };

  // ✅ filtered list
  const products = useMemo(() => {
    if (filterMode === "owned") {
      return allProducts.filter((p) => p.relationship === "owner");
    }
    if (filterMode === "registered") {
      return allProducts.filter((p) => p.relationship === "manufacturer");
    }
    return allProducts;
  }, [allProducts, filterMode]);

  // ✅ clear hidden selections when filter changes
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleIds = new Set(products.map((p) => p.productId));
      const next = new Set<number>();
      for (const id of prev) {
        if (visibleIds.has(id)) next.add(id);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, products.length]);

  // ----------------------
  // Selection helpers (eligible-only)
  // ----------------------
  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.has(p.productId)),
    [products, selectedIds]
  );

  const selectedEligibleProducts = useMemo(
    () => selectedProducts.filter(isTransferEligible),
    [selectedProducts]
  );

  const anyEligibleSelected = selectedEligibleProducts.length > 0;

  const allSelected = useMemo(() => {
    const eligible = products.filter(isTransferEligible);
    if (eligible.length === 0) return false;
    return eligible.every((p) => selectedIds.has(p.productId));
  }, [products, selectedIds]);

  const toggleSelected = (productId: number) => {
    const row = products.find((x) => x.productId === productId);
    if (row && !isTransferEligible(row)) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const eligibleIds = products.filter(isTransferEligible).map((p) => p.productId);
      const allEligibleSelected =
        eligibleIds.length > 0 && eligibleIds.every((id) => prev.has(id));

      if (allEligibleSelected) return new Set();
      return new Set(eligibleIds);
    });
  };

  const clearSelected = () => setSelectedIds(new Set());

  // ----------------------
  // LOAD PRODUCTS
  // ----------------------
  const loadProducts = async () => {
    try {
      if (!retailerId || Number.isNaN(retailerId)) {
        setError("Retailer ID missing. Please login again.");
        return;
      }

      const res = await axios.post<GetProductsByUserResponse>(GET_BY_USER_URL, {
        user_id: retailerId,
      });

      if (!res.data.success || !res.data.data) {
        setError(res.data.error || "Failed to load products.");
        return;
      }

      const raw = res.data.data.products || [];

      const mapped: ProductRow[] = raw.map((p) => {
        const confirmed = !!(p.tx_hash && p.product_pda);

        const relationship = (p.relationship as any) ?? null;

        const lifecycleStatus: ProductRow["lifecycleStatus"] =
          relationship === "owner" ? "active" : "transferred";

        return {
          productId: p.product_id,
          serialNumber: p.serial_no,
          productName: p.model ?? null,
          category: p.category ?? null,
          productStatus: normalizeStatus(p.status),
          lifecycleStatus,
          blockchainStatus: confirmed ? "confirmed" : "pending",
          registeredOn: p.owned_since || "",
          track: p.track !== false,
          relationship,
        };
      });

      setAllProducts(mapped);
      setError(null);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "Error fetching products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------
  // Transfer Modal open/close
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
    setRecipientUserId("");
    setTransferError(null);
    setTransferResults(null);
  };

  // ----------------------
  // TRANSFER
  // ----------------------
  const handleConfirmTransfer = async () => {
    if (!retailerId || Number.isNaN(retailerId)) {
      setTransferError("Retailer ID missing. Please login again.");
      return;
    }

    const toId = Number(recipientUserId);
    if (!toId || Number.isNaN(toId) || toId <= 0) {
      setTransferError("Please enter a valid Recipient User ID.");
      return;
    }

    if (selectedEligibleProducts.length === 0) {
      setTransferError(
        "No transferable products selected. (Products must be on-chain confirmed, tracked, and still owned by you.)"
      );
      return;
    }

    setTransferLoading(true);
    setTransferError(null);
    setTransferResults(null);

    try {
      const results: TransferResult[] = [];

      for (const p of selectedEligibleProducts) {
        try {
          const res = await axios.post(TRANSFER_URL, {
            from_user_id: retailerId,
            to_user_id: toId,
            product_id: p.productId,
          });

          if (res.data?.success) {
            const exec = res.data?.data?.transactions?.execute;
            results.push({
              productId: p.productId,
              ok: true,
              message: exec ? `Transferred ✅ (execute: ${exec})` : "Transferred ✅",
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
              err.message ||
              "Transfer failed",
          });
        }
      }

      setTransferResults(results);

      const anyFail = results.some((r) => !r.ok);
      if (!anyFail) {
        await loadProducts();
        clearSelected();
      }
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Loading products...</p>;

  return (
    <div style={{ padding: "40px" }}>
      {/* Header + filter pills */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0 }}>My Products</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <FilterPill
            active={filterMode === "all"}
            onClick={() => setFilterMode("all")}
            label="All"
            subtitle={`${allProducts.length}`}
          />
          <FilterPill
            active={filterMode === "owned"}
            onClick={() => setFilterMode("owned")}
            label="Owned"
            subtitle={`${allProducts.filter((p) => p.relationship === "owner").length}`}
          />
          <FilterPill
            active={filterMode === "registered"}
            onClick={() => setFilterMode("registered")}
            label="Registered by me"
            subtitle={`${allProducts.filter((p) => p.relationship === "manufacturer").length}`}
          />
        </div>
      </div>

      {/* Transfer button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        {anyEligibleSelected && (
          <button
            type="button"
            onClick={openTransferModal}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: "#111827",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Ownership Transfer
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            background: "#ffe0e0",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "16px",
            color: "#a11",
          }}
        >
          {error}
        </div>
      )}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "white",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <thead style={{ background: "#e9ecef" }}>
          <tr>
            <th style={{ ...th, width: 46 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all transferable products"
              />
            </th>
            <th style={th}>Product ID</th>
            <th style={th}>Product Name</th>
            <th style={th}>Category</th>
            <th style={th}>Owned Since</th>
            <th style={th}>Status</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {products.map((p) => {
            const locked = isOnChainConfirmed(p);
            const eligible = isTransferEligible(p);

            return (
              <tr key={p.productId}>
                <td style={td}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.productId)}
                    onChange={() => toggleSelected(p.productId)}
                    disabled={!eligible}
                    aria-label={`Select product ${p.productId}`}
                  />
                </td>

                <td style={td}>{p.productId}</td>
                <td style={td}>{p.productName || "—"}</td>
                <td style={td}>{p.category || "—"}</td>
                <td style={td}>{safeDate(p.registeredOn)}</td>

                <td style={td}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      textTransform: "capitalize",
                      background:
                        p.productStatus === "verified"
                          ? "#d4f5d4"
                          : p.productStatus === "registered"
                          ? "#dbeafe"
                          : "#fee2e2",
                      color:
                        p.productStatus === "verified"
                          ? "#1b6e1b"
                          : p.productStatus === "registered"
                          ? "#1d4ed8"
                          : "#b91c1c",
                    }}
                  >
                    {p.productStatus}
                  </span>

                  <span
                    style={{
                      marginLeft: 10,
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: 12,
                      background: locked ? "#e5e7eb" : "#fff7ed",
                      color: locked ? "#374151" : "#9a3412",
                    }}
                    title="Blockchain status"
                  >
                    {p.blockchainStatus}
                  </span>

                  {!p.track && (
                    <span
                      style={{
                        marginLeft: 10,
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: 12,
                        background: "#f3f4f6",
                        color: "#374151",
                      }}
                      title="Tracking ended"
                    >
                      tracking ended
                    </span>
                  )}
                </td>

                <td style={td}>
                  <button
                    onClick={() => navigate(`/retailer/products/${p.productId}`)}
                    style={iconBtn}
                    title="View"
                  >
                    👁
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {products.length === 0 && (
        <p style={{ marginTop: 20, opacity: 0.6 }}>
          No products found for this filter.
        </p>
      )}

      {/* =======================
          OWNERSHIP TRANSFER MODAL
      ======================== */}
      {isTransferOpen && (
        <div style={modalOverlay} onMouseDown={closeTransferModal}>
          <div
            style={{ ...modalCard, maxWidth: 620 }}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Ownership Transfer</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  Transfer selected products to another user.
                </p>
              </div>

              <button
                style={modalCloseBtn}
                onClick={closeTransferModal}
                type="button"
                disabled={transferLoading}
              >
                ✕
              </button>
            </div>

            {transferError && <div style={alertError}>{transferError}</div>}

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                Selected Transferable Products ({selectedEligibleProducts.length})
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 10,
                  maxHeight: 170,
                  overflow: "auto",
                  background: "#f9fafb",
                }}
              >
                {selectedEligibleProducts.map((p) => (
                  <div
                    key={p.productId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 6px",
                      borderBottom: "1px solid #eee",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 700 }}>{p.productName || "—"}</div>
                      <div style={{ color: "#6b7280" }}>
                        ID: <span style={{ fontFamily: "monospace" }}>{p.productId}</span>{" "}
                        • Serial:{" "}
                        <span style={{ fontFamily: "monospace" }}>{p.serialNumber}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          next.delete(p.productId);
                          return next;
                        });
                      }}
                      disabled={transferLoading}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "#b91c1c",
                        fontWeight: 700,
                      }}
                      title="Remove from selection"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {selectedEligibleProducts.length === 0 && (
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    No transferable products selected.
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Recipient User ID
              </div>
              <input
                style={input}
                value={recipientUserId}
                onChange={(e) => setRecipientUserId(e.target.value)}
                placeholder="e.g. 7 (fashion_retailer)"
                disabled={transferLoading}
              />
            </div>

            {transferResults && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  Transfer Results
                </div>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 10,
                    background: "white",
                    maxHeight: 160,
                    overflow: "auto",
                  }}
                >
                  {transferResults.map((r) => (
                    <div
                      key={r.productId}
                      style={{
                        fontSize: 13,
                        padding: "6px 0",
                        color: r.ok ? "#116a2b" : "#a11",
                      }}
                    >
                      Product {r.productId}: {r.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ ...modalFooter, justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={closeTransferModal}
                style={btnSecondary}
                disabled={transferLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleConfirmTransfer()}
                style={btnPrimary}
                disabled={transferLoading || selectedEligibleProducts.length === 0}
              >
                {transferLoading ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- Filter pill component ----------------- */

function FilterPill({
  active,
  onClick,
  label,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? "1px solid #111827" : "1px solid #e5e7eb",
        background: active ? "#111827" : "white",
        color: active ? "white" : "#111827",
        borderRadius: 999,
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        gap: 8,
        alignItems: "center",
        fontWeight: 700,
        fontSize: 13,
      }}
      title={label}
    >
      {label}
      {subtitle !== undefined && (
        <span
          style={{
            background: active ? "rgba(255,255,255,0.18)" : "#f3f4f6",
            color: active ? "white" : "#111827",
            borderRadius: 999,
            padding: "2px 8px",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {subtitle}
        </span>
      )}
    </button>
  );
}

/* ----------------- STYLES ----------------- */

const th: React.CSSProperties = {
  padding: "14px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "14px",
  borderBottom: "1px solid #ddd",
};

const td: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #eee",
  fontSize: "14px",
};

const iconBtn: React.CSSProperties = {
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: "18px",
  marginRight: "10px",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  zIndex: 9999,
};

const modalCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "white",
  borderRadius: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  padding: 18,
};

const modalHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const modalCloseBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
};

const modalFooter: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 14,
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const alertError: React.CSSProperties = {
  background: "#ffe6e6",
  color: "#a11",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 10,
};
