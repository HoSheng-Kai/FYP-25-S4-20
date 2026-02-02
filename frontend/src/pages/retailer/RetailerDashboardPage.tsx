import { useAuth } from "../../auth/AuthContext";
import NotificationsPanel from "../../components/notifications/NotificationsPanel";

export default function RetailerDashboardPage() {
  const { auth } = useAuth();

  if (auth.loading) return <div style={{ padding: 20 }}>Loading…</div>;
  if (!auth.user) return null;

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
