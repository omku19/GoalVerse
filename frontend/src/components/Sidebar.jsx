import { NavLink } from "react-router-dom";
import { getNavigationForRole } from "../routes/routeConfig.js";
import { normalizeRole, ROLE_LABELS } from "../utils/roles.js";

export default function Sidebar({ user }) {
  const role = normalizeRole(user?.role);
  const navigation = getNavigationForRole(role);

  return (
    <aside className="hidden w-72 shrink-0 lg:block" style={{ background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)' }}>
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-lg font-bold tracking-tight text-white">
            <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">Goal</span>
            <span className="text-white">verse</span>
          </p>
          <p className="mt-1 text-sm text-indigo-200/70">{ROLE_LABELS[role] || "Workspace"}</p>
        </div>

        <nav className="grid gap-1 px-4 py-5">
          {navigation.map((item, index) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    "gv-sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive
                      ? "gv-sidebar-link-active text-white"
                      : "text-indigo-200/80 hover:text-white",
                  ].join(" ")
                }
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom branding */}
        <div className="mt-auto border-t border-white/10 px-6 py-4">
          <p className="text-xs text-indigo-300/50">© {new Date().getFullYear()} Goalverse</p>
        </div>
      </div>
    </aside>
  );
}
