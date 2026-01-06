import NotificationsPanel from "../../components/notifications/NotificationsPanel";

export default function DistributorDashboardPage() {
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
          <h1 style={{ marginBottom: 6 }}>Distributor Dashboard</h1>
          <p style={{ color: "#555", margin: 0 }}>
            Manage supply chain transfers and verify products before handing them to retailers.
          </p>
      </div>
    </div>

      {/* Notifications */}
      <NotificationsPanel />

    </div>
  );
}
