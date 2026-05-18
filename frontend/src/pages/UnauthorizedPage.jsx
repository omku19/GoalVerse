import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { getDashboardPathByRole } from "../utils/roles.js";

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--gv-bg)] px-4">
      <section className="w-full max-w-md rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface)] p-8 text-center shadow-[var(--gv-shadow-sm)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--gv-danger-surface)] text-[var(--gv-danger)]">
          <ShieldAlert size={22} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-[var(--gv-text)]">Access unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gv-text-secondary)]">
          Your current role does not have access to this workspace area.
        </p>
        <Link
          to={getDashboardPathByRole(user?.role)}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-[var(--gv-primary)] to-[var(--gv-primary-light)] px-4 text-sm font-semibold text-[var(--gv-text-on-primary)] transition"
        >
          Go to my dashboard
        </Link>
      </section>
    </main>
  );
}
