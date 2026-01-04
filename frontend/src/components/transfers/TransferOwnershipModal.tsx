import React, { useMemo, useState } from "react";
import axios from "axios";

type TransferResult = { productId: number; ok: boolean; message: string };

type Props = {
  open: boolean;
  onClose: () => void;
  fromUserId: number;
  selectedProductIds: number[];
  title?: string;
  transferUrl?: string; // allow override if needed
  onTransferred?: (results: TransferResult[]) => void; // e.g. reload products
};

const DEFAULT_TRANSFER_URL = "http://localhost:3000/api/distributors/update-ownership";

export default function TransferOwnershipModal({
  open,
  onClose,
  fromUserId,
  selectedProductIds,
  title = "Ownership Transfer",
  transferUrl = DEFAULT_TRANSFER_URL,
  onTransferred,
}: Props) {
  const [recipientUserId, setRecipientUserId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferResults, setTransferResults] = useState<TransferResult[] | null>(null);

  const count = selectedProductIds.length;

  const canSubmit = useMemo(() => {
    const toId = Number(recipientUserId);
    return (
      open &&
      !transferLoading &&
      count > 0 &&
      !!fromUserId &&
      !Number.isNaN(fromUserId) &&
      toId > 0 &&
      !Number.isNaN(toId)
    );
  }, [open, transferLoading, count, fromUserId, recipientUserId]);

  if (!open) return null;

  const close = () => {
    if (transferLoading) return;
    setRecipientUserId("");
    setTransferError(null);
    setTransferResults(null);
    onClose();
  };

  const handleConfirmTransfer = async () => {
    if (!fromUserId || Number.isNaN(fromUserId)) {
      setTransferError("Your userId is missing. Please login again.");
      return;
    }

    const toId = Number(recipientUserId);
    if (!toId || Number.isNaN(toId) || toId <= 0) {
      setTransferError("Please enter a valid Recipient User ID.");
      return;
    }

    if (selectedProductIds.length === 0) {
      setTransferError("No products selected.");
      return;
    }

    setTransferLoading(true);
    setTransferError(null);
    setTransferResults(null);

    try {
      const results: TransferResult[] = [];

      for (const productId of selectedProductIds) {
        try {
          const res = await axios.post(transferUrl, {
            from_user_id: fromUserId,
            to_user_id: toId,
            product_id: productId,
          });

          if (res.data?.success) {
            const exec = res.data?.data?.transactions?.execute;
            results.push({
              productId,
              ok: true,
              message: exec ? `Transferred ✅ (execute: ${exec})` : "Transferred ✅",
            });
          } else {
            results.push({
              productId,
              ok: false,
              message: res.data?.error || "Transfer failed",
            });
          }
        } catch (err: any) {
          results.push({
            productId,
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
      onTransferred?.(results);
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div style={overlay} onMouseDown={close}>
      <div style={card} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div style={header}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>
              Transfer {count} selected product(s) to another user.
            </p>
          </div>
          <button style={closeBtn} onClick={close} type="button" disabled={transferLoading}>
            ✕
          </button>
        </div>

        {count === 0 && (
          <div style={warn}>
            No products selected. Close this and select at least 1 product.
          </div>
        )}

        {transferError && <div style={errBox}>{transferError}</div>}

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Recipient User ID</div>
          <input
            style={input}
            value={recipientUserId}
            onChange={(e) => setRecipientUserId(e.target.value)}
            placeholder="e.g. 6"
            disabled={transferLoading}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Selected Products</div>
          <div style={box}>
            {selectedProductIds.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>No products selected.</div>
            ) : (
              selectedProductIds.map((id) => (
                <div key={id} style={row}>
                  Product ID: {id}
                </div>
              ))
            )}
          </div>
        </div>

        {transferResults && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Transfer Results</div>
            <div style={{ ...box, background: "white" }}>
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

        <div style={footer}>
          <button type="button" onClick={close} style={btnSecondary} disabled={transferLoading}>
            Close
          </button>

          <button
            type="button"
            onClick={() => void handleConfirmTransfer()}
            disabled={!canSubmit}
            style={{
              ...btnPrimary,
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {transferLoading ? "Transferring..." : "Confirm Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* styles */
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  zIndex: 9999,
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 620,
  background: "white",
  borderRadius: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  padding: 18,
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 14,
};

const closeBtn: React.CSSProperties = {
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

const box: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 10,
  background: "#f9fafb",
  maxHeight: 200,
  overflow: "auto",
};

const row: React.CSSProperties = {
  padding: "6px 0",
  borderBottom: "1px solid #eee",
  fontFamily: "monospace",
  fontSize: 13,
};

const footer: React.CSSProperties = {
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
  fontWeight: 700,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: 700,
};

const errBox: React.CSSProperties = {
  background: "#ffe6e6",
  color: "#a11",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 10,
};

const warn: React.CSSProperties = {
  background: "#fff7ed",
  color: "#9a3412",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 10,
};
