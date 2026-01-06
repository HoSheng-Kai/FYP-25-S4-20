import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";

const USERS_API_BASE_URL = "http://localhost:3000/api/user";

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

export default function RetailerLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${USERS_API_BASE_URL}/logout-account`);
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("username");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      navigate("/login");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          background: "#0d1b2a",
          color: "white",
          padding: 20,
          height: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 style={{ marginBottom: 30 }}>Retailer</h2>

        <nav>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <li>
              <NavLink
                to=""
                end
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Dashboard
              </NavLink>
            </li>

            <li>
              <NavLink
                to="scan-qr"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Scan QR
              </NavLink>
            </li>

            <li>
              <NavLink
                to="products"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                My Products
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16 }}>
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

      <main
        style={{
          flexGrow: 1,
          background: "#f5f7fb",
          padding: 40,
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
