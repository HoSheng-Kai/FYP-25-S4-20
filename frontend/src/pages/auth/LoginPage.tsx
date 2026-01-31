import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../../components/layout/AuthLayout";
import { USERS_API_BASE_URL } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

type Role = "admin" | "manufacturer" | "distributor" | "retailer" | "consumer";

type LoginResponse = {
  success: boolean;
  tempAuthId?: string;
  error?: string;
  details?: string;
};

type ForgotPasswordResponse = {
  success: boolean;
  otp?: number;
  userId?: number;
  userid?: number;
  error?: string;
  details?: string;
};

const roleToRootPath = (r: Role) => {
  switch (r) {
    case "admin":
      return "/admin"; // if you don't have admin layout, change this
    case "manufacturer":
      return "/manufacturer";
    case "distributor":
      return "/distributor";
    case "retailer":
      return "/retailer";
    case "consumer":
      return "/consumer";
    default:
      return "/login";
  }
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [step, setStep] = useState<"credentials" | "otp" | "forgot-password" | "forgot-password-otp" | "forgot-password-reset">("credentials");

  // Forgot password state
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotServerOtp, setForgotServerOtp] = useState<number | null>(null);
  const [forgotUserId, setForgotUserId] = useState<number | null>(null);
  const [forgotOtpVerified, setForgotOtpVerified] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempAuthId, setTempAuthId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refresh, auth } = useAuth();
  // ----------------------------
  // Step 1 — credentials login
  // ----------------------------
  const handleCredentialsSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await axios.post<LoginResponse>(
        `${USERS_API_BASE_URL}/login-account`,
        { username, password },
        { withCredentials: true }
      );

      if (!res.data.success) {
        setError(res.data.error || "Invalid username");
        return;
      }

      if (!res.data.tempAuthId) {
        setError("Missing tempAuthId from server. Please try again.");
        return;
      }

      setTempAuthId(res.data.tempAuthId);
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

  // ----------------------------
  // Step 2 — OTP verification
  // ----------------------------
  const handleOtpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!tempAuthId) {
        setError("Session expired. Please login again.");
        setStep("credentials");
        return;
      }

      const res = await axios.post(
        `${USERS_API_BASE_URL}/verify-otp`,
        { tempAuthId, otp: otpInput },
        { withCredentials: true }
      );

      if (!res.data?.success) {
        setError(res.data?.error || "Invalid OTP");
        return;
      }

      await refresh();

      const me = await axios.get(`${USERS_API_BASE_URL}/me`, { withCredentials: true });
      const role = me.data.user.role as Role;

      navigate(roleToRootPath(role));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Invalid or expired OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------
  // Forgot Password — Step 1: Request OTP
  // ----------------------------
  const handleForgotPasswordRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await axios.post<ForgotPasswordResponse>(
        `${USERS_API_BASE_URL}/forgot-password`,
        { username: forgotUsername }
      );

      if (!res.data.success) {
        setError(res.data.error || "User not found");
        return;
      }

      const idFromServer = res.data.userId ?? res.data.userid ?? null;

      setForgotServerOtp(res.data.otp ?? null);
      setForgotUserId(idFromServer);
      setStep("forgot-password-otp");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "User not found"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------
  // Forgot Password — Step 2: Verify OTP
  // ----------------------------
  const handleForgotPasswordVerifyOtp = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!forgotServerOtp) {
      setError("No OTP found. Please try again.");
      setStep("forgot-password");
      return;
    }

    if (parseInt(forgotOtp, 10) !== forgotServerOtp) {
      setError("Incorrect OTP. Please try again.");
      return;
    }

    // OTP verified, move to password reset
    setForgotOtpVerified(true);
    setStep("forgot-password-reset");
  };

  // ----------------------------
  // Forgot Password — Step 3: Reset Password
  // ----------------------------
  const handleForgotPasswordReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!forgotOtpVerified) {
      setError("Please verify OTP first.");
      setIsSubmitting(false);
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(forgotNewPassword)) {
      setError("Password must be at least 8 characters and include at least 1 uppercase letter, 1 lowercase letter, and 1 number.");
      setIsSubmitting(false);
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    if (!forgotUserId) {
      setError("User ID not found. Please try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await axios.put(`${USERS_API_BASE_URL}/update-password`, {
        userId: forgotUserId,
        newPassword: forgotNewPassword,
      });

      if (res.data?.success) {
        setError(null);
        alert("Password reset successfully. You can now login with your new password.");
        setStep("credentials");
        setForgotUsername("");
        setForgotOtp("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setForgotServerOtp(null);
        setForgotUserId(null);
        setForgotOtpVerified(false);
      } else {
        setError(res.data?.error || "Failed to reset password.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
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
                {step === "credentials"
                  ? "Welcome back"
                  : step === "otp"
                  ? "Enter OTP"
                  : step === "forgot-password"
                  ? "Forgot Password"
                  : step === "forgot-password-otp"
                  ? "Verify OTP"
                  : "Reset Password"}
              </h2>
              <p className="auth-card-subtitle">
                {step === "credentials"
                  ? "Login to access your BlockTrace account."
                  : step === "otp"
                  ? "We've sent a one-time password (OTP) to your email."
                  : step === "forgot-password"
                  ? "Enter your username to reset your password."
                  : step === "forgot-password-otp"
                  ? "Enter the OTP sent to your email."
                  : "Enter your new password."}
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
                    onClick={() => {
                      setStep("forgot-password");
                      setError(null);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              </label>

              {error && <p className="auth-error-text">{error}</p>}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Continue"}
              </button>
            </form>
          )}

          {step === "forgot-password" && (
            <form onSubmit={handleForgotPasswordRequest} className="auth-form">
              <label className="auth-label">
                Username
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Enter your username"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  required
                />
              </label>

              {error && <p className="auth-error-text">{error}</p>}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending OTP..." : "Send OTP"}
              </button>

              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setStep("credentials");
                  setForgotUsername("");
                  setError(null);
                }}
              >
                Back to login
              </button>
            </form>
          )}

          {step === "forgot-password-otp" && (
            <form onSubmit={handleForgotPasswordVerifyOtp} className="auth-form">
              <label className="auth-label">
                OTP
                <input
                  className="auth-input"
                  type="number"
                  placeholder="Enter the OTP sent to your email"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
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
                  setStep("forgot-password");
                  setForgotOtp("");
                  setError(null);
                }}
              >
                Back
              </button>
            </form>
          )}

          {step === "forgot-password-reset" && (
            <form onSubmit={handleForgotPasswordReset} className="auth-form">
              <label className="auth-label">
                New Password
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Enter new password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  required
                />
                <small className="auth-helper-text">
                  Must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, and 1 number.
                </small>
              </label>

              <label className="auth-label">
                Confirm Password
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Confirm new password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  required
                />
              </label>

              {error && <p className="auth-error-text">{error}</p>}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setStep("credentials");
                  setForgotUsername("");
                  setForgotOtp("");
                  setForgotNewPassword("");
                  setForgotConfirmPassword("");
                  setForgotServerOtp(null);
                  setForgotUserId(null);
                  setForgotOtpVerified(false);
                  setError(null);
                }}
              >
                Back to login
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
                  setTempAuthId(null);
                  setError(null);
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
