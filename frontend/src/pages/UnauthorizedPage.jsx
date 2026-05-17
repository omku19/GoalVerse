import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { getDashboardPathByRole } from "../utils/roles.js";

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
          <ShieldAlert size={22} aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-slate-950">Access unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your current role does not have access to this workspace area.
        </p>
        <Link
          to={getDashboardPathByRole(user?.role)}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          Go to my dashboard
        </Link>
      </section>
    </main>
  );
}
