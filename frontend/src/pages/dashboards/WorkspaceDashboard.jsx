import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, CheckCircle2, Clock3, Flag, Plus, Send, ShieldCheck, X } from "lucide-react";
import { apiRequest } from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
const currentYear = new Date().getFullYear();
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const goalStatusOptions = ["ACTIVE", "PAUSED", "AT_RISK", "COMPLETED"];
const unitOptions = [
  { value: "MIN", label: "Min (Numeric / %)" },
  { value: "MAX", label: "Max (Numeric / %)" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "ZERO", label: "Zero" },
];
const unitLabels = Object.fromEntries(unitOptions.map((option) => [option.value, option.label]));

const STAT_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-cyan-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-green-500",
];
let statIndex = 0;

function StatCard({ title, value, caption, icon: Icon }) {
  const gradient = STAT_GRADIENTS[statIndex++ % STAT_GRADIENTS.length];
  return (
    <div className="gv-card gv-stat-card rounded-xl border border-indigo-100/60 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{caption}</p>
    </div>
  );
}

function Panel({ title, actions, children, id }) {
  return (
    <section
      id={id}
      className="gv-card gv-panel min-w-0 overflow-hidden scroll-mt-24 rounded-xl border border-indigo-100/60 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{children}</div>;
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-indigo-50 text-indigo-700 border-indigo-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${tones[tone]}`}>{children}</span>;
}

function Input({ label, ...props }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        {...props}
        className="w-full min-w-0 h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#1E40FF] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-slate-700">
      {label}
      <select
        {...props}
        className="w-full min-w-0 h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#1E40FF] focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function Textarea({ label, ...props }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-slate-700">
      {label}
      <textarea
        {...props}
        className="w-full min-w-0 min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-[#1E40FF] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Button({ children, variant = "primary", ...props }) {
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    success: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400",
    danger: "bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-400 hover:to-rose-400",
  };
  return (
    <button {...props} className={`gv-btn inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]}`}>
      {children}
    </button>
  );
}

function ProgressBar({ value, target }) {
  const percent = Math.min(100, Math.round((Number(value || 0) / Math.max(Number(target || 1), 1)) * 100));
  const barColor = percent >= 80 ? "from-emerald-400 to-green-500" : percent >= 40 ? "from-amber-400 to-orange-500" : "from-red-400 to-rose-500";
  return (
    <div className="grid gap-1">
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`gv-progress-fill h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-slate-500">{percent}%</span>
    </div>
  );
}

function scoreText(goal) {
  if (!goal?.score) return "Score unavailable";
  return `${goal.score.percent}% score`;
}

function formatDateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function Modal({ title, subtitle, children, onClose }) {
  return (
    <div className="gv-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
      <div className="gv-modal-content max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-indigo-100/60 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-indigo-100/60 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-slate-950">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="gv-btn inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-500" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Filters({ filters, setFilters, reload }) {
  return (
    <div className="flex items-end gap-3">
      <Select label="Quarter" value={filters.quarter} onChange={(event) => setFilters((value) => ({ ...value, quarter: event.target.value }))}>
        {[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>Q{quarter}</option>)}
      </Select>
      <Input label="Year" type="number" value={filters.year} onChange={(event) => setFilters((value) => ({ ...value, year: event.target.value }))} />
      <Button variant="secondary" onClick={() => setFilters({ quarter: currentQuarter, year: currentYear })}>Current</Button>
      <Button onClick={reload}>Apply</Button>
    </div>
  );
}

function GoalsTable({ goals, onApprove, onReject, onProgress, onSubmitCheckin, compact = false }) {
  if (!goals?.length) return <EmptyState>No goals match this view yet.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-3">Goal</th>
            <th className="px-3 py-3">Owner</th>
            <th className="px-3 py-3">Progress</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Approval</th>
            {!compact ? <th className="px-3 py-3">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {goals.map((goal) => (
            <tr key={goal.id} className="gv-table-row align-top">
              <td className="px-3 py-4">
                <p className="font-semibold text-slate-950">{goal.title}</p>
                <p className="mt-1 max-w-md text-xs text-slate-500">{goal.description}</p>
                {goal.managerComment ? <p className="mt-2 text-xs text-blue-700">Manager: {goal.managerComment}</p> : null}
              </td>
              <td className="px-3 py-4 text-slate-600">{goal.owner ? `${goal.owner.firstName} ${goal.owner.lastName}` : "Me"}</td>
              <td className="px-3 py-4 min-w-40">
                <ProgressBar value={goal.progress} target={goal.targetValue} />
                <p className="mt-1 text-xs text-slate-500">{goal.progress}/{goal.targetValue || "deadline"} · {unitLabels[goal.unit] || goal.unit}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">{scoreText(goal)}</p>
              </td>
              <td className="px-3 py-4"><Badge tone={goal.status === "COMPLETED" ? "green" : goal.status === "AT_RISK" ? "red" : "blue"}>{goal.status}</Badge></td>
              <td className="px-3 py-4"><Badge tone={goal.approvalStatus === "APPROVED" ? "green" : goal.approvalStatus === "REJECTED" ? "red" : "yellow"}>{goal.approvalStatus}</Badge></td>
              {!compact ? (
                <td className="px-3 py-4">
                  <div className="flex flex-wrap gap-2">
                    {onApprove && goal.approvalStatus === "PENDING" ? <Button variant="success" onClick={() => onApprove(goal)}>Approve</Button> : null}
                    {onReject && goal.approvalStatus === "PENDING" ? <Button variant="danger" onClick={() => onReject(goal)}>Reject</Button> : null}
                    {onProgress && ["ACTIVE", "PAUSED", "AT_RISK"].includes(goal.status) ? <Button variant="secondary" onClick={() => onProgress(goal)}>Update</Button> : null}
                    {onSubmitCheckin && ["ACTIVE", "PAUSED", "AT_RISK", "COMPLETED"].includes(goal.status) ? <Button onClick={() => onSubmitCheckin(goal)}>Submit</Button> : null}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WorkspaceDashboard({ role }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ quarter: currentQuarter, year: currentYear });
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const dashboardPath = role === "HR_ADMIN" ? "/dashboard/hr" : role === "MANAGER" ? "/dashboard/manager" : "/dashboard/employee";
  const query = `?quarter=${filters.quarter}&year=${filters.year}`;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const dashboard = await apiRequest(`${dashboardPath}${query}`);
      setData(dashboard);
      const checkinData = await apiRequest(`/checkins${query}`);
      setCheckins(checkinData);
      if (role === "HR_ADMIN") {
        const [departmentData, userData] = await Promise.all([apiRequest("/departments"), apiRequest("/users")]);
        setDepartments(departmentData);
        setUsers(userData);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [role]);

  async function runAction(action, success = "Done") {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const stats = data?.stats || {};
  const goals = data?.goals || [];
  const chartData = useMemo(() => [
    { name: "Active", value: stats.active || 0 },
    { name: "Pending", value: stats.pending || 0 },
    { name: "Completed", value: stats.completed || 0 },
    { name: "Delayed", value: stats.delayed || 0 },
  ], [stats]);

  if (loading && !data) {
    return <div className="gv-card rounded-xl border border-indigo-100/60 bg-white p-8 text-sm text-slate-500">Loading Goalverse workspace...</div>;
  }

  statIndex = 0;
  return (
    <section className="grid gap-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Goalverse</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{role === "HR_ADMIN" ? "HR Command Center" : role === "MANAGER" ? "Manager Team Workspace" : "My Goal Workspace"}</h1>
          <p className="mt-2 text-sm text-slate-600">Signed in as {user?.firstName} {user?.lastName}. Demo password for seeded users is Password@123.</p>
        </div>
        <Filters filters={filters} setFilters={setFilters} reload={load} />
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard title="Total goals" value={stats.total || 0} caption="Visible in selected period" icon={Flag} />
        <StatCard title="Active" value={stats.active || 0} caption="Approved work in motion" icon={Activity} />
        <StatCard title="Pending" value={stats.pending || 0} caption="Awaiting manager approval" icon={Clock3} />
        <StatCard title="Completed" value={stats.completed || 0} caption="Finished goals" icon={CheckCircle2} />
      </div>

      {role === "HR_ADMIN" ? <HrWorkspace departments={departments} users={users} goals={goals} chartData={chartData} runAction={runAction} /> : null}
      {role === "MANAGER" ? <ManagerWorkspace goals={goals} checkins={checkins} runAction={runAction} /> : null}
      {role === "EMPLOYEE" ? <EmployeeWorkspace goals={goals} checkins={checkins} filters={filters} runAction={runAction} /> : null}
    </section>
  );
}

function HrWorkspace({ departments, users, goals, chartData, runAction }) {
  const [departmentName, setDepartmentName] = useState("");
  const [userForm, setUserForm] = useState({ firstName: "", lastName: "", email: "", password: "Password@123", role: "EMPLOYEE", departmentId: "", managerId: "", jobTitle: "" });
  const managers = users.filter((item) => item.role === "MANAGER" && item.departmentId === userForm.departmentId);
  const departmentCompletion = departments.map((department) => {
    const departmentGoals = goals.filter((goal) => goal.departmentId === department.id);
    const completed = departmentGoals.filter((goal) => goal.score?.percent >= 100 || goal.status === "COMPLETED").length;
    return {
      name: department.name.replace(" Operations", ""),
      completion: departmentGoals.length ? Math.round((completed / departmentGoals.length) * 100) : 0,
    };
  });
  const statusDistribution = [
    { name: "Ongoing", value: goals.filter((goal) => ["ACTIVE", "AT_RISK"].includes(goal.status)).length },
    { name: "Paused", value: goals.filter((goal) => goal.status === "PAUSED").length },
    { name: "Complete", value: goals.filter((goal) => goal.status === "COMPLETED").length },
    { name: "Pending", value: goals.filter((goal) => goal.approvalStatus === "PENDING").length },
  ];
  const managerGoalData = users
    .filter((item) => item.role === "MANAGER")
    .map((manager) => ({
      name: manager.firstName,
      goals: goals.filter((goal) => goal.owner?.managerId === manager.id).length,
    }));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel id="create-department" title="Create Department" actions={<Badge tone="blue">{departments.length} departments</Badge>}>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <form className="flex gap-3" onSubmit={(event) => {
            event.preventDefault();
            runAction(() => apiRequest("/departments", { method: "POST", body: { name: departmentName } }), "Department created");
            setDepartmentName("");
          }}>
            <Input label="Department name" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="Design Operations" required />
            <div className="pt-6 md:col-span-2 xl:col-span-3 flex justify-end"><Button><Plus size={16} />Add</Button></div>
          </form>
        </div>
      </Panel>

      {/* Duplicate "Goal Health" pie chart removed — "Goal Status Distribution" below covers this */}

      <Panel id="create-user" title="Create User" actions={<Badge tone="green">{users.length} active users</Badge>}>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={(event) => {
            event.preventDefault();
            runAction(() => apiRequest("/users", { method: "POST", body: userForm }), "User created");
          }}>
            <Input label="First name" value={userForm.firstName} onChange={(event) => setUserForm({ ...userForm, firstName: event.target.value })} required />
            <Input label="Last name" value={userForm.lastName} onChange={(event) => setUserForm({ ...userForm, lastName: event.target.value })} required />
            <Input label="Email" type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required />
            <Select label="Role" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value, managerId: "" })}>
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="HR_ADMIN">HR Admin</option>
            </Select>
            <Select label="Department" value={userForm.departmentId} onChange={(event) => setUserForm({ ...userForm, departmentId: event.target.value, managerId: "" })}>
              <option value="">Select department</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
            <Select label="Manager" value={userForm.managerId} onChange={(event) => setUserForm({ ...userForm, managerId: event.target.value })} disabled={userForm.role !== "EMPLOYEE"}>
              <option value="">Select manager</option>
              {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>)}
            </Select>
            <Input label="Role title" value={userForm.jobTitle} onChange={(event) => setUserForm({ ...userForm, jobTitle: event.target.value })} />
            <Input label="Password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} required />
            <div className="pt-6 md:col-span-2 xl:col-span-3 flex justify-end"><Button><ShieldCheck size={16} />Create user</Button></div>
          </form>
        </div>
      </Panel>

      <Panel title="Completion Rate By Department">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentCompletion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completion" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Goal Status Distribution">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label>
                {statusDistribution.map((entry, index) => <Cell key={entry.name} fill={["#6366f1", "#94a3b8", "#10b981", "#f59e0b"][index]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Goal Count Per Manager">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={managerGoalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="goals" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Department Stats">
        <div className="grid gap-3">
          {departments.map((department) => (
            <div key={department.id} className="gv-list-item grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border border-indigo-100/60 px-4 py-3">
              <div><p className="font-semibold text-slate-950">{department.name}</p><p className="text-xs text-slate-500">Managers and employees mapped by HR</p></div>
              <Badge tone="blue">{department.users?.filter((item) => item.role === "MANAGER").length || 0} managers</Badge>
              <Badge tone="green">{department.users?.filter((item) => item.role === "EMPLOYEE").length || 0} employees</Badge>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="All Goals">
        <GoalsTable goals={goals} compact />
      </Panel>
    </div>
  );
}

function ManagerWorkspace({ goals, checkins, runAction }) {
  const pending = goals.filter((goal) => goal.approvalStatus === "PENDING");
  const submitted = checkins.filter((checkin) => checkin.submissionStatus === "submitted");
  const [modal, setModal] = useState(null);

  function approve(goal) {
    setModal({
      type: "approve",
      goal,
      form: {
        title: goal.title,
        description: goal.description || "",
        targetValue: goal.targetValue || 0,
        unit: goal.unit,
        quarter: goal.quarter,
        year: goal.year,
        dueDate: formatDateInput(goal.dueDate) || "2026-06-30",
        priority: goal.priority || "HIGH",
        managerComment: goal.managerComment || "Approved for this quarter.",
      },
    });
  }

  function reject(goal) {
    setModal({ type: "reject", goal, form: { managerComment: goal.managerComment || "" } });
  }

  function review(checkin) {
    setModal({ type: "review", checkin, form: { reviewerNotes: "Good progress. Keep focus on the next milestone." } });
  }

  function updateModalForm(field, value) {
    setModal((current) => ({ ...current, form: { ...current.form, [field]: value } }));
  }

  async function submitManagerModal(event) {
    event.preventDefault();
    if (modal.type === "approve") {
      await runAction(
        () => apiRequest(`/goals/${modal.goal.id}/approve`, { method: "PATCH", body: modal.form }),
        "Goal approved",
      );
    }
    if (modal.type === "reject") {
      await runAction(
        () => apiRequest(`/goals/${modal.goal.id}/reject`, { method: "PATCH", body: modal.form }),
        "Goal sent back for revision",
      );
    }
    if (modal.type === "review") {
      await runAction(
        () => apiRequest(`/checkins/${modal.checkin.id}/review`, { method: "PATCH", body: modal.form }),
        "Review submitted",
      );
    }
    setModal(null);
  }

  return (
    <div className="grid gap-6">
      <Panel id="pending-approvals" title="Pending Approvals" actions={<Badge tone="yellow">{pending.length} pending</Badge>}>
        <GoalsTable goals={pending} onApprove={approve} onReject={reject} />
      </Panel>
      <Panel id="submitted-checkins" title="Submitted Quarterly Check-ins" actions={<Badge tone="blue">{submitted.length} ready</Badge>}>
        {submitted.length ? (
          <div className="grid gap-3">
            {submitted.map((checkin) => (
              <div key={checkin.id} className="gv-list-item grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-indigo-100/60 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-950">{checkin.goal?.title}</p>
                  <p className="text-sm text-slate-500">{checkin.submittedBy?.firstName} {checkin.submittedBy?.lastName}: {checkin.progress}% progress. {checkin.wins}</p>
                </div>
                <Button onClick={() => review(checkin)}><Send size={16} />Review</Button>
              </div>
            ))}
          </div>
        ) : <EmptyState>No submitted reviews waiting.</EmptyState>}
      </Panel>
      <Panel title="Team Goals">
        <GoalsTable goals={goals} compact />
      </Panel>
      {modal ? (
        <Modal
          title={modal.type === "approve" ? "Review Pending Goal" : modal.type === "reject" ? "Reject Goal Request" : "Review Quarterly Check-in"}
          subtitle={modal.type === "approve" ? "Review employee input, adjust fields if needed, then set manager priority and deadline." : "Add clear manager feedback before saving."}
          onClose={() => setModal(null)}
        >
          <form className="grid gap-5" onSubmit={submitManagerModal}>
            {modal.type === "approve" ? (
              <>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <h4 className="font-semibold text-slate-950">Employee Submitted Fields</h4>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <p><span className="font-semibold">Employee:</span> {modal.goal.owner?.firstName} {modal.goal.owner?.lastName}</p>
                    <p><span className="font-semibold">Unit:</span> {unitLabels[modal.goal.unit]}</p>
                    <p><span className="font-semibold">Target:</span> {modal.goal.targetValue || "Timeline/Zero based"}</p>
                    <p><span className="font-semibold">Period:</span> Q{modal.goal.quarter} {modal.goal.year}</p>
                    <p className="md:col-span-2"><span className="font-semibold">Description:</span> {modal.goal.description}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <h4 className="font-semibold text-slate-950">Manager Edits To Goal Fields</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Input label="Goal title" value={modal.form.title} onChange={(event) => updateModalForm("title", event.target.value)} required />
                    <Select label="Unit of measurement" value={modal.form.unit} onChange={(event) => updateModalForm("unit", event.target.value)}>
                      {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                    {["MIN", "MAX"].includes(modal.form.unit) ? (
                      <Input label="Target value" type="number" min="0" value={modal.form.targetValue} onChange={(event) => updateModalForm("targetValue", event.target.value)} required />
                    ) : null}
                    <Input label="Quarter" type="number" min="1" max="4" value={modal.form.quarter} onChange={(event) => updateModalForm("quarter", event.target.value)} required />
                    <Input label="Year" type="number" value={modal.form.year} onChange={(event) => updateModalForm("year", event.target.value)} required />
                    <Textarea label="Description" value={modal.form.description} onChange={(event) => updateModalForm("description", event.target.value)} />
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <h4 className="font-semibold text-slate-950">Priority Weightage And Deadline</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <Select label="Priority" value={modal.form.priority} onChange={(event) => updateModalForm("priority", event.target.value)}>
                      <option value="HIGH">High (3 points)</option>
                      <option value="MEDIUM">Medium (2 points)</option>
                      <option value="LOW">Low (1 point)</option>
                      <option value="CRITICAL">Critical</option>
                    </Select>
                    <Input label="Deadline" type="date" value={modal.form.dueDate} onChange={(event) => updateModalForm("dueDate", event.target.value)} required />
                    <Input label="Manager comment" value={modal.form.managerComment} onChange={(event) => updateModalForm("managerComment", event.target.value)} />
                  </div>
                </div>
              </>
            ) : null}

            {modal.type === "reject" ? (
              <Textarea label="Rejection reason" value={modal.form.managerComment} onChange={(event) => updateModalForm("managerComment", event.target.value)} required />
            ) : null}

            {modal.type === "review" ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">{modal.checkin.goal?.title}</p>
                  <p className="mt-1">{modal.checkin.submittedBy?.firstName} {modal.checkin.submittedBy?.lastName} submitted {modal.checkin.progress}% progress.</p>
                  <p className="mt-2">{modal.checkin.wins}</p>
                </div>
                <Textarea label="Manager feedback" value={modal.form.reviewerNotes} onChange={(event) => updateModalForm("reviewerNotes", event.target.value)} required />
              </>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit">{modal.type === "approve" ? "Approve goal" : modal.type === "reject" ? "Reject goal" : "Submit review"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function EmployeeWorkspace({ goals, checkins, filters, runAction }) {
  const [goalForm, setGoalForm] = useState({ title: "", description: "", targetValue: 100, unit: "MIN", quarter: filters.quarter, year: filters.year, dueDate: "" });
  const [modal, setModal] = useState(null);

  function updateProgress(goal) {
    setModal({ type: "progress", goal, form: { progress: goal.progress || 0, status: goal.unit === "TIMELINE" ? "COMPLETED" : goal.status, employeeNote: goal.employeeNote || "Updated from dashboard." } });
  }

  function submitCheckin(goal) {
    setModal({ type: "submit", goal, form: { wins: "Progress submitted for manager review.", blockers: "None noted.", nextSteps: "Continue into next quarter.", status: goal.status === "COMPLETED" ? "completed" : "delayed" } });
  }

  function updateModalForm(field, value) {
    setModal((current) => ({ ...current, form: { ...current.form, [field]: value } }));
  }

  async function submitEmployeeModal(event) {
    event.preventDefault();
    if (modal.type === "progress") {
      await runAction(
        () => apiRequest(`/goals/${modal.goal.id}/progress`, { method: "PATCH", body: { ...modal.form, progress: Number(modal.form.progress) } }),
        "Progress updated",
      );
    }
    if (modal.type === "submit") {
      await runAction(
        () => apiRequest("/checkins", {
          method: "POST",
          body: {
            goalId: modal.goal.id,
            quarter: Number(filters.quarter),
            year: Number(filters.year),
            progress: modal.goal.progress,
            ...modal.form,
          },
        }),
        "Quarterly check-in submitted",
      );
    }
    setModal(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel id="create-goal" title="Create Goal">
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          runAction(() => apiRequest("/goals", { method: "POST", body: goalForm }), "Goal sent to manager for approval");
          setGoalForm({ title: "", description: "", targetValue: 100, unit: "MIN", quarter: filters.quarter, year: filters.year, dueDate: "" });
        }}>
          <Input label="Goal name" value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} required />
          <Input label="Description" value={goalForm.description} onChange={(event) => setGoalForm({ ...goalForm, description: event.target.value })} required />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Select label="Unit of measurement" value={goalForm.unit} onChange={(event) => setGoalForm({ ...goalForm, unit: event.target.value })}>
              {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            {["MIN", "MAX"].includes(goalForm.unit) ? (
              <Input label="Target value" type="number" min="0" value={goalForm.targetValue} onChange={(event) => setGoalForm({ ...goalForm, targetValue: event.target.value })} required />
            ) : null}
            {goalForm.unit === "TIMELINE" ? (
              <Input label="Deadline" type="date" value={goalForm.dueDate} onChange={(event) => setGoalForm({ ...goalForm, dueDate: event.target.value })} required />
            ) : null}
            <Input label="Quarter" type="number" min="1" max="4" value={goalForm.quarter} onChange={(event) => setGoalForm({ ...goalForm, quarter: event.target.value })} required />
            <Input label="Year" type="number" value={goalForm.year} onChange={(event) => setGoalForm({ ...goalForm, year: event.target.value })} required />
          </div>
          <Button><Plus size={16} />Create goal</Button>
        </form>
      </Panel>
      <Panel id="my-goals" title="My Goals">
        <GoalsTable goals={goals} onProgress={updateProgress} onSubmitCheckin={submitCheckin} />
      </Panel>
      <Panel title="Manager Feedback">
        {checkins.length ? (
          <div className="grid gap-3">
            {checkins.map((checkin) => (
              <div key={checkin.id} className="gv-list-item rounded-lg border border-indigo-100/60 px-4 py-3">
                <p className="font-semibold text-slate-950">{checkin.goal?.title}</p>
                <p className="mt-1 text-sm text-slate-500">{checkin.reviewerNotes || "Submitted. Manager feedback pending."}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState>No quarterly submissions yet.</EmptyState>}
      </Panel>
      <Panel title="Progress Mix">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={goals.map((goal) => ({ name: goal.title.slice(0, 16), progress: goal.score?.percent || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="progress" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      {modal ? (
        <Modal
          title={modal.type === "progress" ? "Update Goal Progress" : "Submit Quarterly Check-in"}
          subtitle={modal.type === "progress" ? `${modal.goal.title} · ${unitLabels[modal.goal.unit]}` : "This locks the goal for manager review."}
          onClose={() => setModal(null)}
        >
          <form className="grid gap-4" onSubmit={submitEmployeeModal}>
            {modal.type === "progress" ? (
              <>
                {modal.goal.unit !== "TIMELINE" ? (
                  <Input label={modal.goal.unit === "ZERO" ? "Achievement value" : "Current achievement"} type="number" min="0" value={modal.form.progress} onChange={(event) => updateModalForm("progress", event.target.value)} required />
                ) : (
                  <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">Timeline goals are scored by completion on or before the manager deadline.</div>
                )}
                <Select label="Status" value={modal.form.status} onChange={(event) => updateModalForm("status", event.target.value)}>
                  {goalStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </Select>
                <Textarea label="Progress note" value={modal.form.employeeNote} onChange={(event) => updateModalForm("employeeNote", event.target.value)} />
              </>
            ) : null}

            {modal.type === "submit" ? (
              <>
                <Select label="Final status" value={modal.form.status} onChange={(event) => updateModalForm("status", event.target.value)}>
                  <option value="completed">Completed</option>
                  <option value="delayed">Delayed</option>
                  <option value="abandoned">Abandoned</option>
                </Select>
                <Textarea label="Wins" value={modal.form.wins} onChange={(event) => updateModalForm("wins", event.target.value)} required />
                <Textarea label="Blockers" value={modal.form.blockers} onChange={(event) => updateModalForm("blockers", event.target.value)} />
                <Textarea label="Next steps" value={modal.form.nextSteps} onChange={(event) => updateModalForm("nextSteps", event.target.value)} />
              </>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit">{modal.type === "progress" ? "Save progress" : "Submit check-in"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
