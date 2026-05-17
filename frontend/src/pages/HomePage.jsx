import { useEffect, useState } from "react";
import { fetchHealth } from "../services/api.js";

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState("Checking API...");

  useEffect(() => {
    fetchHealth()
      .then((data) => setApiStatus(data.message))
      .catch(() => setApiStatus("API is not reachable yet"));
  }, []);

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Full-stack starter</p>
        <h1 className="mt-3 text-4xl font-bold">React, Express, Prisma, and PostgreSQL are ready.</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">{apiStatus}</p>
      </div>
    </section>
  );
}
