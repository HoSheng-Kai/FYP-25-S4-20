import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

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

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  if (auth.loading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!auth.user) return null;

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button
          type="button"
          className="hamburger"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <div className="mobile-title">Admin</div>
      </div>

      {/* Backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          role="button"
          aria-label="Close sidebar"
          tabIndex={0}
          onClick={closeSidebar}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") closeSidebar();
          }}
        />
      )}

      <aside
        className={`app-sidebar ${sidebarOpen ? "open" : ""}`}
        style={{
          width: 240,
          flexShrink: 0,
          background: "#0d1b2a",
          color: "white",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Mobile close button */}
        <button
          type="button"
          className="close-btn"
          aria-label="Close sidebar"
          onClick={closeSidebar}
        >
          ✕
        </button>

        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 24,
            borderLeft: "3px solid #3b82f6",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Logged In As
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>
            @{auth.user.username}
          </div>
        </div>

        <h2 style={{ marginBottom: 30 }}>Admin</h2>

        <nav className="app-nav">
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <li>
              <NavLink
                to=""
                end
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="users"
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                User Management
              </NavLink>
            </li>
            <li>
              <NavLink
                to="listings"
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Product Listings
              </NavLink>
            </li>
            <li>
              <NavLink
                to="register"
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Register Company
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <button
            onClick={() => void handleLogout()}
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
        className="app-main"
        onClick={() => {
          if (sidebarOpen) closeSidebar();
        }}
        style={{
          flexGrow: 1,
          background: "#f9fafb",
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
