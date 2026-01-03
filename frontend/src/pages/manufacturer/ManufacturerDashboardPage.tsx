import React from "react";

export default function ManufacturerDashboardPage() {
  return (
    <div>
      <h1 style={{ marginBottom: "10px" }}>Manufacturer Dashboard</h1>
      <p style={{ color: "#555", marginBottom: "22px" }}>
        Welcome! Use the sidebar to register products, manage your products, and verify authenticity.
      </p>

      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Quick Actions</h2>
        <ul style={{ paddingLeft: 18, color: "#374151", lineHeight: 1.8 }}>
          <li>Register new products and generate QR codes</li>
          <li>Manage your products (edit / view details)</li>
          <li>Scan QR codes to verify product authenticity</li>
        </ul>
      </div>
    </div>
  );
}
