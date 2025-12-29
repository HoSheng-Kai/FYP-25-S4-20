import type { FormEvent } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AuthLayout from "../../components/layout/AuthLayout";
import { USERS_API_BASE_URL } from "../../config/api";

type Role = "admin" | "manufacturer" | "distributor" | "retailer" | "consumer";

type CreateAccountResponse = {
  success: boolean;
  error?: string;
  details?: string;
};

const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: "Admin", value: "admin" },
  { label: "Manufacturer", value: "manufacturer" },
  { label: "Distributor", value: "distributor" },
  { label: "Retailer", value: "retailer" },
  { label: "Consumer", value: "consumer" },
];

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("consumer");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await axios.post<CreateAccountResponse>(
        `${USERS_API_BASE_URL}/create-account`,
        {
          username,
          email,
          password,
          role_id: role, // 👈 send lowercase value that matches DB
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
      setRole("consumer");
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
            <p className="auth-card-subtitle">
              Register to start using BlockTrace.
            </p>
          </div>
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
          </label>

          <label className="auth-label">
            Role
            <select
              className="auth-input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
