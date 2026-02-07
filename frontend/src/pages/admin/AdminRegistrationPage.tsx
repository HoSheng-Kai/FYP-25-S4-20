import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { USERS_API_BASE_URL } from "../../config/api";

interface RegistrationResponse {
  success: boolean;
  error?: string;
  details?: string;
}

interface Role {
  role_id: string;
  role_name: string;
}

export default function AdminRegistrationPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("manufacturer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const roles: Role[] = [
    { role_id: "manufacturer", role_name: "Manufacturer" },
    { role_id: "distributor", role_name: "Distributor" },
    { role_id: "retailer", role_name: "Retailer" },
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || !email || !password) {
      setError("All fields are required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await axios.post<RegistrationResponse>(
        `${USERS_API_BASE_URL}/create-account`,
        { username, email, password, role_id: roleId },
        { withCredentials: true }
      );

      if (!res.data.success) {
        setError(res.data.error || res.data.details || "Failed to create account");
        return;
      }

      setSuccess(`${roles.find((r) => r.role_id === roleId)?.role_name} account "${username}" created successfully!`);
      setUsername("");
      setEmail("");
      setPassword("");
      setRoleId("manufacturer");

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.details || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 40, background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8, fontSize: 32, color: "#111827" }}>Register Company Account</h1>
        <p style={{ color: "#6b7280", fontSize: 15 }}>
          Create new accounts for Manufacturers, Distributors, and Retailers
        </p>
      </div>

      <div
        style={{
          background: "white",
          padding: 32,
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxWidth: 500,
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#374151" }}>
              Company Type *
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                background: "white",
                cursor: "pointer",
              }}
            >
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#374151" }}>
              Username *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter company username"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#374151" }}>
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter company email"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#374151" }}>
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password (min. 6 characters)"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                fontSize: 14,
                boxSizing: "border-box",
              }}
              required
            />
          </div>

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#991b1b",
                padding: 12,
                borderRadius: 6,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: "#dcfce7",
                color: "#166534",
                padding: 12,
                borderRadius: 6,
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              ✓ {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "12px 24px",
              background: isSubmitting ? "#9ca3af" : "#0066cc",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13, color: "#6b7280", textAlign: "center" }}>* = Required field</p>
      </div>
    </div>
  );
}
