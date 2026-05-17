import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { getDashboardPathByRole } from "../utils/roles.js";

export default function RoleRedirect() {
  const { user } = useAuth();

  return <Navigate to={getDashboardPathByRole(user?.role)} replace />;
}
