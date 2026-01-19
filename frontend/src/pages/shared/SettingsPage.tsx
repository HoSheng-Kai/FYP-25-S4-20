import React, { useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { USERS_API_BASE_URL } from "../../config/api";

function getUserIdFromStorage(): number | null {
  const raw = localStorage.getItem("userId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function SettingsPage() {
  const userId = useMemo(() => getUserIdFromStorage(), []);

  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleUpdateEmail = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!userId) return setError("Missing userId. Please log in again.");
    if (!newEmail.trim()) return setError("Please enter a new email.");

    try {
      setEmailSubmitting(true);
      const res = await axios.put(`${USERS_API_BASE_URL}/update-email`, {
        userId,
        newEmail: newEmail.trim(),
      });

      if (res.data?.success) {
        setSuccess("Email updated successfully.");
        setNewEmail("");
      } else {
        setError(res.data?.error || "Failed to update email.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update email.");
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!userId) return setError("Missing userId. Please log in again.");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return setError(
        "Password must be at least 8 characters and include 1 uppercase, 1 lowercase, and 1 number."
      );
    }

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    try {
      setPwSubmitting(true);
      const res = await axios.put(`${USERS_API_BASE_URL}/update-password`, {
        userId,
        newPassword,
      });

      if (res.data?.success) {
        setSuccess("Password updated successfully.");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(res.data?.error || "Failed to update password.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update password.");
    } finally {
      setPwSubmitting(false);
    }
  };

  /* ===== Layout styles (left-flushed) ===== */

  const pageStyle: React.CSSProperties = {
    padding: "24px 24px 24px 12px", // ⬅ reduced left padding
    maxWidth: 760,
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    marginTop: 20,
    padding: 18,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    boxSizing: "border-box",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.18)",
    boxSizing: "border-box",
    display: "block",
  };

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 6 }}>Settings</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Update your email and password.
      </p>

      {(error || success) && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            background: error
              ? "rgba(255,0,0,0.10)"
              : "rgba(0,128,0,0.10)",
          }}
        >
          {error ?? success}
        </div>
      )}

      {/* Change Email */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Change Email</h2>
        <form onSubmit={handleUpdateEmail}>
          <label style={{ display: "block", marginBottom: 8 }}>
            New Email
          </label>

          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="name@example.com"
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={emailSubmitting}
            style={{
              marginTop: 14,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              cursor: emailSubmitting ? "not-allowed" : "pointer",
              opacity: emailSubmitting ? 0.7 : 1,
            }}
          >
            {emailSubmitting ? "Updating..." : "Update Email"}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Change Password</h2>
        <form onSubmit={handleUpdatePassword}>
          <label style={{ display: "block", marginBottom: 8 }}>
            New Password
          </label>

          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            style={inputStyle}
          />

          <label style={{ display: "block", margin: "12px 0 8px" }}>
            Confirm New Password
          </label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={pwSubmitting}
            style={{
              marginTop: 14,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              cursor: pwSubmitting ? "not-allowed" : "pointer",
              opacity: pwSubmitting ? 0.7 : 1,
            }}
          >
            {pwSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
