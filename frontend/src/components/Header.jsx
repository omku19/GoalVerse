import { LogOut, Menu } from "lucide-react";
import { normalizeRole, ROLE_LABELS } from "../utils/roles.js";

export default function Header({ user, onLogout }) {
  const role = normalizeRole(user?.role);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
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
