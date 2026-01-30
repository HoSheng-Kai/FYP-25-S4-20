import NotificationsPanel from "../../components/notifications/NotificationsPanel";
import { useAuth } from "../../auth/AuthContext";

export default function DistributorDashboardPage() {
  const { auth } = useAuth();

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
