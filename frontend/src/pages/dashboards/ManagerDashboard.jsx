import DashboardCard from "./DashboardCard.jsx";

export default function ManagerDashboard() {
  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Manager Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Review team goal progress, approvals, and check-in health.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard title="Team goals" value="0" caption="Team goals will appear here." />
        <DashboardCard title="Pending reviews" value="0" caption="No manager reviews pending." />
        <DashboardCard title="At-risk goals" value="0" caption="No at-risk goals right now." />
      </div>
    </section>
  );
}
