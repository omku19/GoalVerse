import { LogOut, Menu } from "lucide-react";
import { normalizeRole, ROLE_LABELS } from "../utils/roles.js";

export default function Header({ user, onLogout }) {
  const role = normalizeRole(user?.role);

  return (
    <header className="gv-header border-b border-indigo-100/60 bg-white/80 sticky top-0 z-30">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="gv-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div>
            <p className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Dashboard
            </p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[role] || "Signed in"}</p>
          </div>
        </div>

        {/* Navigation links removed — they live in the Sidebar only */}

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
            className="gv-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-400 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Sign out"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
