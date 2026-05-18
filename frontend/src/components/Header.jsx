import { LogOut, Menu } from "lucide-react";
import { normalizeRole, ROLE_LABELS } from "../utils/roles.js";

export default function Header({ user, onLogout }) {
  const role = normalizeRole(user?.role);

  return (
    <header className="gv-header sticky top-0 z-30 border-b border-[var(--gv-border)] bg-[var(--gv-surface)]">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="gv-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--gv-border)] text-[var(--gv-primary)] hover:bg-[var(--gv-surface-alt)] hover:text-[var(--gv-primary-dark)] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div>
            <p className="bg-gradient-to-r from-[var(--gv-primary)] to-[var(--gv-primary-light)] bg-clip-text text-sm font-semibold text-transparent">
              Dashboard
            </p>
            <p className="text-xs text-[var(--gv-text-muted)]">{ROLE_LABELS[role] || "Signed in"}</p>
          </div>
        </div>

        {/* Navigation links removed — they live in the Sidebar only */}

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-[var(--gv-text)]">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-[var(--gv-text-muted)]">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="gv-btn inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--gv-danger-light)] text-[var(--gv-danger)] transition hover:bg-[var(--gv-danger-surface)] hover:text-[var(--gv-danger)]"
            aria-label="Sign out"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
