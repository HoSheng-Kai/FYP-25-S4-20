import { useNavigate } from "react-router-dom";
import axios from "axios";
import { USERS_API_BASE_URL } from "../../../../backend/src/config/api";

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Call backend logout (optional, since backend returns true)
      await axios.post(`${USERS_API_BASE_URL}/logout-account`);

      // Clear all login/session data
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("username");
      localStorage.removeItem("userRole");

      // Redirect to login page
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="dashboard-container" style={{ display: "flex" }}>
      {/* =======================
          SIDEBAR NAVIGATION
      ======================== */}
      <aside
        className="sidebar"
        style={{
          width: "240px",
          background: "#0d1b2a",
          color: "white",
          padding: "20px",
          minHeight: "100vh",
        }}
      >
        <h2 style={{ marginBottom: "30px" }}>Consumer</h2>

        <nav className="sidebar-nav">
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: "20px" }}>📦 My Purchases</li>
            <li style={{ marginBottom: "20px" }}>🔍 Authenticate Product</li>
            <li style={{ marginBottom: "20px" }}>⭐ Reviews</li>
            <li style={{ marginBottom: "20px" }}>⚠ Counterfeit Alerts</li>
          </ul>
        </nav>

        {/* =======================
            SETTINGS + LOGOUT
        ======================== */}
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "20px",
            right: "20px",
          }}
        >
          <div style={{ marginBottom: "15px", cursor: "pointer" }}>
            ⚙ Settings
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ➜ Logout
          </button>
        </div>
      </aside>

      {/* =======================
          MAIN DASHBOARD CONTENT
      ======================== */}
      <main style={{ padding: "40px", flexGrow: 1 }}>
        <h1>Admin Dashboard</h1>

        <p>Welcome to your admin dashboard.</p>
      </main>
    </div>
  );
}
