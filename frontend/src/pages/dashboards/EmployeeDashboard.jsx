import DashboardCard from "./DashboardCard.jsx";

export default function EmployeeDashboard() {
  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Employee Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Track personal goals, check-ins, and upcoming priorities.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard title="Active goals" value="0" caption="Personal goals will appear here." />
        <DashboardCard title="Quarterly check-ins" value="0" caption="No check-ins are due yet." />
        <DashboardCard title="Notifications" value="0" caption="You are all caught up." />
      </div>
    </section>
  );
}
