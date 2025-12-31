import { useEffect, useState } from "react";
import axios from "axios";
import { PRODUCTS_API_BASE_URL } from "../../config/api";
import "../../styles/transaction-history.css";

type Role =
  | "manufacturer"
  | "distributor"
  | "retailer"
  | "consumer"
  | "admin"
  | string;

type TransactionEventType = "manufactured" | "shipped" | "transferred" | "sold";

type TransactionEvent = {
  type: TransactionEventType;
  from: {
    user_id: number | null;
    username: string | null;
    role: Role | null;
  } | null;
  to: {
    user_id: number;
    username: string;
    role: Role;
  };
  dateTime: string; // ISO string
  location: string | null;
  txHash: string | null;
  blockSlot: number | null;
};

type ProductHistory = {
  product_id: number;
  serial_no: string;
  model: string | null;
  status: string;
  registered_on: string;
  registered_by: {
    user_id: number;
    username: string;
    role_id: string;
  } | null;
  events: TransactionEvent[];
};

type HistoryResponse = {
  success: boolean;
  data: ProductHistory;
  error?: string;
  details?: string;
};

type TransactionHistoryProps = {
  /** Product serial, e.g. "NIKE-AIR-001". If omitted, we show a placeholder message. */
  serial?: string;
};

export default function TransactionHistory({ serial }: TransactionHistoryProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ProductHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serial) {
      setHistory(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get<HistoryResponse>(
          `${PRODUCTS_API_BASE_URL}/history`,
          { params: { serial } }
        );

        if (!res.data.success) {
          setError(res.data.error || "Failed to load transaction history");
          setHistory(null);
          return;
        }

        setHistory(res.data.data);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.details ||
            "Failed to load transaction history"
        );
        setHistory(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [serial, PRODUCTS_API_BASE_URL]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  const formatRole = (role: Role | null) => {
    if (!role) return "-";
    const lower = String(role).toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const formatEventLabel = (type: TransactionEventType) => {
    switch (type) {
      case "manufactured":
        return "Manufactured / Registered";
      case "shipped":
        return "Shipped";
      case "transferred":
        return "Transferred";
      case "sold":
        return "Sold";
      default:
        return type;
    }
  };

  if (!serial) {
    return (
      <div className="tx-card">
        <p className="tx-muted">
          Scan or enter a product code to view its transaction history.
        </p>
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

  if (!history) {
    return (
      <div className="tx-card">
        <p className="tx-muted">No history found for this product.</p>
      </div>
    );
  }

  const { model, serial_no, status, registered_on, registered_by, events } =
    history;

  return (
    <div className="tx-wrapper">
      {/* Header card */}
      <div className="tx-header-card">
        <div>
          <h2 className="tx-product-title">{model || "Unknown Product"}</h2>
          <p className="tx-product-subtitle">
            Product ID: <span className="tx-mono">{serial_no}</span>
          </p>
          <p className="tx-product-meta">
            Registered on{" "}
            {registered_on ? formatDateTime(registered_on) : "Unknown"}
            {registered_by && (
              <>
                {" "}
                • Registered by{" "}
                <strong>{registered_by.username}</strong>{" "}
                ({formatRole(registered_by.role_id)})
              </>
            )}
          </p>
        </div>
        <div
          className={`tx-status-pill ${
            status === "verified"
              ? "tx-status-verified"
              : status === "suspicious"
              ? "tx-status-suspicious"
              : "tx-status-registered"
          }`}
        >
          {status}
        </div>
      </div>

      {/* Timeline */}
      <section className="tx-section">
        <h3 className="tx-section-title">Product Journey Timeline</h3>
        {events.length === 0 ? (
          <p className="tx-muted">No transaction events recorded.</p>
        ) : (
          <ol className="tx-timeline">
            {events.map((ev, index) => (
              <li key={`${ev.type}-${ev.dateTime}-${index}`} className="tx-step">
                <div
                  className={`tx-step-icon tx-step-icon-${
                    ev.type === "manufactured"
                      ? "blue"
                      : ev.type === "shipped"
                      ? "purple"
                      : ev.type === "sold"
                      ? "green"
                      : "gray"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="tx-step-content">
                  <div className="tx-step-header">
                    <span className="tx-step-title">
                      {formatEventLabel(ev.type)}
                    </span>
                    <span className="tx-step-step">Step {index + 1}</span>
                  </div>

                  <div className="tx-step-body">
                    <div className="tx-step-row">
                      <span className="tx-label">From</span>
                      <span className="tx-value">
                        {ev.from?.username
                          ? `${ev.from.username} (${formatRole(
                              ev.from.role
                            )})`
                          : "—"}
                      </span>
                    </div>
                    <div className="tx-step-row">
                      <span className="tx-label">To</span>
                      <span className="tx-value">
                        {ev.to.username} ({formatRole(ev.to.role)})
                      </span>
                    </div>
                    <div className="tx-step-row">
                      <span className="tx-label">Date / Time</span>
                      <span className="tx-value">
                        {formatDateTime(ev.dateTime)}
                      </span>
                    </div>
                    {ev.txHash && (
                      <div className="tx-step-row">
                        <span className="tx-label">Blockchain Tx</span>
                        <span className="tx-value tx-mono">
                          {ev.txHash}
                          {ev.blockSlot != null && ` · slot ${ev.blockSlot}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Table view */}
      <section className="tx-section">
        <h3 className="tx-section-title">Transaction Table View</h3>
        {events.length === 0 ? (
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
                  <tr key={`${ev.type}-${ev.dateTime}-${index}`}>
                    <td>{formatEventLabel(ev.type)}</td>
                    <td>
                      {ev.from?.username
                        ? `${ev.from.username} (${formatRole(ev.from.role)})`
                        : "—"}
                    </td>
                    <td>
                      {ev.to.username} ({formatRole(ev.to.role)})
                    </td>
                    <td>{formatDateTime(ev.dateTime)}</td>
                    <td className="tx-mono">
                      {ev.txHash
                        ? ev.blockSlot != null
                          ? `${ev.txHash} · slot ${ev.blockSlot}`
                          : ev.txHash
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
