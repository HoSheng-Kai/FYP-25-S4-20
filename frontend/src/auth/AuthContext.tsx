import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { API_ROOT } from "../config/api";

type Role = "admin" | "manufacturer" | "distributor" | "retailer" | "consumer";

type MeUser = {
  userId: number;
  role: Role;
  username: string;
};

type AuthState =
  | { loading: true; user: null }
  | { loading: false; user: MeUser | null };

const AuthContext = createContext<{
  auth: AuthState;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ loading: true, user: null });

  async function refresh() {
    try {
      const res = await axios.get(`${API_ROOT}/users/me`, { withCredentials: true });
      setAuth({ loading: false, user: res.data.user });
    } catch {
      setAuth({ loading: false, user: null });
    }
  }

  async function logout() {
    await axios.post(`${API_ROOT}/users/logout-account`, {}, { withCredentials: true });
    setAuth({ loading: false, user: null });
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ auth, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
