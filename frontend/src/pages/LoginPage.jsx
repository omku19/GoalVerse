import { useState } from "react";
import { LogIn } from "lucide-react";
import { loginUser } from "../services/api.js";

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
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      await loginUser({
        email: form.email.trim(),
        password: form.password,
      });
      window.location.href = "/";
    } catch (error) {
      setSubmitError(error.message || "Unable to sign in");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:grid-cols-[1fr_420px]">
        <div className="flex flex-col justify-between bg-slate-950 p-8 text-white sm:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Goalverse</p>
            <h1 className="mt-4 max-w-md text-4xl font-bold leading-tight">Sign in to manage goals with clarity.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
              Access your HR dashboard, approvals, quarterly check-ins, and team progress from one secure workspace.
            </p>
          </div>
          <p className="mt-10 text-sm text-slate-400">Protected by JWT authentication.</p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-950">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-600">Use your admin credentials to continue.</p>
          </div>

          <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                placeholder="you@example.com"
              />
              {errors.email ? <p className="mt-2 text-sm text-red-600">{errors.email}</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                placeholder="Enter your password"
              />
              {errors.password ? <p className="mt-2 text-sm text-red-600">{errors.password}</p> : null}
            </div>

            {submitError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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
