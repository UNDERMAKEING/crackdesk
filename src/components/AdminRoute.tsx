import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = sessionStorage.getItem("admin_auth") === "true";
  if (!isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

