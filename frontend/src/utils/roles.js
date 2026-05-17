export const ROLES = {
  EMPLOYEE: "EMPLOYEE",
  MANAGER: "MANAGER",
  HR_ADMIN: "HR_ADMIN",
};

export const ROLE_DASHBOARD_PATHS = {
  [ROLES.EMPLOYEE]: "/dashboard/employee",
  [ROLES.MANAGER]: "/dashboard/manager",
  [ROLES.HR_ADMIN]: "/dashboard/hr-admin",
};

export const ROLE_LABELS = {
  [ROLES.EMPLOYEE]: "Employee",
  [ROLES.MANAGER]: "Manager",
  [ROLES.HR_ADMIN]: "HR Admin",
};

export function normalizeRole(role) {
  if (!role) {
    return "";
  }

  return role.toUpperCase();
}

export function getDashboardPathByRole(role) {
  return ROLE_DASHBOARD_PATHS[normalizeRole(role)] || "/unauthorized";
}

export function hasAllowedRole(user, allowedRoles = []) {
  if (!allowedRoles.length) {
    return true;
  }

  return Boolean(user?.role && allowedRoles.includes(normalizeRole(user.role)));
}
