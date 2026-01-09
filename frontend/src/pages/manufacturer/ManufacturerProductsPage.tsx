// src/pages/manufacturer/ManufacturerProductsPage.tsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { PRODUCTS_API_BASE_URL } from "../../config/api";
import { useNavigate } from "react-router-dom";
import TransferOwnershipModal from "../../components/transfers/TransferOwnershipModal";

/** =========================
 * Backend response for "products-by-user"
 * ========================= */
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

/** =========================
 * Your UI types
 * ========================= */
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

/** =========================
 * Edit modal types (same as before)
 * ========================= */
type EditProductData = {
  productId: number;
  serialNumber: string;
  productName: string | null;
  batchNumber: string | null;
  category: string | null;
  manufactureDate: string | null;
  productDescription: string | null;
  status: string;
  registeredOn: string;
  qrImageUrl?: string;
};

type GetEditResponse = {
  success: boolean;
  data?: EditProductData;
  error?: string;
  details?: string;
};

type UpdateResponse = {
  success: boolean;
  data?: {
    productId: number;
    serialNumber: string;
    productName: string | null;
    batchNumber: string | null;
    category: string | null;
    manufactureDate: string | null;
    productDescription: string | null;
    status: string;
    registeredOn: string;
    qrPayload?: string;
    qrImageUrl?: string;
  };
  error?: string;
  details?: string;
};

