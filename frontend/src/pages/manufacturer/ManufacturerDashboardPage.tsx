import NotificationsPanel from "../../components/notifications/NotificationsPanel";

export default function ManufacturerDashboardPage() {
  return (
    <div>
      <h1 style={{ marginBottom: "10px" }}>Manufacturer Dashboard</h1>
      <p style={{ color: "#555", marginBottom: "22px" }}>
        Welcome! Use the sidebar to register products, manage your products, and verify authenticity.
      </p>

      {/* Notifications */}
      <NotificationsPanel />
    </div>
  );
}
