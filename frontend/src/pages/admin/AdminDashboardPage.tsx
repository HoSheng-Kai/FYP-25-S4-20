import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { ADMIN_API_BASE_URL } from "../../config/api";
import NotificationsPanel from "../../components/notifications/NotificationsPanel";
import { useAuth } from "../../auth/AuthContext";

interface DashboardStats {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  totalListings: number;
}

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

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const username = auth.user?.username ?? "";
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
    totalListings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const [usersRes, listingsRes] = await Promise.all([
        axios.get(`${ADMIN_API_BASE_URL}/view-accounts`, { withCredentials: true }),
        axios.get(`${ADMIN_API_BASE_URL}/read-product-listings`, { withCredentials: true }),
      ]);

      const users = usersRes.data.data || [];
      const listings = listingsRes.data.listings || [];

      setStats({
        totalUsers: users.length,
        verifiedUsers: users.filter((u: any) => u.verified).length,
        unverifiedUsers: users.filter((u: any) => !u.verified).length,
        totalListings: listings.length,
      });
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      navigate("/login");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: 240,
          background: "#0d1b2a",
          color: "white",
          padding: 20,
          position: "relative",
        }}
      >
        <h2 style={{ marginBottom: 30 }}>Admin</h2>

        <nav>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <li>
              <NavLink
                to="/admin"
                end
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/users"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                User Management
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/listings"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Product Listings
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/register"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Register Company
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ position: "absolute", bottom: 30, left: 20, right: 20 }}>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
            }}
          >
            ➜ Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ padding: 40, flexGrow: 1, background: "#f9fafb" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ marginBottom: 8, fontSize: 32, color: "#111827" }}>
            Welcome{username ? `, ${username}` : ""}!
          </h1>
          <p style={{ color: "#6b7280", fontSize: 15 }}>
            Admin Dashboard - Manage users and product listings
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div
              style={{
                marginTop: 32,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 24,
              }}
            >
            {/* Total Users Card */}
            <div
              style={{
                background: "white",
                padding: 24,
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                Total Users
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#111827" }}>
                {stats.totalUsers}
              </div>
            </div>

            {/* Verified Users Card */}
            <div
              style={{
                background: "white",
                padding: 24,
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                Verified Users
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#10b981" }}>
                {stats.verifiedUsers}
              </div>
            </div>

            {/* Unverified Users Card */}
            <div
              style={{
                background: "white",
                padding: 24,
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                Unverified Users
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#f59e0b" }}>
                {stats.unverifiedUsers}
              </div>
            </div>

            {/* Total Listings Card */}
            <div
              style={{
                background: "white",
                padding: 24,
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
                Product Listings
              </div>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#3b82f6" }}>
                {stats.totalListings}
              </div>
            </div>
            </div>

            {/* Notifications */}
            <div style={{ marginTop: 40 }}>
              <NotificationsPanel isAdmin={true} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
