import { Navigate } from "react-router-dom";
import { useAuth } from "../utils/AuthContext";

export function ProtectedRoute({ children, role }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/sales"} replace />;

  return children;
}
