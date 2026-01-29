import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { PRODUCTS_API_BASE_URL } from "../../config/api";
import "../../styles/transaction-history.css";

type HistoryUser = {
  userId: number;
  username: string;
  publicKey: string;
};

type HistoryItem = {
  txHash: string;
  prevTxHash: string | null;
  event: "TRANSFER" | "MINT" | "REGISTER" | string;
  blockSlot: number | null;
  createdOn: string; // ISO
  from: HistoryUser | null;
  to: HistoryUser | null;
};

type HistoryProduct = {
  productId: number;
  serialNo: string;
  productName: string | null;
  productPda: string | null;
  txHash: string | null;
};

type HistoryResponse = {
  success: boolean;
  data?: {
    product: HistoryProduct;
    history: HistoryItem[];
  };
  error?: string;
  details?: string;
};

type TransactionHistoryProps = {
  serial?: string;
  hideHeader?: boolean;
  defaultView?: "timeline" | "table";
  embedded?: boolean;
};

const safeDateTime = (iso?: string | null) => {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
};

const labelForEvent = (ev: string) => {
  const e = (ev || "").toUpperCase();
  if (e === "TRANSFER") return "Transferred";
  if (e === "MINT") return "Minted";
  if (e === "REGISTER") return "Registered";
  return ev;
};

export default function TransactionHistory({
  serial,
  hideHeader = false,
  defaultView = "timeline",
  embedded = false,
}: TransactionHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<HistoryResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"timeline" | "table">(defaultView);

  // If parent changes defaultView, reflect it (nice-to-have)
  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  useEffect(() => {
    if (!serial) {
      setPayload(null);
      setError(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get<HistoryResponse>(`${PRODUCTS_API_BASE_URL}/history`, {
          params: { serial },
        });

        if (!res.data.success || !res.data.data) {
          setError(res.data.details || res.data.error || "Failed to load transaction history");
          setPayload(null);
          return;
        }

        setPayload(res.data.data);
      } catch (err: any) {
        setError(
          err?.response?.data?.details ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load transaction history"
        );
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [serial]);

  const product = payload?.product ?? null;

  // normalize to timeline items used by UI
  const events = useMemo(() => {
    const raw = payload?.history;
    if (!Array.isArray(raw)) return [];

    return raw.map((h) => ({
      type: labelForEvent(h.event),
      from: h.from ? h.from.username : null,
      to: h.to ? h.to.username : null,
      dateTime: h.createdOn,
      txHash: h.txHash,
      blockSlot: h.blockSlot,
    }));
  }, [payload]);

  if (!serial) {
    return (
      <div className="tx-card">
        <p className="tx-muted">Scan or enter a product code to view its transaction history.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tx-card">
        <p className="tx-muted">Loading transaction history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tx-card">
        <p className="tx-error">{error}</p>
      </div>
    );
  }

  if (!payload || !product) {
    return (
      <div className="tx-card">
        <p className="tx-muted">No history found for this product.</p>
      </div>
    );
  }

  return (
    <div className={embedded ? "tx-embedded" : "tx-wrapper"}>
      {/* Header card (optional) */}
      {!hideHeader && (
        <div className="tx-header-card">
          <div>
            <h2 className="tx-product-title">{product.productName || "Unknown Product"}</h2>
            <p className="tx-product-subtitle">
              Serial: <span className="tx-mono">{product.serialNo}</span>
            </p>
            <p className="tx-product-meta">
              Blockchain Tx: <span className="tx-mono">{product.txHash ?? "—"}</span>
            </p>
          </div>

          <div className="tx-status-pill tx-status-registered">On-chain</div>
        </div>
      )}

      {/* One section with toggle like your screenshot */}
      <section className="tx-section">
        <div className="tx-section-head">
          <h3 className="tx-section-title">Product Journey Timeline</h3>

          <div className="tx-toggle-group">
            <button
              className={`tx-toggle ${view === "timeline" ? "tx-toggle-active" : ""}`}
              onClick={() => setView("timeline")}
            >
              Timeline View
            </button>

            <button
              className={`tx-toggle ${view === "table" ? "tx-toggle-active" : ""}`}
              onClick={() => setView("table")}
            >
              Table View
            </button>
          </div>
        </div>

        {/* Timeline View */}
        {view === "timeline" ? (
          events.length === 0 ? (
            <p className="tx-muted">No transaction events recorded.</p>
          ) : (
            <ol className="tx-timeline">
              {events.map((ev, index) => (
                <li key={`${ev.txHash}-${index}`} className="tx-step">
                  <div className="tx-step-icon tx-step-icon-gray">{index + 1}</div>

                  <div className="tx-step-content">
                    <div className="tx-step-header">
                      <span className="tx-step-title">{ev.type}</span>
                      <span className="tx-step-step">Step {index + 1}</span>
                    </div>

                    <div className="tx-step-body">
                      <div className="tx-step-row">
                        <span className="tx-label">From</span>
                        <span className="tx-value">{ev.from ?? "—"}</span>
                      </div>

                      <div className="tx-step-row">
                        <span className="tx-label">To</span>
                        <span className="tx-value">{ev.to ?? "—"}</span>
                      </div>

                      <div className="tx-step-row">
                        <span className="tx-label">Date / Time</span>
                        <span className="tx-value">{safeDateTime(ev.dateTime)}</span>
                      </div>

                      <div className="tx-step-row">
                        <span className="tx-label">Blockchain Tx</span>
                        <span className="tx-value tx-mono">
                          {ev.txHash}
                          {ev.blockSlot != null && ` · slot ${ev.blockSlot}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )
        ) : (
          /* Table View */
          events.length === 0 ? (
            <p className="tx-muted">No transactions to display.</p>
          ) : (
            <div className="tx-table-wrapper">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Date / Time</th>
                    <th>Blockchain Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, index) => (
                    <tr key={`${ev.txHash}-${index}`}>
                      <td>{ev.type}</td>
                      <td>{ev.from ?? "—"}</td>
                      <td>{ev.to ?? "—"}</td>
                      <td>{safeDateTime(ev.dateTime)}</td>
                      <td className="tx-mono">
                        {ev.txHash}
                        {ev.blockSlot != null && ` · slot ${ev.blockSlot}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>
    </div>
  );
}
