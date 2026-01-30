import { useEffect } from "react";
import NotificationsPanel from "../../components/notifications/NotificationsPanel";
import { useAuth } from "../../auth/AuthContext";

export default function ManufacturerDashboardPage() {
  const { auth, refresh } = useAuth();

  useEffect(() => {
    // optional: ensure /users/me is loaded on this page
    if (!auth.loading && !auth.user) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (auth.loading) return <p style={{ padding: 20 }}>Loading…</p>;
  if (!auth.user) return <p style={{ padding: 20 }}>Not logged in.</p>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8, fontSize: 32, color: "#111827" }}>
          Welcome{auth.user.username ? `, ${auth.user.username}` : ""}!
        </h1>
      </div>
      <NotificationsPanel />
    </div>
  );
}
