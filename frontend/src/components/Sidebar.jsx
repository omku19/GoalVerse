import { NavLink } from "react-router-dom";
import { getNavigationForRole } from "../routes/routeConfig.js";
import { normalizeRole, ROLE_LABELS } from "../utils/roles.js";

export default function Sidebar({ user }) {
  const role = normalizeRole(user?.role);
  const navigation = getNavigationForRole(role);

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-lg font-semibold text-slate-950">Goalverse</p>
          <p className="mt-1 text-sm text-slate-500">{ROLE_LABELS[role] || "Workspace"}</p>
        </div>

        <nav className="grid gap-1 px-4 py-5">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                    isActive ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")
                }
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
