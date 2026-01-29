import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../../components/layout/AuthLayout";
import { USERS_API_BASE_URL } from "../../config/api";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

type CreateAccountResponse = {
  success: boolean;
  error?: string;
  details?: string;
};

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { publicKey, connected } = useWallet();

  const walletPubkey = useMemo(
    () => (publicKey ? publicKey.toBase58() : null),
    [publicKey]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(
        "Password must be at least 8 characters and include at least 1 uppercase letter, 1 lowercase letter, and 1 number."
      );
      return;
    }

    // Optional but recommended: require wallet
    if (!connected || !walletPubkey) {
      setError("Please connect your Solana wallet to register.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await axios.post<CreateAccountResponse>(
        `${USERS_API_BASE_URL}/create-account`,
        {
          username,
          email,
          password,
          role_id: "consumer",
          public_key: walletPubkey, // ✅ send wallet pubkey
        }
      );

      if (!res.data.success) {
        setError(res.data.error || "Failed to create account");
        return;
      }

      setSuccess("Account created successfully. You can now log in.");
      setUsername("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "Failed to create account"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card">
        <div className="auth-tabs">
          <Link to="/login" className="auth-tab">
            Login
          </Link>
          <button className="auth-tab auth-tab-active">Register</button>
        </div>

        <div className="auth-card-header">
          <div>
            <h2 className="auth-card-title">Create an account</h2>
            <p className="auth-card-subtitle">Register to start using BlockTrace.</p>
          </div>
        </div>

        {/* ✅ Wallet connect */}
        <div style={{ marginBottom: 12 }}>
          <WalletMultiButton />
          {walletPubkey && (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
              Connected: {walletPubkey}
            </div>
          )}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Username
            <input
              className="auth-input"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="auth-label">
            Password
            <input
              className="auth-input"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <small className="auth-helper-text">
              Must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, and 1 number.
            </small>
          </label>

          {error && <p className="auth-error-text">{error}</p>}
          {success && (
            <p className="auth-success-text" style={{ color: "#16a34a" }}>
              {success}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
