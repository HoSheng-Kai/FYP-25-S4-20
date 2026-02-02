import { useEffect, useState } from "react";
import NotificationsPanel from "../../components/notifications/NotificationsPanel";
import { useAuth } from "../../auth/AuthContext";

export default function ConsumerDashboardPage() {
  const { auth } = useAuth();
  const username = auth.user?.username ?? "";

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
