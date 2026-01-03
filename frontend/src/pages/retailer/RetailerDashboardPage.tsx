import React from "react";

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

      {/* Main content card */}
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
          <li>Scan product QR codes to verify authenticity</li>
          <li>List verified products for sale to consumers</li>
          <li>Manage your active marketplace listings</li>
          <li>Update product availability (available / sold)</li>
        </ul>
      </div>
    </div>
  );
}
