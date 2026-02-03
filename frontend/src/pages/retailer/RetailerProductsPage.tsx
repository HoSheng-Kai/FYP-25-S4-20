import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import TransferOwnershipModal from "../../components/transfers/TransferOwnershipModal";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";
import ReactDOM from "react-dom";

type BackendProduct = {
  product_id: number;
  serial_no: string;
  model: string | null;
  category: string | null;
  product_pda: string | null;
  tx_hash: string | null;
  track: boolean | null;
  stage?: string | null; // 'draft' | 'confirmed' | 'onchain'
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

type ProductRow = {
  productId: number;
  serialNumber: string;
  category?: string | null;
  productName: string | null;
  lifecycleStatus: "active" | "transferred";
  blockchainStatus: string; // pending / confirmed
  registeredOn: string;

  price: string | null;
  currency: string | null;
  listingStatus: string | null;
  listingCreatedOn: string | null;

  relationship?: "owner" | "manufacturer" | null;
  stage?: string | null;
};

type FilterMode = "all" | "owned";

export default function RetailerProductsPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();

  // cookie-auth source of truth
  const retailerId = auth.user?.userId ?? 0;

  const wallet = useWallet();
  const walletConnected = !!wallet.connected && !!wallet.publicKey;

  const [allProducts, setAllProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [transferOpen, setTransferOpen] = useState(false);

  // NOTE: you currently hit distributors endpoint; keep as-is unless you have a retailer endpoint
  const GET_BY_USER_URL = `${API_ROOT}/distributors/products-by-user`;

  // actions menu
  const [openMenuForId, setOpenMenuForId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{
    id: number;
    top: number;
    left: number;
    placement: "down" | "up";
  } | null>(null);

  const MENU_WIDTH = 220;
  const MENU_HEIGHT = 70;

  const openMenu = (id: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // default open DOWN
    const downTop = r.bottom + scrollY + 6;

    // open UP candidate
    const upTop = r.top + scrollY - MENU_HEIGHT - 6;

    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;

    const shouldFlipUp = spaceBelow < MENU_HEIGHT && spaceAbove > MENU_HEIGHT;

    // align right edge of menu with button
    const leftRaw = r.right + scrollX - MENU_WIDTH;

    const left = Math.min(
      scrollX + window.innerWidth - MENU_WIDTH - 12,
      Math.max(scrollX + 12, leftRaw)
    );

    setOpenMenuForId(id);
    setMenuPos({
      id,
      top: shouldFlipUp ? upTop : downTop,
      left,
      placement: shouldFlipUp ? "up" : "down",
    });
  };

  const closeMenu = () => {
    setOpenMenuForId(null);
    setMenuPos(null);
  };

  // close action menu on outside click / esc / scroll
  useEffect(() => {
  const onDocMouseDown = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null;
    if (!t) return;

    // click inside row menu button container
    if (t.closest?.("[data-actions-menu-root='true']")) return;

    // click inside portal menu itself
    if (t.closest?.("[data-actions-menu-portal='true']")) return;

    closeMenu();
  };

  const onEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeMenu();
  };

  const onScrollOrResize = () => closeMenu();

  document.addEventListener("mousedown", onDocMouseDown);
  document.addEventListener("keydown", onEsc);
  window.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize);

  return () => {
    document.removeEventListener("mousedown", onDocMouseDown);
    document.removeEventListener("keydown", onEsc);
    window.removeEventListener("scroll", onScrollOrResize, true);
    window.removeEventListener("resize", onScrollOrResize);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // helpers
  const isOnChainConfirmed = (p: ProductRow) => {
    const s = (p.blockchainStatus || "").toLowerCase();
    return s.includes("confirmed") || s.includes("on blockchain") || s.includes("on-chain") || s.includes("onchain");
  };

  const isTransferEligible = (p: ProductRow) => isOnChainConfirmed(p) && p.relationship === "owner";

  const safeDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  // filtered list
  const products = useMemo(() => {
    if (filterMode === "owned") return allProducts.filter((p) => p.relationship === "owner");
    return allProducts;
  }, [allProducts, filterMode]);

  // clear hidden selections when filter changes
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visibleIds = new Set(products.map((p) => p.productId));
      const next = new Set<number>();
      for (const id of prev) if (visibleIds.has(id)) next.add(id);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, products.length]);

  // selection helpers
  const selectedProducts = useMemo(() => products.filter((p) => selectedIds.has(p.productId)), [products, selectedIds]);
  const selectedEligibleProducts = useMemo(() => selectedProducts.filter(isTransferEligible), [selectedProducts]);
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
      const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every((id) => prev.has(id));
      if (allEligibleSelected) return new Set();
      return new Set(eligibleIds);
    });
  };

  const clearSelected = () => setSelectedIds(new Set());

  // load products
  const loadProducts = async () => {
    try {
      if (!retailerId || Number.isNaN(retailerId)) {
        setError("Retailer ID missing. Please login again.");
        return;
      }

      const res = await axios.post<GetProductsByUserResponse>(
        GET_BY_USER_URL,
        { user_id: retailerId },
        { withCredentials: true }
      );

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
          lifecycleStatus,
          blockchainStatus: confirmed ? "confirmed" : "pending",
          registeredOn: p.owned_since || "",
          price: null,
          currency: null,
          listingStatus: null,
          listingCreatedOn: null,
          relationship,
          stage: p.stage ?? null,
        };
      });

      setAllProducts(mapped);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.details || "Error fetching products.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ wait until auth is resolved so retailerId is valid
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) return;
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.user?.userId]);

  const openTransferModal = () => {
    if (!walletConnected) return;
    if (!anyEligibleSelected) return;
    setTransferOpen(true);
  };

  if (auth.loading) return <p style={{ padding: 20 }}>Loading…</p>;
  if (!auth.user) return <p style={{ padding: 20 }}>Not logged in.</p>;
  if (loading) return <p style={{ padding: 20 }}>Loading products...</p>;

  return (
    <div
      style={{
        padding: "24px 16px",
        maxWidth: 1100,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
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
        </div>
      </div>

      <h2 style={{ margin: 1, fontWeight: 300, color: "#6b7280" }}>Select products to transfer ownership</h2>

      {/* Transfer row */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <WalletMultiButton />

        <button
          type="button"
          onClick={openTransferModal}
          disabled={!walletConnected || !anyEligibleSelected}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: !walletConnected || !anyEligibleSelected ? "#9ca3af" : "#111827",
            color: "white",
            cursor: !walletConnected || !anyEligibleSelected ? "not-allowed" : "pointer",
            fontWeight: 700,
            opacity: !walletConnected || !anyEligibleSelected ? 0.7 : 1,
          }}
          title={
            !walletConnected
              ? "Connect your wallet to transfer ownership"
              : !anyEligibleSelected
              ? "Select at least one transferable product"
              : "Transfer selected products"
          }
        >
          Transfer Ownership
        </button>
      </div>

      {!walletConnected && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: "#b45309",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            padding: "8px 10px",
            borderRadius: 10,
            display: "inline-block",
          }}
        >
          Please connect your wallet before transferring ownership.
        </div>
      )}

      {error && (
        <div style={{ background: "#ffe0e0", padding: "10px", borderRadius: "8px", marginBottom: "16px", color: "#a11" }}>
          {error}
        </div>
      )}

      {/* ✅ IMPORTANT: keep table scroll INSIDE this wrapper */}
      <div className="table-scroll" style={{ width: "100%", overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: 720, // forces inner scroll on small screens instead of body overflow
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
                  title="Select all transferable products"
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
              const confirmed = isOnChainConfirmed(p);
              const eligible = isTransferEligible(p);

              const go = (fn: () => void) => {
                fn();
                closeMenu();
              };

              return (
                <tr key={p.productId}>
                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.productId)}
                      onChange={() => toggleSelected(p.productId)}
                      disabled={!eligible}
                      aria-label={`Select product ${p.productId}`}
                      title={
                        !confirmed
                          ? "Cannot transfer: product not confirmed on-chain"
                          : p.lifecycleStatus === "transferred"
                          ? "Cannot transfer: you are no longer the current owner"
                          : "Transfer eligible"
                      }
                    />
                  </td>

                  <td style={td}>{p.productId}</td>
                  <td style={td}>{p.productName || "—"}</td>
                  <td style={td}>{p.category || "—"}</td>
                  <td style={td}>{safeDate(p.registeredOn)}</td>

                  <td style={td}>
                    <span
                      style={{
                        marginLeft: 10,
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: 12,
                        background: p.lifecycleStatus === "active" ? "#dcfce7" : "#fee2e2",
                        color: p.lifecycleStatus === "active" ? "#166534" : "#991b1b",
                      }}
                      title={p.lifecycleStatus === "active" ? "You currently own this product" : "You have transferred this product"}
                    >
                      {p.lifecycleStatus === "active" ? "owned" : "transferred"}
                    </span>

                    {p.stage && (
                      <span
                        style={{
                          marginLeft: 10,
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: 12,
                          background: "#f3f4f6",
                          color: "#111827",
                        }}
                        title="DB Stage"
                      >
                        {p.stage}
                      </span>
                    )}
                  </td>

                  <td style={td}>
                    <div data-actions-menu-root="true" style={{ position: "relative", display: "inline-block" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          const same = openMenuForId === p.productId;
                          if (same) {
                            closeMenu();
                            return;
                          }
                          openMenu(p.productId, e.currentTarget);
                        }}
                        style={kebabBtn}
                        aria-label="Open actions"
                        title="Actions"
                      >
                        ⋯
                      </button>

                      {openMenuForId === p.productId &&
                        menuPos?.id === p.productId &&
                        ReactDOM.createPortal(
                          <div
                            data-actions-menu-portal="true"
                            style={{
                              ...menuCard,
                              position: "absolute",
                              top: menuPos.top,
                              left: menuPos.left,
                              right: "auto",
                              transformOrigin: menuPos.placement === "up" ? "bottom right" : "top right",
                            }}
                            role="menu"
                            aria-label="Row actions"
                          >
                            <button
                              type="button"
                              style={menuItem}
                              onClick={() => {
                                navigate(`/products/${p.productId}/details`);
                                closeMenu();
                              }}
                              role="menuitem"
                            >
                              View details
                            </button>
                          </div>,
                          document.body
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {products.length === 0 && <p style={{ marginTop: 20, opacity: 0.6 }}>No products found for this filter.</p>}

      <TransferOwnershipModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        fromUserId={retailerId}
        selectedProductIds={selectedEligibleProducts.map((p) => p.productId)}
        title="Ownership Transfer"
        onTransferred={async (results) => {
          const anyFail = results.some((r) => !r.ok);
          if (!anyFail) {
            await loadProducts();
            clearSelected();
            setTransferOpen(false);
          }
        }}
      />
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

const kebabBtn: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 18,
  lineHeight: 1,
};

const menuCard: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  minWidth: 220,
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
  padding: 6,
  zIndex: 9999,
};

const menuItem: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "transparent",
  padding: "10px 10px",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  color: "#111827",
};
