// src/components/layout/ConsumerLayout.tsx
// -----------------------------------------------------------------------------
// Consumer layout with persistent sidebar.
// All routes nested under /consumer/* render inside <Outlet />.
// Sidebar links are RELATIVE so navigation stays within /consumer.
// -----------------------------------------------------------------------------

import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";

const USERS_API_BASE_URL = "http://localhost:3000/api/users";

const linkBaseStyle: React.CSSProperties = {
  color: "white",
  textDecoration: "none",
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
};

const activeStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)",
};

export default function ConsumerLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${USERS_API_BASE_URL}/logout-account`);
    } catch {
      // ignore backend failure
    } finally {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("username");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      navigate("/login");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          background: "#0d1b2a",
          color: "white",
          padding: 20,
          position: "relative",
        }}
      >
        <h2 style={{ marginBottom: 30 }}>Consumer</h2>

        <nav>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <li>
              <NavLink
                to="" // /consumer
                end
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Dashboard
              </NavLink>
            </li>

            <li>
              <NavLink
                to="scan-qr" // /consumer/scan-qr
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Scan QR
              </NavLink>
            </li>

            <li>
              <NavLink
                to="my-products" // /consumer/my-products
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                My Products
              </NavLink>
            </li>

            <li>
              <NavLink
                to="marketplace" // /consumer/marketplace
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Marketplace
              </NavLink>
            </li>

            <li>
              <NavLink
                to="my-listings" // /consumer/my-listings
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                My Listings
              </NavLink>
            </li>

            <li>
              <NavLink
                to="create-listing" // /consumer/create-listing
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                + Create Listing
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ position: "absolute", bottom: 30, left: 20, right: 20 }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              background: "none",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white",
              padding: "10px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            ➜ Logout
          </button>
        </div>
      </aside>

      <main style={{ flexGrow: 1, background: "#f5f7fb", padding: 40 }}>
        <Outlet />
      </main>
    </div>
  );
}
