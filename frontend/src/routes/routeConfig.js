import { BarChart3, ClipboardCheck, ShieldCheck } from "lucide-react";
import { normalizeRole, ROLES } from "../utils/roles.js";

export const dashboardRoutes = [
  {
    path: "/dashboard/employee",
    label: "Overview",
    icon: ClipboardCheck,
    roles: [ROLES.EMPLOYEE],
  },
  {
    path: "/dashboard/employee#create-goal",
    label: "Create Goal",
    icon: ClipboardCheck,
    roles: [ROLES.EMPLOYEE],
  },
  {
    path: "/dashboard/employee#my-goals",
    label: "My Goals",
    icon: ClipboardCheck,
    roles: [ROLES.EMPLOYEE],
  },
  {
    path: "/dashboard/manager",
    label: "Team Overview",
    icon: BarChart3,
    roles: [ROLES.MANAGER],
  },
  {
    path: "/dashboard/manager#pending-approvals",
    label: "Approvals",
    icon: BarChart3,
    roles: [ROLES.MANAGER],
  },
  {
    path: "/dashboard/manager#submitted-checkins",
    label: "Reviews",
    icon: BarChart3,
    roles: [ROLES.MANAGER],
  },
  {
    path: "/dashboard/hr-admin",
    label: "Overview",
    icon: ShieldCheck,
    roles: [ROLES.HR_ADMIN],
  },
  {
    path: "/dashboard/hr-admin#create-department",
    label: "Departments",
    icon: ShieldCheck,
    roles: [ROLES.HR_ADMIN],
  },
  {
    path: "/dashboard/hr-admin#create-user",
    label: "Users",
    icon: ShieldCheck,
    roles: [ROLES.HR_ADMIN],
  },
  {
    path: "/dashboard/hr-admin#analytics",
    label: "Analytics",
    icon: ShieldCheck,
    roles: [ROLES.HR_ADMIN],
  },
];

export function getNavigationForRole(role) {
  const normalizedRole = normalizeRole(role);

  return dashboardRoutes.filter((route) => route.roles.includes(normalizedRole));
}
