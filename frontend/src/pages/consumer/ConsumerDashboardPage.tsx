import NotificationBell from "../../components/notifications/NotificationBell";

export default function ConsumerDashboardPage() {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6 }}>Consumer Dashboard</h1>
          <p style={{ color: "#555", margin: 0 }}>
            Welcome! Use the sidebar to scan QR codes, browse the marketplace, and manage your listings.
          </p>
        </div>

        <NotificationBell />
      </div>

      {/* Main content */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Quick Actions</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#374151" }}>
          <li>Scan a product QR code to verify authenticity</li>
          <li>Browse the marketplace to view available products</li>
          <li>Manage your listings under “My Listings”</li>
        </ul>
      </div>
    </div>
  );
}
