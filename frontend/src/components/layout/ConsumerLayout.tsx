// src/components/layout/ConsumerLayout.tsx
import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

const CHATS_API_BASE_URL = `${API_ROOT}/chats`;

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
  const { auth, logout } = useAuth();

  const [showCreateListing, setShowCreateListing] = React.useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread chat count (poll)
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) return;

    const userId = auth.user.userId;
    let alive = true;

    const load = async () => {
      try {
        const res = await axios.get(`${CHATS_API_BASE_URL}/threads`, {
          params: { userId },
          withCredentials: true,
        });

        if (!alive) return;

        if (res.data?.success && Array.isArray(res.data.threads)) {
          const total = res.data.threads.reduce(
            (sum: number, t: any) => sum + (t.unread_count || 0),
            0
          );
          setUnreadCount(total);
        }
      } catch {
        // ignore
      }
    };

    load();
    const id = window.setInterval(load, 10000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [auth.loading, auth.user?.userId]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  if (auth.loading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!auth.user) return null; // RequireAuth will redirect

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
        {/* User Info Section */}
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

        <h2 style={{ marginBottom: 30 }}>Consumer</h2>

        <nav>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <li>
              <NavLink to="" end style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
                Dashboard
              </NavLink>
            </li>

            <li>
              <NavLink to="scan-qr" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
                Scan QR
              </NavLink>
            </li>

            <li>
              <NavLink to="my-products" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
                My Products
              </NavLink>
            </li>

            <li>
              <NavLink to="marketplace" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
                Marketplace
              </NavLink>
            </li>

            <li>
              <NavLink to="chats" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Messages
                  {unreadCount > 0 && (
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#ef4444",
                        display: "inline-block",
                      }}
                    />
                  )}
                </span>
              </NavLink>
            </li>

            <li>
              <div onMouseEnter={() => setShowCreateListing(true)} onMouseLeave={() => setShowCreateListing(false)}>
                <NavLink
                  to="my-listings"
                  style={({ isActive }) => ({
                    ...linkBaseStyle,
                    ...(isActive ? activeStyle : {}),
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  })}
                >
                  <span>My Listings</span>
                  <span
                    style={{
                      fontSize: "12px",
                      transition: "transform 0.2s",
                      transform: showCreateListing ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  >
                    ▶
                  </span>
                </NavLink>

                {showCreateListing && (
                  <NavLink
                    to="create-listing"
                    style={({ isActive }) => ({
                      ...linkBaseStyle,
                      paddingLeft: 24,
                      fontSize: 14,
                      ...(isActive ? activeStyle : {}),
                    })}
                  >
                    + Create Listing
                  </NavLink>
                )}
              </div>
            </li>

            <li>
              <NavLink
                to="transfer-ownership"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Transfer Ownership
              </NavLink>
            </li>

            <li>
              <NavLink to="reviews" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
                Reviews
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ position: "absolute", bottom: 30, left: 20, right: 20 }}>
          <NavLink to="settings" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
            ⚙ Settings
          </NavLink>

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

      <main style={{ flexGrow: 1, background: "#f5f7fb", padding: 40 }}>
        <Outlet />
      </main>
    </div>
  );
}
