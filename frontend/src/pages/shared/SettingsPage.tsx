import React, { useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { USERS_API_BASE_URL } from "../../config/api";

/**
 * Tries common localStorage keys so this works even if your project
 * saved it under different names.
 */
function getUserIdFromStorage(): number | null {
  const candidates = ["userId"];
  for (const key of candidates) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export default function SettingsPage() {
  const userId = useMemo(() => getUserIdFromStorage(), []);

  // Email
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  // UI messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleUpdateEmail = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!userId) {
      setError("Missing userId. Please log in again.");
      return;
    }

    if (!newEmail.trim()) {
      setError("Please enter a new email.");
      return;
    }

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

    if (!userId) {
      setError("Missing userId. Please log in again.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
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

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ marginBottom: 6 }}>Settings</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Update your email and password.
      </p>

      {!userId && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            background: "rgba(255,0,0,0.08)",
          }}
        >
          <b>Warning:</b> No userId found in localStorage. If updates fail, log in
          again and ensure you store userId after login.
        </div>
      )}

      {(error || success) && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            background: error ? "rgba(255,0,0,0.10)" : "rgba(0,128,0,0.10)",
          }}
        >
          {error ? <span>{error}</span> : <span>{success}</span>}
        </div>
      )}

      {/* Update Email */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.12)",
        }}
      >
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
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
            }}
          />

          <button
            type="submit"
            disabled={emailSubmitting}
            style={{
              marginTop: 12,
              padding: "10px 14px",
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

      {/* Update Password */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.12)",
        }}
      >
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
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
            }}
          />

          <label style={{ display: "block", margin: "12px 0 8px" }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
            }}
          />

          <button
            type="submit"
            disabled={pwSubmitting}
            style={{
              marginTop: 12,
              padding: "10px 14px",
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