export default function ManufacturerProductsPage() {
  const navigate = useNavigate();

  const manufacturerId = Number(localStorage.getItem("userId"));
  const [allProducts, setAllProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // ======================
  // TRANSFER SELECTION + SHARED MODAL
  // ======================
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [transferOpen, setTransferOpen] = useState(false);

  const GET_BY_USER_URL = "http://localhost:3000/api/distributors/products-by-user";

  // ======================
  // ACTIONS MENU (⋯)
  // ======================
  const [openMenuForId, setOpenMenuForId] = useState<number | null>(null);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;

      // click inside menu => don't close
      if (t.closest?.("[data-actions-menu-root='true']")) return;

      setOpenMenuForId(null);
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuForId(null);
    };

    const onScrollOrResize = () => setOpenMenuForId(null);

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
  }, []);

  // ================
  // EDIT MODAL STATE
  // ================
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  // fields
  const [editSerial, setEditSerial] = useState("");
  const [editName, setEditName] = useState("");
  const [editBatch, setEditBatch] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editMfgDate, setEditMfgDate] = useState(""); // yyyy-mm-dd
  const [editDescription, setEditDescription] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

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

  // register eligible: stage = confirmed AND not yet on chain
  const isRegisterOnChainEligible = (p: ProductRow) => {
    if (isOnChainConfirmed(p)) return false;

    const stage = (p.stage || "").toLowerCase();
    if (stage !== "confirmed") return false;

    return p.relationship === "manufacturer";
  };

  // transfer eligible: on-chain confirmed + owned by user
  const isTransferEligible = (p: ProductRow) => {
    return isOnChainConfirmed(p) && p.relationship === "owner";
  };

  // lock eligible: stage=draft AND not on-chain AND manufacturer
  const isLockDraftEligible = (p: ProductRow) => {
    if (isOnChainConfirmed(p)) return false;
    const stage = (p.stage || "").toLowerCase();
    if (stage !== "draft") return false;
    return p.relationship === "manufacturer";
  };

  const safeDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  // filtered list for the table
  const products = useMemo(() => {
    if (filterMode === "owned") {
      return allProducts.filter((p) => p.relationship === "owner");
    }
    return allProducts;
  }, [allProducts, filterMode]);

  // Clear hidden selections when filter changes
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
      const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every((id) => prev.has(id));

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
      if (!manufacturerId || Number.isNaN(manufacturerId)) {
        setError("Manufacturer ID missing. Please login again.");
        return;
      }

      const res = await axios.post<GetProductsByUserResponse>(GET_BY_USER_URL, {
        user_id: manufacturerId,
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

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTransferModal = () => {
    if (!anyEligibleSelected) return;
    setTransferOpen(true);
  };

  // ----------------------
  // DELETE PRODUCT (draft only)
  // ----------------------
  const handleDelete = async (productId: number) => {
    const row = products.find((x) => x.productId === productId);
    if (row && isOnChainConfirmed(row)) {
      alert("Cannot delete a product that is confirmed on blockchain.");
      return;
    }

    const confirmDelete = window.confirm("Are you sure you want to delete this product? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      const res = await axios.delete(`${PRODUCTS_API_BASE_URL}/${productId}/draft`, {
        data: { manufacturerId },
      });

      if (res.data.success) {
        alert("Product deleted successfully.");

        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });

        loadProducts();
      } else {
        alert(res.data.error || "Failed to delete product.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.details || err.message;
      alert("Delete failed: " + msg);
    }
  };

  // ----------------------
  // LOCK DRAFT (confirm draft)
  // ----------------------
  const handleLockDraft = async (productId: number) => {
    try {
      const res = await axios.post(`${PRODUCTS_API_BASE_URL}/${productId}/confirm-draft`, { manufacturerId });

      if (!res.data?.success) {
        alert(res.data?.error || "Failed to lock draft.");
        return;
      }

      await loadProducts();
    } catch (err: any) {
      alert(err?.response?.data?.details || err?.message || "Lock draft failed.");
    }
  };

  // ----------------------
  // EDIT MODAL (restored)
  // ----------------------
  const openEditModal = async (productId: number) => {
    setOpenMenuForId(null);

    const row = products.find((x) => x.productId === productId);

    if (row && isOnChainConfirmed(row)) {
      setIsEditOpen(true);
      setIsEditLoading(false);
      setEditSuccess(null);
      setEditingProductId(productId);

      setEditError("This product is already confirmed on blockchain and cannot be edited (immutable).");

      setEditSerial(row.serialNumber ?? "");
      setEditName(row.productName ?? "");
      setEditCategory(row.category ?? "");
      setEditBatch("");
      setEditMfgDate("");
      setEditDescription("");
      setQrImageUrl(null);
      return;
    }

    setIsEditOpen(true);
    setIsEditLoading(true);
    setEditError(null);
    setEditSuccess(null);
    setEditingProductId(productId);

    try {
      const res = await axios.get<GetEditResponse>(`${PRODUCTS_API_BASE_URL}/${productId}/edit`, {
        params: { manufacturerId },
      });

      if (!res.data.success || !res.data.data) {
        setEditError(res.data.error || "Failed to load product for editing.");
        return;
      }

      const d = res.data.data;

      setEditSerial(d.serialNumber ?? "");
      setEditName(d.productName ?? "");
      setEditBatch(d.batchNumber ?? "");
      setEditCategory(d.category ?? "");
      setEditDescription(d.productDescription ?? "");
      // parse into yyyy-mm-dd
      const toDateInputValue = (v: string | null | undefined) => {
        if (!v) return "";
        if (typeof v === "string" && v.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
        return "";
      };
      setEditMfgDate(toDateInputValue(d.manufactureDate));
      setQrImageUrl(d.qrImageUrl ? withNoCache(d.qrImageUrl) : null);
    } catch (err: any) {
      setEditError(err.response?.data?.error || err.response?.data?.details || "Error loading product for edit.");
    } finally {
      setIsEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setIsEditLoading(false);
    setEditError(null);
    setEditSuccess(null);
    setEditingProductId(null);

    setEditSerial("");
    setEditName("");
    setEditBatch("");
    setEditCategory("");
    setEditMfgDate("");
    setEditDescription("");
    setQrImageUrl(null);
  };

  const handleUpdateProduct = async () => {
    if (!editingProductId) return;

    const row = products.find((x) => x.productId === editingProductId);
    if (row && isOnChainConfirmed(row)) {
      setEditError("This product is confirmed on blockchain and cannot be updated.");
      return;
    }

    if (!manufacturerId || Number.isNaN(manufacturerId)) {
      setEditError("Manufacturer ID missing. Please login again.");
      return;
    }
    if (!editSerial.trim()) {
      setEditError("Serial Number is required.");
      return;
    }

    setEditError(null);
    setEditSuccess(null);
    setIsEditLoading(true);

    try {
      const payload = {
        manufacturerId,
        serialNo: editSerial.trim(),
        productName: editName.trim() || null,
        batchNo: editBatch.trim() || null,
        category: editCategory.trim() || null,
        manufactureDate: editMfgDate || null, // YYYY-MM-DD
        description: editDescription.trim() || null,
      };

      const res = await axios.put<UpdateResponse>(`${PRODUCTS_API_BASE_URL}/${editingProductId}`, payload);

      if (!res.data.success || !res.data.data) {
        setEditError(res.data.error || "Failed to update product.");
        return;
      }

      setEditSuccess("Updated successfully. New QR code generated.");

      const newQr = res.data.data.qrImageUrl ?? `${PRODUCTS_API_BASE_URL}/${editingProductId}/qrcode`;
      setQrImageUrl(withNoCache(newQr));

      await loadProducts();
    } catch (err: any) {
      setEditError(err.response?.data?.error || err.response?.data?.details || "Update failed.");
    } finally {
      setIsEditLoading(false);
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Loading products...</p>;

  return (
    <div style={{ padding: "40px" }}>
      {/* Header row + filter pills */}
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

      {/* Transfer button row */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, gap: 10 }}>
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
            Transfer Ownership
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
                title="Select all transferable products (in this filter)"
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
            const transferEligible = isTransferEligible(p);
            const registerEligible = isRegisterOnChainEligible(p);
            const lockDraftEligible = isLockDraftEligible(p);

            const isOpen = openMenuForId === p.productId;

            const go = (fn: () => void) => {
              fn();
              setOpenMenuForId(null);
            };

            return (
              <tr key={p.productId}>
                <td style={td}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.productId)}
                    onChange={() => toggleSelected(p.productId)}
                    disabled={!transferEligible}
                    aria-label={`Select product ${p.productId}`}
                    title={
                      !locked
                        ? "Cannot transfer: product not on-chain yet"
                        : p.relationship !== "owner"
                        ? "Cannot transfer: you are not the current owner"
                        : "Transfer eligible"
                    }
                  />
                </td>

                <td style={td}>{p.productId}</td>
                <td style={td}>{p.productName || "—"}</td>
                <td style={td}>{p.category || "—"}</td>
                <td style={td}>{safeDate(p.registeredOn)}</td>

                <td style={td}>
                  {/* Ownership */}
                  <span
                    style={{
                      marginLeft: 10,
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: 12,
                      background: p.lifecycleStatus === "active" ? "#dcfce7" : "#fee2e2",
                      color: p.lifecycleStatus === "active" ? "#166534" : "#991b1b",
                    }}
                    title={
                      p.lifecycleStatus === "active"
                        ? "You currently own this product"
                        : "You have transferred this product"
                    }
                  >
                    {p.lifecycleStatus === "active" ? "owned" : "transferred"}
                  </span>

                  {/* Stage pill */}
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

                {/* Actions Menu */}
                <td style={td}>
                  <div data-actions-menu-root="true" style={{ position: "relative", display: "inline-block" }}>
                    <button
                      type="button"
                      onClick={() => setOpenMenuForId((prev) => (prev === p.productId ? null : p.productId))}
                      style={kebabBtn}
                      aria-label="Open actions"
                      title="Actions"
                    >
                      ⋯
                    </button>

                    {isOpen && (
                      <div style={menuCard} role="menu" aria-label="Row actions">
                        <button
                          type="button"
                          style={menuItem}
                          onClick={() => go(() => navigate(`/products/${p.productId}/details`))}
                          role="menuitem"
                        >
                          View details
                        </button>

                        <button
                          type="button"
                          style={locked ? menuItemDisabled : menuItem}
                          onClick={() => (locked ? undefined : go(() => void openEditModal(p.productId)))}
                          disabled={locked}
                          role="menuitem"
                          title={locked ? "On-chain products cannot be edited" : "Edit product"}
                        >
                          Edit
                        </button>

                        <div style={menuDivider} />

                        <button
                          type="button"
                          style={lockDraftEligible ? menuItem : menuItemDisabled}
                          onClick={() => (lockDraftEligible ? go(() => void handleLockDraft(p.productId)) : undefined)}
                          disabled={!lockDraftEligible}
                          role="menuitem"
                          title={
                            lockDraftEligible
                              ? "Confirm (lock) this draft so it can be registered on-chain"
                              : "Draft already locked or on-chain"
                          }
                        >
                          Lock draft (confirm)
                        </button>

                        <button
                          type="button"
                          style={registerEligible ? menuItem : menuItemDisabled}
                          onClick={() =>
                            registerEligible
                              ? go(() => navigate(`/manufacturer/register?productId=${p.productId}&stage=${encodeURIComponent(p.stage ?? "")}`))
                              : undefined
                          }
                          disabled={!registerEligible}
                          role="menuitem"
                          title={registerEligible ? "Send to blockchain" : "Only confirmed drafts can be registered"}
                        >
                          Send to blockchain
                        </button>

                        <div style={menuDivider} />

                        <button
                          type="button"
                          style={locked ? menuItemDisabledDanger : menuItemDanger}
                          onClick={() => (locked ? undefined : go(() => void handleDelete(p.productId)))}
                          disabled={locked}
                          role="menuitem"
                          title={locked ? "On-chain products cannot be deleted" : "Delete draft"}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {products.length === 0 && <p style={{ marginTop: 20, opacity: 0.6 }}>No products found for this filter.</p>}

      {/* =======================
          TRANSFER OWNERSHIP MODAL
      ======================== */}
      <TransferOwnershipModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        fromUserId={manufacturerId}
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

      {/* =======================
          EDIT PRODUCT MODAL (restored)
      ======================== */}
      {isEditOpen && (
        <div style={modalOverlay} onMouseDown={closeEditModal}>
          <div
            style={modalCard}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div style={modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Edit Product Details</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                  Update product information and generate a new unique QR code
                </p>
              </div>

              <button style={modalCloseBtn} onClick={closeEditModal} type="button">
                ✕
              </button>
            </div>

            {editError && <div style={alertError}>{editError}</div>}
            {editSuccess && <div style={alertSuccess}>{editSuccess}</div>}

            <div style={{ display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
            >
              <Field label="Product Name *">
                <input
                  style={input}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. iPhone 15 Pro Max"
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>

              <Field label="Category *">
                <input
                  style={input}
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="e.g. Electronics"
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>

              <Field label="Batch Number *">
                <input
                  style={input}
                  value={editBatch}
                  onChange={(e) => setEditBatch(e.target.value)}
                  placeholder="e.g. BATCH-2024-A1"
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>

              <Field label="Serial Number *">
                <input
                  style={input}
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  placeholder="e.g. IMEI: 3569..."
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>

              <Field label="Manufacture Date *">
                <input
                  style={input}
                  type="date"
                  value={editMfgDate}
                  onChange={(e) => setEditMfgDate(e.target.value)}
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>
            </div>

            <div style={{ marginTop: 14 }}>
              <Field label="Description">
                <textarea
                  style={{ ...input, minHeight: 80, resize: "vertical", boxSizing: "border-box" }}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g. 256GB, Titanium Blue, Factory Sealed"
                  disabled={!!editError && editError.includes("immutable")}
                />
              </Field>
            </div>

            <div style={infoBox}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                🔒 Unique QR Code Generation
              </div>
              <div style={{ fontSize: 12, color: "#374151" }}>
                A new unique QR code will be automatically generated and tied to this product
                when you save your changes.
              </div>

              {qrImageUrl && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <img
                    src={qrImageUrl}
                    alt="QR Code"
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: 12,
                      background: "white",
                      padding: 8,
                    }}
                  />
                </div>
              )}
            </div>

            <div style={modalFooter}>
              <button type="button" onClick={closeEditModal} style={btnSecondary} disabled={isEditLoading}>
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleUpdateProduct()}
                style={btnPrimary}
                disabled={isEditLoading || !!(editError && editError.toLowerCase().includes("immutable"))}
                title={
                  editError && editError.toLowerCase().includes("immutable")
                    ? "On-chain product cannot be updated"
                    : "Update"
                }
              >
                {isEditLoading ? "Updating..." : "Update & Generate New QR Code"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- helpers ----------------- */

function withNoCache(url: string) {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}ts=${Date.now()}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

/* ----------------- UI helpers ----------------- */

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
  minWidth: 200,
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

const menuItemDisabled: React.CSSProperties = {
  ...menuItem,
  cursor: "not-allowed",
  opacity: 0.45,
};

const menuDivider: React.CSSProperties = {
  height: 1,
  background: "#eef2f7",
  margin: "6px 6px",
};

const menuItemDanger: React.CSSProperties = {
  ...menuItem,
  color: "#b91c1c",
};

const menuItemDisabledDanger: React.CSSProperties = {
  ...menuItemDanger,
  cursor: "not-allowed",
  opacity: 0.45,
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
  width: "min(720px, 100%)",
  maxHeight: "calc(100vh - 48px)",
  overflow: "auto",

  background: "white",
  borderRadius: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  padding: 18,

  boxSizing: "border-box",
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
  boxSizing: "border-box",
};

const infoBox: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
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

const alertSuccess: React.CSSProperties = {
  background: "#e7ffef",
  color: "#116a2b",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 10,
};
