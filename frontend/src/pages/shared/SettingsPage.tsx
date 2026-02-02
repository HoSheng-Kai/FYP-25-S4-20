import React, { useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { USERS_API_BASE_URL } from "../../config/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "../../auth/AuthContext";

export default function SettingsPage() {
  const { auth } = useAuth();
  const userId = useMemo(() => auth.user?.userId ?? null, [auth.user?.userId]);
  const { publicKey, connected } = useWallet();
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [walletSubmitting, setWalletSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (auth.loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!auth.user) return null;

  // Update Email
  const handleUpdateEmail = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!userId) return setError("Missing user. Please log in again.");
    if (!newEmail.trim()) return setError("Please enter a new email.");

    try {
      setEmailSubmitting(true);
      const res = await axios.put(
        `${USERS_API_BASE_URL}/update-email`,
        {
          userId,
          newEmail: newEmail.trim(),
        },
        { withCredentials: true }
      );

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
  // Update Password
  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!userId) return setError("Missing user. Please log in again.");

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
      const res = await axios.put(
        `${USERS_API_BASE_URL}/update-password`,
        {
          userId,
          newPassword,
        },
        { withCredentials: true }
      );

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

  // Update Wallet
  const handleUpdateWallet = async () => {
    resetMessages();

    if (!userId) return setError("Missing user. Please log in again.");
    if (!publicKey) return setError("Please connect your wallet first.");

    try {
      setWalletSubmitting(true);
      const res = await axios.put(
        `${USERS_API_BASE_URL}/update-public-key`,
        {
          userId,
          newPublicKey: publicKey.toBase58(),
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        setSuccess("Wallet public key updated successfully.");
      } else {
        setError(res.data?.error || "Failed to update public key.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update public key.");
    } finally {
      setWalletSubmitting(false);
    }
  };

  /* ===== Styles ===== */

  const pageStyle: React.CSSProperties = {
    padding: "24px 24px 24px 12px",
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

  const buttonStyle: React.CSSProperties = {
    marginTop: 14,
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
  };

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 6 }}>Settings</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Update your email, password, and wallet.
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
          <label style={{ display: "block", marginBottom: 8 }}>New Email</label>

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
              ...buttonStyle,
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
              ...buttonStyle,
              cursor: pwSubmitting ? "not-allowed" : "pointer",
              opacity: pwSubmitting ? 0.7 : 1,
            }}
          >
            {pwSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Update Wallet */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Update Wallet</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <WalletMultiButton />

          <button
            type="button"
            onClick={handleUpdateWallet}
            disabled={!connected || !publicKey || walletSubmitting}
            style={{
              ...buttonStyle,
              cursor:
                !connected || !publicKey || walletSubmitting
                  ? "not-allowed"
                  : "pointer",
              opacity:
                !connected || !publicKey || walletSubmitting ? 0.7 : 1,
            }}
          >
            {walletSubmitting ? "Updating..." : "Save Wallet"}
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 14, opacity: 0.85 }}>
          <div>
            <strong>Connected:</strong> {connected ? "Yes" : "No"}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Current wallet pubkey:</strong>
            <div
              style={{
                marginTop: 6,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "rgba(0,0,0,0.03)",
                wordBreak: "break-all",
              }}
            >
              {publicKey ? publicKey.toBase58() : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
