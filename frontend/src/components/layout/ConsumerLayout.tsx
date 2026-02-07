// src/components/layout/ConsumerLayout.tsx
import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ROOT, NOTIFICATIONS_API_BASE_URL } from "../../config/api";
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

export default function ConsumerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  const [showCreateListing, setShowCreateListing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasPurchaseNotif, setHasPurchaseNotif] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  // Load unread chat count (poll)
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) return;

    const userId = auth.user.userId;
    let alive = true;

    const load = async () => {
      try {
        const res = await axios.get(`${API_ROOT}/chats/threads`, {
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

  // Load unread notifications for purchase requests (poll + SSE)
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) return;

    const userId = auth.user.userId;
    let alive = true;
    let es: EventSource | null = null;

    const loadUnread = async () => {
      try {
        const res = await axios.get<{ success: boolean; data?: any[] }>(
          `${NOTIFICATIONS_API_BASE_URL}`,
          { params: { userId, onlyUnread: true }, withCredentials: true }
        );

        if (!alive) return;

        if (res.data?.success && Array.isArray(res.data.data)) {
          const hasPurchase = res.data.data.some((n) =>
            typeof n.title === "string" && n.title.toLowerCase().includes("purchase")
          );
          setHasPurchaseNotif(hasPurchase);
        } else {
          setHasPurchaseNotif(false);
        }
      } catch {
        if (alive) setHasPurchaseNotif(false);
      }
    };

    loadUnread();
    const id = window.setInterval(loadUnread, 15000);

    try {
      es = new EventSource(`${NOTIFICATIONS_API_BASE_URL}/stream`, { withCredentials: true } as any);
      es.addEventListener("notification", () => {
        void loadUnread();
      });
    } catch {
      // ignore SSE setup errors
    }

    return () => {
      alive = false;
      window.clearInterval(id);
      if (es) es.close();
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
  if (!auth.user) return null;

  return (
    <div className="app-shell" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Mobile top bar (hidden on desktop via CSS) */}
      <div className="mobile-topbar">
        <button
          type="button"
          className="hamburger"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <div className="mobile-title">Consumer</div>
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
          height: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mobile close button (hidden on desktop via CSS) */}
        <button
          type="button"
          className="close-btn"
          aria-label="Close sidebar"
          onClick={closeSidebar}
        >
          ✕
        </button>

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
                to="scan-qr"
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Scan QR
              </NavLink>
            </li>

            <li>
              <NavLink
                to="my-products"
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                My Products
              </NavLink>
            </li>

            <li>
              <NavLink
                to="marketplace"
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Marketplace
              </NavLink>
            </li>

            <li>
              <NavLink
                to="purchase-requests"
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Purchase Requests
                  {hasPurchaseNotif && (
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
              <NavLink
                to="chats"
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
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
              <div
                onMouseEnter={() => setShowCreateListing(true)}
                onMouseLeave={() => setShowCreateListing(false)}
              >
                <NavLink
                  to="my-listings"
                  onClick={closeSidebar}
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
                    onClick={closeSidebar}
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
                to="reviews"
                onClick={closeSidebar}
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
            onClick={closeSidebar}
            style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
          >
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

      <main
        className="app-main"
        onClick={() => {
          if (sidebarOpen) closeSidebar();
        }}
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
