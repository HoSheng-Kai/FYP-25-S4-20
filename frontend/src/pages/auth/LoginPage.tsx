import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../../components/layout/AuthLayout";
import { USERS_API_BASE_URL } from "../../config/api";

type Role = "admin" | "manufacturer" | "distributor" | "retailer" | "consumer";

type LoginResponse = {
  success: boolean;
  otp: number;
  role?: Role;

  // ✅ add user id fields (backend might return either)
  userId?: number;
  userid?: number;

  error?: string;
  details?: string;
};

const isRole = (value: string | null): value is Role => {
  return (
    value === "admin" ||
    value === "manufacturer" ||
    value === "distributor" ||
    value === "retailer" ||
    value === "consumer"
  );
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [serverOtp, setServerOtp] = useState<number | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [role, setRole] = useState<Role | null>(null);

  // ✅ store userId between steps
  const [userId, setUserId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Auto redirect if already authenticated
  useEffect(() => {
    const existingRole = localStorage.getItem("userRole");
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

    if (isAuthenticated && isRole(existingRole)) {
      redirectByRole(existingRole);
    }
  }, []);

  // Central role-based routing
  const redirectByRole = (r: Role) => {
    switch (r) {
      case "admin":
        navigate("/AdminDashboardPage");
        break;
      case "manufacturer":
        navigate("/ManufacturerDashboardPage");
        break;
      case "distributor":
        navigate("/DistributorDashboardPage");
        break;
      case "retailer":
        navigate("/RetailerDashboardPage");
        break;
      case "consumer":
        navigate("/ConsumerDashboardPage");
        break;
      default:
        navigate("/");
    }
  };

  // Step 1 — credentials login
  const handleCredentialsSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await axios.post<LoginResponse>(
        `${USERS_API_BASE_URL}/login-account`,
        {
          username,
          password,
        }
      );

      if (!res.data.success) {
        setError(res.data.error || "Failed to login");
        return;
      }

      if (!res.data.role) {
        setError("Server did not return your role. Please try again.");
        return;
      }

      // ✅ capture userId if backend returns it
      const idFromServer = res.data.userId ?? res.data.userid ?? null;
      setUserId(idFromServer);

      setServerOtp(res.data.otp);
      setRole(res.data.role);

      localStorage.setItem("pendingRole", res.data.role);

      // ✅ store pending userId for OTP step (so refresh still works)
      if (idFromServer != null) {
        localStorage.setItem("pendingUserId", String(idFromServer));
      } else {
        localStorage.removeItem("pendingUserId");
      }

      setStep("otp");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "Invalid username or password"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 — OTP verification
  const handleOtpSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!serverOtp) {
      setError("No OTP found. Please login again.");
      setStep("credentials");
      return;
    }

    let finalRole: Role | null = role;

    if (!finalRole) {
      const stored = localStorage.getItem("pendingRole");
      if (stored) {
        finalRole = stored as Role;
        setRole(finalRole);
      }
    }

    if (!finalRole) {
      setError("User role not found. Please login again.");
      setStep("credentials");
      return;
    }

    // ✅ recover pending userId if state is lost
    let finalUserId: number | null = userId;
    if (finalUserId == null) {
      const storedUserId = localStorage.getItem("pendingUserId");
      finalUserId = storedUserId ? Number(storedUserId) : null;
      setUserId(finalUserId);
    }

    if (parseInt(otpInput, 10) === serverOtp) {
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("username", username);
      localStorage.setItem("userRole", finalRole);

      // ✅ IMPORTANT: store userId for NotificationBell + other pages
      if (finalUserId != null && !Number.isNaN(finalUserId)) {
        localStorage.setItem("userId", String(finalUserId));
      } else {
        // keep it clean so you can detect issues
        localStorage.removeItem("userId");
      }

      localStorage.removeItem("pendingRole");
      localStorage.removeItem("pendingUserId");

      redirectByRole(finalRole);
    } else {
      setError("Incorrect OTP. Please try again.");
    }
  };

  return (
    <AuthLayout>
      <div className="auth-panel">
        <div className="auth-tabs">
          <button className="auth-tab auth-tab-active">Login</button>
          <Link to="/register" className="auth-tab auth-tab-link">
            Register
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <div>
              <h2 className="auth-card-title">
                {step === "credentials" ? "Welcome back" : "Enter OTP"}
              </h2>
              <p className="auth-card-subtitle">
                {step === "credentials"
                  ? "Login to access your BlockTrace account."
                  : "We’ve sent a one-time password (OTP) to your email."}
              </p>
            </div>
            <div className="auth-info-icon">i</div>
          </div>

          {step === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="auth-form">
              <label className="auth-label">
                Username
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </label>

              <label className="auth-label">
                <div className="auth-label-row">
                  <span>Password</span>
                </div>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <div>
                  <button
                    type="button"
                    className="auth-link-button"
                    onClick={() =>
                      alert("Forgot password flow not implemented yet.")
                    }
                  >
                    Forgot password?
                  </button>
                </div>
              </label>

              {error && <p className="auth-error-text">{error}</p>}

              <button
                type="submit"
                className="auth-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging in..." : "Continue"}
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="auth-form">
              <label className="auth-label">
                OTP
                <input
                  className="auth-input"
                  type="number"
                  placeholder="Enter the OTP sent to your email"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  required
                />
              </label>

              {error && <p className="auth-error-text">{error}</p>}

              <button type="submit" className="auth-submit">
                Verify OTP
              </button>

              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setStep("credentials");
                  setOtpInput("");
                  setServerOtp(null);
                  setRole(null);
                  setUserId(null);
                  localStorage.removeItem("pendingRole");
                  localStorage.removeItem("pendingUserId");
                }}
              >
                Back to login
              </button>
            </form>
          )}

          {step === "credentials" && (
            <p className="auth-footer-text">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="auth-link">
                Register
              </Link>
            </p>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
