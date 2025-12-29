import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { USERS_API_BASE_URL } from "../../config/api";

export default function ManufacturerDashboardPage() {
  const navigate = useNavigate();

  // ---------- LOGOUT ----------
  const handleLogout = async () => {
    try {
      await axios.post(`${USERS_API_BASE_URL}/logout-account`);

      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("username");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");

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
          position: "relative",
        }}
      >
        <h2 style={{ marginBottom: "30px" }}>Manufacturer</h2>

        <nav className="sidebar-nav">
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: "20px" }}>
              <Link
                to="/QrInput"
                style={{ color: "white", textDecoration: "none" }}
              >
                Scan QR
              </Link>
            </li>
            <li style={{ marginBottom: "20px" }}>
              <Link
                to="/RegisterProductPage"
                style={{ color: "white", textDecoration: "none" }}
              >
                Register Product
              </Link>
            </li>

            <li style={{ marginBottom: "20px" }}>
              <Link
                to="/ManufacturerProductsPage"
                style={{ color: "white", textDecoration: "none" }}
              >
                My Products
              </Link>
            </li>
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
          <div style={{ marginBottom: "15px", cursor: "pointer" }}>⚙ Settings</div>

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
      <main
        style={{
          padding: "40px",
          flexGrow: 1,
          background: "#f5f7fb",
        }}
      >
        <h1 style={{ marginBottom: "10px" }}>Manufacturer Dashboard</h1>
        <p style={{ color: "#555", marginBottom: "22px" }}>
          Welcome! Use the sidebar to register products, manage your products,
          and verify authenticity.
        </p>
      </main>
    </div>
  );
}
