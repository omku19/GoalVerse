import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--gv-bg)] px-4">
      <section className="w-full max-w-md rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface)] p-8 text-center shadow-[var(--gv-shadow-sm)]">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--gv-primary)]">404</p>
        <h1 className="mt-3 text-xl font-semibold text-[var(--gv-text)]">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gv-text-secondary)]">The page you opened does not exist or has moved.</p>
        <Link
          to="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-[var(--gv-primary)] to-[var(--gv-primary-light)] px-4 text-sm font-semibold text-[var(--gv-text-on-primary)] transition"
        >
          Go home
        </Link>
      </section>
    </main>
  );
}
