// frontend/src/components/notifications/NotificationBell.tsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { NOTIFICATIONS_API_BASE_URL } from "../../config/api";

type NotificationRow = {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_on: string;
};

type NotificationsResponse = {
  success: boolean;
  data?: NotificationRow[];
  error?: string;
  details?: string;
};

type TabKey = "all" | "unread" | "read";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // We stored userId in localStorage at login
  const userId = useMemo(() => {
    const raw = localStorage.getItem("userId");
    return raw ? Number(raw) : null;
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const readCount = notifications.filter((n) => n.is_read).length;

  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") return notifications.filter((n) => !n.is_read);
    if (activeTab === "read") return notifications.filter((n) => n.is_read);
    return notifications;
  }, [notifications, activeTab]);

  const fetchNotifications = async () => {
    if (!userId) {
      setError("No user ID found. Please log in again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await axios.get<NotificationsResponse>(
        `${NOTIFICATIONS_API_BASE_URL}`,
        {
          params: {
            userId,
            // we fetch ALL, then filter client-side so the tabs stay in sync
            onlyUnread: false,
          },
        }
      );

      if (!res.data.success || !res.data.data) {
        setError(res.data.error || "Failed to load notifications.");
        setNotifications([]);
        return;
      }

      setNotifications(
        res.data.data.map((n) => ({
          ...n,
          created_on: new Date(n.created_on).toISOString(),
        }))
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "Failed to load notifications."
      );
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  // 🔥 Delete a single read notification
  const handleDelete = async (notificationId: number, isRead: boolean) => {
    if (!userId) return;
    if (!isRead) {
      // backend only allows deleting read notifications
      return;
    }

    setIsDeleting(notificationId);
    setError(null);

    try {
      await axios.delete(`${NOTIFICATIONS_API_BASE_URL}/${notificationId}`, {
        params: { userId },
      });

      // Remove from UI
      setNotifications((prev) =>
        prev.filter((n) => n.notification_id !== notificationId)
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "Failed to delete notification."
      );
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Bell button on the top-right of dashboard */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 8,
          borderRadius: 999,
        }}
        aria-label="Notifications"
      >
        <span style={{ fontSize: 20 }}>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: "#ef4444",
              color: "white",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 5px",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            right: 0,
            width: 420,
            maxHeight: 520,
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 18px 40px rgba(15,23,42,0.25)",
            padding: 16,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Notifications
            </h3>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 12,
                color: "#6b7280",
              }}
            >
              Stay updated with system activities and alerts.
            </p>
          </div>

          {/* Tabs: All / Unread / Read */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "#f3f4f6",
              borderRadius: 999,
              padding: 4,
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 999,
                padding: "6px 0",
                fontSize: 12,
                cursor: "pointer",
                background: activeTab === "all" ? "#ffffff" : "transparent",
                fontWeight: activeTab === "all" ? 600 : 400,
              }}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 999,
                padding: "6px 0",
                fontSize: 12,
                cursor: "pointer",
                background: activeTab === "unread" ? "#ffffff" : "transparent",
                fontWeight: activeTab === "unread" ? 600 : 400,
              }}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("read")}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 999,
                padding: "6px 0",
                fontSize: 12,
                cursor: "pointer",
                background: activeTab === "read" ? "#ffffff" : "transparent",
                fontWeight: activeTab === "read" ? 600 : 400,
              }}
            >
              Read ({readCount})
            </button>
          </div>

          <div
            style={{
              borderTop: "1px solid #e5e7eb",
              marginTop: 6,
              paddingTop: 8,
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            Notification Center
          </div>

          <div
            style={{
              marginTop: 8,
              overflowY: "auto",
              paddingRight: 4,
              flexGrow: 1,
            }}
          >
            {isLoading && (
              <p style={{ fontSize: 13, color: "#6b7280" }}>Loading...</p>
            )}

            {!isLoading && error && (
              <p style={{ fontSize: 13, color: "#b91c1c" }}>{error}</p>
            )}

            {!isLoading &&
              !error &&
              filteredNotifications.length === 0 && (
                <p style={{ fontSize: 13, color: "#6b7280" }}>
                  No notifications to display.
                </p>
              )}

            {!isLoading &&
              !error &&
              filteredNotifications.map((n) => {
                const isNew = !n.is_read;
                const bg = n.is_read ? "#f9fafb" : "#ecfdf3";
                const borderLeft = n.is_read ? "#e5e7eb" : "#22c55e";

                const deleting = isDeleting === n.notification_id;

                return (
                  <div
                    key={n.notification_id}
                    style={{
                      background: bg,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      borderLeft: `4px solid ${borderLeft}`,
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          {n.title}
                        </span>
                        {isNew && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 999,
                              background: "#ef4444",
                              color: "white",
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "#4b5563",
                        }}
                      >
                        {n.message}
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 11,
                          color: "#9ca3af",
                        }}
                      >
                        {formatDate(n.created_on)}
                      </p>
                    </div>

                    {/* Actions: checkmark + trash */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 6,
                      }}
                    >
                      {/* simple read indicator (no API change) */}
                      <span
                        title={n.is_read ? "Read" : "Unread"}
                        style={{
                          fontSize: 16,
                          color: n.is_read ? "#16a34a" : "#9ca3af",
                        }}
                      >
                        {n.is_read ? "✔" : "•"}
                      </span>

                      {/* delete button – only works if is_read === true */}
                      <button
                        type="button"
                        onClick={() =>
                          n.is_read &&
                          !deleting &&
                          void handleDelete(n.notification_id, n.is_read)
                        }
                        disabled={!n.is_read || deleting}
                        title={
                          n.is_read
                            ? "Delete this notification"
                            : "Only read notifications can be deleted"
                        }
                        style={{
                          border: "none",
                          background: "none",
                          cursor:
                            !n.is_read || deleting ? "not-allowed" : "pointer",
                          fontSize: 16,
                          color:
                            !n.is_read || deleting ? "#d1d5db" : "#ef4444",
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
