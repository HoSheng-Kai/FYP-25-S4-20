import { Navigate, Outlet, useLocation } from "react-router-dom";

function isLoggedIn() {
  // temporary: your current approach
  return localStorage.getItem("isAuthenticated") === "true";
}

export default function RequireAuth() {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}