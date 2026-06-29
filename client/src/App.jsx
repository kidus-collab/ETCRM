import { Navigate, Route, Routes } from "react-router-dom";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { LoginPage } from "./pages/auth/LoginPage";
import { SalesDashboard } from "./pages/sales/SalesDashboard";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { useAuth } from "./utils/AuthContext";

function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin" : "/sales"} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute role="SALES">
            <SalesDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
