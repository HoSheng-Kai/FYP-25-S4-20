import NotificationsPanel from "../../components/notifications/NotificationsPanel";

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


      </div>

      {/* Notifications */}
      <NotificationsPanel />
    </div>
  );
}
