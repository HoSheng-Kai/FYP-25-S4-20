import NotificationsPanel from "../../components/notifications/NotificationsPanel";

export default function RetailerDashboardPage() {
  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 6 }}>Retailer Dashboard</h1>
        <p style={{ color: "#555", margin: 0 }}>
          Manage products for sale, verify authenticity, and handle consumer transactions.
        </p>
      </div>

      {/* Notifications */}
      <NotificationsPanel />

    </div>
  );
}
