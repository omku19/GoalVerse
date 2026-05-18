import { NavLink } from "react-router-dom";
import { getNavigationForRole } from "../routes/routeConfig.js";
import { normalizeRole, ROLE_LABELS } from "../utils/roles.js";

export default function Sidebar({ user }) {
  const role = normalizeRole(user?.role);
  const navigation = getNavigationForRole(role);

  return (
    <aside className="hidden w-72 shrink-0 bg-gradient-to-b from-[var(--gv-sidebar-from)] via-[var(--gv-sidebar-via)] to-[var(--gv-sidebar-to)] lg:block">
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--gv-sidebar-border)] px-6 py-5">
          <p className="text-lg font-bold tracking-tight text-[var(--gv-text-inverse)]">
            <span className="bg-gradient-to-r from-[var(--gv-primary)] to-[var(--gv-primary-light)] bg-clip-text text-transparent">Goal</span>
            <span className="text-[var(--gv-text-inverse)]">verse</span>
          </p>
          <p className="mt-1 text-sm text-[var(--gv-text-inverse)] opacity-80">{ROLE_LABELS[role] || "Workspace"}</p>
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
                      ? "gv-sidebar-link-active text-[var(--gv-text-inverse)]"
                      : "text-[var(--gv-text-inverse)] opacity-80 hover:opacity-100",
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
        <div className="mt-auto border-t border-[var(--gv-sidebar-border)] px-6 py-4">
          <p className="text-xs text-[var(--gv-text-inverse)] opacity-60">© {new Date().getFullYear()} Goalverse</p>
        </div>
      </div>
    </aside>
  );
}
