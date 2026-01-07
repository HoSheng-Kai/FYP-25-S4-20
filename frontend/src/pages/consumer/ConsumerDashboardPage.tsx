import { useEffect, useState } from "react";
import NotificationsPanel from "../../components/notifications/NotificationsPanel";

export default function ConsumerDashboardPage() {
  const [username, setUsername] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedUserId = localStorage.getItem("userId");
    
    if (storedUsername) {
      setUsername(storedUsername);
    }
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

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
          <h1 style={{ marginBottom: 8, fontSize: "32px", color: "#111827" }}>
            Welcome{username ? `, ${username}` : ""}!
          </h1>
          <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>
            Use the sidebar to scan QR codes, browse the marketplace, and manage your listings.
          </p>
        </div>
      </div>

      {/* Notifications */}
      <NotificationsPanel />
    </div>
  );
}
