import { LogOut, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { getNavigationForRole } from "../routes/routeConfig.js";
import { normalizeRole, ROLE_LABELS } from "../utils/roles.js";

export default function Header({ user, onLogout }) {
  const role = normalizeRole(user?.role);
  const navigation = getNavigationForRole(role);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-950">Dashboard</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[role] || "Signed in"}</p>
          </div>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-2 xl:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "rounded-md px-3 py-2 text-sm font-semibold transition",
                  isActive ? "bg-blue-50 text-[#1E40FF]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="Sign out"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
