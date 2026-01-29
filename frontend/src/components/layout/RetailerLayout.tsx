import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";

const USERS_API_BASE_URL = "http://34.177.85.28:3000/api/user";

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
  const [username, setUsername] = React.useState("");
  const [userRole, setUserRole] = React.useState("");

  React.useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedRole = localStorage.getItem("userRole");
    setUsername(storedUsername || "");
    setUserRole(storedRole || "");
  }, []);

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
        {/* User Info Section */}
        <div style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: 14,
          marginBottom: 24,
          borderLeft: "3px solid #3b82f6",
        }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Logged In As
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>
            @{username}
          </div>
        </div>

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

            <li>
              <NavLink
                to="reviews"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Reviews
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <NavLink
            to="settings"
            style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
          >
            ⚙ Settings
          </NavLink>
          
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
