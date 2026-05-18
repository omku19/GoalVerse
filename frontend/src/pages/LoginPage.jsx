import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { getDashboardPathByRole } from "../utils/roles.js";

const initialForm = {
  email: "",
  password: "",
};

function validateLoginForm(values) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!values.email.trim()) {
    errors.email = "Email is required";
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  if (!values.password) {
    errors.password = "Password is required";
  }

  return errors;
}

export default function LoginPage() {
  const { isAuthenticated, isInitializing, login, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isInitializing && isAuthenticated) {
    return <Navigate to={getDashboardPathByRole(user?.role)} replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
    setSubmitError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = validateLoginForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    setSubmitError("");

    try {
      const session = await login({
        email: form.email.trim(),
        password: form.password,
      });
      const requestedPath = location.state?.from?.pathname;
      const destination = requestedPath && requestedPath !== "/login" ? requestedPath : getDashboardPathByRole(session.user.role);

      navigate(destination, { replace: true });
    } catch (error) {
      setSubmitError(error.message || "Unable to sign in");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--gv-bg)] px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface)] shadow-[var(--gv-shadow-sm)] md:grid-cols-[1fr_420px]">
        <div className="flex flex-col justify-between bg-gradient-to-br from-[var(--gv-sidebar-from)] via-[var(--gv-sidebar-via)] to-[var(--gv-sidebar-to)] p-8 text-[var(--gv-text-inverse)] sm:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--gv-text-inverse)]">Goalverse</p>
            <h1 className="mt-4 max-w-md text-4xl font-bold leading-tight">Sign in to manage goals with clarity.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--gv-text-inverse)] opacity-80">
              Access your HR dashboard, approvals, quarterly check-ins, and team progress from one secure workspace.
            </p>
          </div>
          <p className="mt-10 text-sm text-[var(--gv-text-inverse)] opacity-70">Protected by JWT authentication.</p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[var(--gv-text)]">Welcome back</h2>
            <p className="mt-2 text-sm text-[var(--gv-text-secondary)]">Use your admin credentials to continue.</p>
          </div>

          <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--gv-text-secondary)]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-md border border-[var(--gv-border)] bg-[var(--gv-surface)] px-4 py-3 text-sm text-[var(--gv-text)] outline-none transition focus:border-[var(--gv-primary)] focus:ring-2 focus:ring-[var(--gv-focus-ring)]"
                placeholder="you@example.com"
              />
              {errors.email ? <p className="mt-2 text-sm text-[var(--gv-danger)]">{errors.email}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--gv-text-secondary)]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-md border border-[var(--gv-border)] bg-[var(--gv-surface)] px-4 py-3 text-sm text-[var(--gv-text)] outline-none transition focus:border-[var(--gv-primary)] focus:ring-2 focus:ring-[var(--gv-focus-ring)]"
                placeholder="Enter your password"
              />
              {errors.password ? <p className="mt-2 text-sm text-[var(--gv-danger)]">{errors.password}</p> : null}
            </div>

            {submitError ? (
              <div className="rounded-md border border-[var(--gv-danger-light)] bg-[var(--gv-danger-surface)] px-4 py-3 text-sm text-[var(--gv-danger)]">
                {submitError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[var(--gv-primary)] to-[var(--gv-primary-light)] px-5 text-sm font-semibold text-[var(--gv-text-on-primary)] transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={18} aria-hidden="true" />
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
