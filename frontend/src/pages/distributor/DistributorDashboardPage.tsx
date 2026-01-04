// src/pages/distributor/DistributorDashboardPage.tsx
// -----------------------------------------------------------------------------
// Distributor dashboard OVERVIEW page.
// - No sidebar here (DistributorLayout owns the sidebar)
// - This page describes what the distributor does
// -----------------------------------------------------------------------------

import NotificationBell from "../../components/notifications/NotificationBell";

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

        <NotificationBell />
      </div>

      {/* Overview card */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>What you can do here</h2>

        <ul style={{ paddingLeft: 18, color: "#374151", lineHeight: 1.8, margin: 0 }}>
          <li>Scan a product QR code to verify authenticity</li>
          <li>Look up a product using serial number verification</li>
          <li>Transfer ownership of products to retailers (blockchain update)</li>
          <li>Add shipping/transfer notes for traceability</li>
        </ul>

        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1f2937",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <b>Tip:</b> Use the sidebar “Transfer Ownership” tab when you are ready to complete a handoff
          to a retailer.
        </div>
      </div>
    </div>
  );
}
