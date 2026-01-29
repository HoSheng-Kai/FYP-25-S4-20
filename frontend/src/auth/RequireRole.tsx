import { Navigate, Outlet } from "react-router-dom";

type Role = "admin" | "manufacturer" | "distributor" | "retailer" | "consumer";

function getRole(): Role | null {
  const role = localStorage.getItem("userRole");
  if (
    role === "admin" ||
    role === "manufacturer" ||
    role === "distributor" ||
    role === "retailer" ||
    role === "consumer"
  ) {
    return role;
  }
  return null;
}

function getHomeForRole(role: Role) {
  return `/${role}`;
}

export default function RequireRole({ allow }: { allow: Role[] }) {
  const role = getRole();

  // Not logged in / missing role -> force login
  if (!role) return <Navigate to="/login" replace />;

  // Logged in but wrong role -> bounce to their home
  if (!allow.includes(role)) return <Navigate to={getHomeForRole(role)} replace />;

  return <Outlet />;
}
