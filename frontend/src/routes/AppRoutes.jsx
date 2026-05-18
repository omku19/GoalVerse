import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../layouts/AppLayout.jsx";
import EmployeeDashboard from "../pages/dashboards/EmployeeDashboard.jsx";
import HrAdminDashboard from "../pages/dashboards/HrAdminDashboard.jsx";
import ManagerDashboard from "../pages/dashboards/ManagerDashboard.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import UnauthorizedPage from "../pages/UnauthorizedPage.jsx";
import { ROLES } from "../utils/roles.js";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRedirect from "./RoleRedirect.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<AppLayout />}>
          <Route index element={<RoleRedirect />} />
          <Route path="/dashboard" element={<RoleRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]} />}>
            <Route path="/dashboard/employee" element={<EmployeeDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.MANAGER]} />}>
            <Route path="/dashboard/manager" element={<ManagerDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.HR_ADMIN]} />}>
            <Route path="/dashboard/hr-admin" element={<HrAdminDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/404" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
