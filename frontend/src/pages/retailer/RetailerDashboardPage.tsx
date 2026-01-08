import { useEffect, useState } from "react";
import NotificationsPanel from "../../components/notifications/NotificationsPanel";

export default function RetailerDashboardPage() {
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) setUsername(storedUsername);
  }, []);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8, fontSize: 32, color: "#111827" }}>
          Welcome{username ? `, ${username}` : ""}!
        </h1>
        <p style={{ color: "#6b7280", margin: 0, fontSize: 14 }}>
          Manage products for sale, verify authenticity, and handle consumer transactions.
        </p>
      </div>

      {/* Notifications */}
      <NotificationsPanel />
    </div>
  );
}
