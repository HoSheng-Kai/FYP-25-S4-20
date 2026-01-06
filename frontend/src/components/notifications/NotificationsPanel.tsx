import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { NOTIFICATIONS_API_BASE_URL } from "../../config/api";

type ApiNotification = {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdOn: string;
  productId: number | null;
  txHash: string | null;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function getUserIdFromStorage(): number | null {
  const direct = localStorage.getItem("userId");
  if (direct && !Number.isNaN(Number(direct))) return Number(direct);

  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      const id = u?.user_id ?? u?.userId ?? u?.id;
      if (id && !Number.isNaN(Number(id))) return Number(id);
    } catch {
      // ignore
    }
  }
  return null;
}

export default function NotificationsPanel(props: {
  title?: string;
  defaultOnlyUnread?: boolean;
  showHeader?: boolean;
}) {
  const { title = "Notifications", defaultOnlyUnread = true, showHeader = true } = props;

  const userId = useMemo(() => getUserIdFromStorage(), []);

  const [onlyUnread, setOnlyUnread] = useState(defaultOnlyUnread);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ApiNotification[]>([]);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  async function fetchNotifications(nextOnlyUnread = onlyUnread) {
    if (!userId) {
      setError("No userId found. Store userId in localStorage or update getUserIdFromStorage().");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(NOTIFICATIONS_API_BASE_URL, {
        params: { userId, onlyUnread: nextOnlyUnread },
      });
      setItems(res.data?.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications(onlyUnread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnread]);

  async function markOneRead(notificationId: number) {
    if (!userId) return;

    setBusyId(notificationId);
    setError(null);

    // optimistic
    setItems((prev) => prev.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n)));

    try {
      await axios.put(`${NOTIFICATIONS_API_BASE_URL}/${notificationId}/read`, null, { params: { userId } });

      if (onlyUnread) {
        setItems((prev) => prev.filter((n) => n.notificationId !== notificationId));
      }
    } catch (e: any) {
      setItems((prev) => prev.map((n) => (n.notificationId === notificationId ? { ...n, isRead: false } : n)));
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to mark as read");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!userId) return;

    setLoading(true);
    setError(null);

    // optimistic
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await axios.put(`${NOTIFICATIONS_API_BASE_URL}/read`, null, { params: { userId } });
      if (onlyUnread) setItems([]);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to mark all as read");
      await fetchNotifications(onlyUnread);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAllRead() {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      await axios.delete(`${NOTIFICATIONS_API_BASE_URL}/read`, { params: { userId } });
      setItems((prev) => prev.filter((n) => !n.isRead));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to delete read notifications");
    } finally {
      setLoading(false);
    }
  }

  async function deleteOneRead(notificationId: number) {
    if (!userId) return;

    setBusyId(notificationId);
    setError(null);

    const snapshot = items;
    setItems((prev) => prev.filter((n) => n.notificationId !== notificationId));

    try {
      await axios.delete(`${NOTIFICATIONS_API_BASE_URL}/${notificationId}`, { params: { userId } });
    } catch (e: any) {
      setItems(snapshot);
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to delete notification");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 24,
        marginBottom: 18,
      }}
    >
      {showHeader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <span
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 999,
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                color: "#111827",
              }}
            >
              Unread: {unreadCount}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setOnlyUnread(true)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: onlyUnread ? "#111827" : "white",
                  color: onlyUnread ? "white" : "#111827",
                  cursor: "pointer",
                }}
              >
                Unread
              </button>
              <button
                onClick={() => setOnlyUnread(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: !onlyUnread ? "#111827" : "white",
                  color: !onlyUnread ? "white" : "#111827",
                  cursor: "pointer",
                }}
              >
                All
              </button>
            </div>

            <button
              onClick={() => fetchNotifications(onlyUnread)}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Refresh
            </button>

            <button
              onClick={markAllRead}
              disabled={loading || items.length === 0}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: loading || items.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Mark all read
            </button>

            <button
              onClick={deleteAllRead}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: loading ? "not-allowed" : "pointer",
              }}
              title="Deletes all read notifications"
            >
              Delete read
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ color: "#6b7280" }}>Loading notifications...</div>
        ) : items.length === 0 ? (
          <div style={{ color: "#6b7280" }}>{onlyUnread ? "No unread notifications 🎉" : "No notifications."}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((n) => (
              <div
                key={n.notificationId}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 14,
                  background: n.isRead ? "#ffffff" : "#f9fafb",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{n.title}</div>
                      {!n.isRead && (
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#111827",
                            color: "white",
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>

                    <div style={{ color: "#4b5563", marginTop: 6, lineHeight: 1.5 }}>{n.message}</div>

                    <div style={{ color: "#6b7280", fontSize: 12, marginTop: 10 }}>
                      {formatWhen(n.createdOn)}
                      {n.productId ? <span> • Product #{n.productId}</span> : null}
                      {n.txHash ? <span> • Tx: {n.txHash}</span> : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {!n.isRead && (
                      <button
                        onClick={() => markOneRead(n.notificationId)}
                        disabled={busyId === n.notificationId}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "white",
                          cursor: busyId === n.notificationId ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Mark read
                      </button>
                    )}

                    {n.isRead && (
                      <button
                        onClick={() => deleteOneRead(n.notificationId)}
                        disabled={busyId === n.notificationId}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "white",
                          cursor: busyId === n.notificationId ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title="Only works if the notification is already read"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
