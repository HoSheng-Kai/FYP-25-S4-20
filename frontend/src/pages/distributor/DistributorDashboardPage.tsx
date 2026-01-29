import { useEffect, useState } from "react";
import NotificationsPanel from "../../components/notifications/NotificationsPanel";

export default function DistributorDashboardPage() {
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
      </div>

      {/* Notifications */}
      <NotificationsPanel />
    </div>
  );
}
