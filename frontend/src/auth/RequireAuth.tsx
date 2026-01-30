import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
  const { auth } = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  if (!auth.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
