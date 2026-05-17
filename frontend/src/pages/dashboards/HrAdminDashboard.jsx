import DashboardCard from "./DashboardCard.jsx";

export default function HrAdminDashboard() {
  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">HR Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Manage departments, people, approvals, and organization-wide goal visibility.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard title="Departments" value="0" caption="Department setup starts here." />
        <DashboardCard title="Users" value="0" caption="User management will appear here." />
        <DashboardCard title="Pending approvals" value="0" caption="No approvals pending." />
      </div>
    </section>
  );
}
