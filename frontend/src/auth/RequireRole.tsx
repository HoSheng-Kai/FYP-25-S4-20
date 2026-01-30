import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

type Role = "admin" | "manufacturer" | "distributor" | "retailer" | "consumer";

function getHomeForRole(role: Role) {
  switch (role) {
    case "admin":
      return "/admin";
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
}

export default function RequireRole({ allow }: { allow: Role[] }) {
  const { auth } = useAuth();

  if (auth.loading) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  const role = auth.user?.role ?? null;

  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to={getHomeForRole(role)} replace />;

  return <Outlet />;
}
