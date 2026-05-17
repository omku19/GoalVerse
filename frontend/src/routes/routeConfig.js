import { BarChart3, ClipboardCheck, ShieldCheck } from "lucide-react";
import { normalizeRole, ROLES } from "../utils/roles.js";

export const dashboardRoutes = [
  {
    path: "/dashboard/employee",
    label: "My Dashboard",
    icon: ClipboardCheck,
    roles: [ROLES.EMPLOYEE],
  },
  {
    path: "/dashboard/manager",
    label: "Team Dashboard",
    icon: BarChart3,
    roles: [ROLES.MANAGER],
  },
  {
    path: "/dashboard/hr-admin",
    label: "HR Dashboard",
    icon: ShieldCheck,
    roles: [ROLES.HR_ADMIN],
  },
];

export function getNavigationForRole(role) {
  const normalizedRole = normalizeRole(role);

  return dashboardRoutes.filter((route) => route.roles.includes(normalizedRole));
}
