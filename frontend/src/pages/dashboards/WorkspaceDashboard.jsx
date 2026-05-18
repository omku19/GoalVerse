import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, CheckCircle2, Clock3, Download, Flag, Plus, Send, ShieldCheck, Unlock, X } from "lucide-react";
import { apiRequest, downloadReport } from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
const currentYear = new Date().getFullYear();
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const goalStatusOptions = [
  { value: "not_started", label: "Not Started" },
  { value: "on_track", label: "On Track" },
  { value: "completed", label: "Completed" },
];
const thrustAreaOptions = ["Financial", "Customer", "Process", "People", "Innovation", "Compliance", "Business Impact"];
const unitOptions = [
  { value: "MIN", label: "Min (Numeric / %)" },
  { value: "MAX", label: "Max (Numeric / %)" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "ZERO", label: "Zero" },
];
const unitLabels = Object.fromEntries(unitOptions.map((option) => [option.value, option.label]));

const STAT_GRADIENTS = [
  "from-[var(--gv-primary)] to-[var(--gv-primary-light)]",
  "from-[var(--gv-accent)] to-[var(--gv-accent-light)]",
  "from-[var(--gv-warning)] to-[var(--gv-warning-light)]",
  "from-[var(--gv-success)] to-[var(--gv-success-light)]",
];
const chartFills = ["var(--gv-primary)", "var(--gv-text-muted)", "var(--gv-success)", "var(--gv-warning)"];
let statIndex = 0;

function StatCard({ title, value, caption, icon: Icon }) {
  const gradient = STAT_GRADIENTS[statIndex++ % STAT_GRADIENTS.length];
  return (
    <div className="gv-card gv-stat-card rounded-xl border border-[var(--gv-border)] bg-[var(--gv-surface)] p-5 shadow-[var(--gv-shadow-sm)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--gv-text-muted)]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[var(--gv-text)]">{value}</p>
        </div>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-[var(--gv-text-on-primary)] shadow-[var(--gv-shadow-md)]`}>
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-3 text-sm text-[var(--gv-text-muted)]">{caption}</p>
    </div>
  );
}

function Panel({ title, actions, children, id }) {
  return (
    <section
      id={id}
      className="gv-card gv-panel min-w-0 overflow-hidden scroll-mt-24 rounded-xl border border-[var(--gv-border)] bg-[var(--gv-surface)] p-5 shadow-[var(--gv-shadow-sm)]"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--gv-text)]">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return <div className="rounded-md border border-dashed border-[var(--gv-border)] bg-[var(--gv-surface-alt)] px-4 py-8 text-center text-sm text-[var(--gv-text-muted)]">{children}</div>;
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    green: "bg-[var(--gv-success-surface)] text-[var(--gv-success)] border-[var(--gv-success-light)]",
    blue: "bg-[var(--gv-info-surface)] text-[var(--gv-accent)] border-[var(--gv-accent-light)]",
    yellow: "bg-[var(--gv-warning-surface)] text-[var(--gv-warning)] border-[var(--gv-warning-light)]",
    red: "bg-[var(--gv-danger-surface)] text-[var(--gv-danger)] border-[var(--gv-danger-light)]",
    slate: "bg-[var(--gv-surface-alt)] text-[var(--gv-text-secondary)] border-[var(--gv-border)]",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${tones[tone]}`}>{children}</span>;
}

function Input({ label, ...props }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-[var(--gv-text-secondary)]">
      {label}
      <input
        {...props}
        className="h-10 w-full min-w-0 rounded-md border border-[var(--gv-border)] bg-[var(--gv-surface)] px-3 text-sm text-[var(--gv-text)] outline-none transition focus:border-[var(--gv-primary)] focus:ring-2 focus:ring-[var(--gv-focus-ring)]"
      />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-[var(--gv-text-secondary)]">
      {label}
      <select
        {...props}
        className="h-10 w-full min-w-0 rounded-md border border-[var(--gv-border)] bg-[var(--gv-surface)] px-3 text-sm text-[var(--gv-text)] outline-none transition focus:border-[var(--gv-primary)] focus:ring-2 focus:ring-[var(--gv-focus-ring)]"
      >
        {children}
      </select>
    </label>
  );
}

function Textarea({ label, ...props }) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-[var(--gv-text-secondary)]">
      {label}
      <textarea
        {...props}
        className="min-h-24 w-full min-w-0 rounded-md border border-[var(--gv-border)] bg-[var(--gv-surface)] px-3 py-2 text-sm text-[var(--gv-text)] outline-none transition focus:border-[var(--gv-primary)] focus:ring-2 focus:ring-[var(--gv-focus-ring)]"
      />
    </label>
  );
}

function Button({ children, variant = "primary", ...props }) {
  const variants = {
    primary: "bg-gradient-to-r from-[var(--gv-primary)] to-[var(--gv-primary-light)] text-[var(--gv-text-on-primary)]",
    secondary: "bg-[var(--gv-surface-alt)] text-[var(--gv-text-secondary)] hover:bg-[var(--gv-border)]",
    success: "bg-gradient-to-r from-[var(--gv-success)] to-[var(--gv-success-light)] text-[var(--gv-text-on-primary)]",
    danger: "bg-gradient-to-r from-[var(--gv-danger)] to-[var(--gv-danger-light)] text-[var(--gv-text-on-primary)]",
  };
  return (
    <button {...props} className={`gv-btn inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]}`}>
      {children}
    </button>
  );
}

function ProgressBar({ value, target }) {
  const percent = Math.min(100, Math.round((Number(value || 0) / Math.max(Number(target || 1), 1)) * 100));
  const barColor = percent >= 80
    ? "from-[var(--gv-success)] to-[var(--gv-success-light)]"
    : percent >= 40
      ? "from-[var(--gv-warning)] to-[var(--gv-warning-light)]"
      : "from-[var(--gv-danger)] to-[var(--gv-danger-light)]";
  return (
    <div className="grid gap-1">
      <div className="h-2 overflow-hidden rounded-full bg-[var(--gv-surface-alt)]">
        <div className={`gv-progress-fill h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-[var(--gv-text-muted)]">{percent}%</span>
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
    <div className="gv-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-[var(--gv-overlay)] px-4 py-8 backdrop-blur-sm">
      <div className="gv-modal-content max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--gv-border)] bg-[var(--gv-surface)] shadow-[var(--gv-shadow-xl)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--gv-border)] px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-[var(--gv-text)]">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-[var(--gv-text-muted)]">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="gv-btn inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--gv-text-muted)] transition hover:bg-[var(--gv-danger-surface)] hover:text-[var(--gv-danger)]" aria-label="Close modal">
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

function GoalsTable({ goals, onApprove, onReject, onProgress, onSubmitCheckin, onUnlock, onAdminEdit, compact = false }) {
  if (!goals?.length) return <EmptyState>No goals match this view yet.</EmptyState>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--gv-border)] text-xs uppercase text-[var(--gv-text-muted)]">
          <tr>
            <th className="px-3 py-3">Goal</th>
            <th className="px-3 py-3">Owner</th>
            <th className="px-3 py-3">Progress</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Approval</th>
            {!compact ? <th className="px-3 py-3">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--gv-border)]">
          {goals.map((goal) => (
            <tr key={goal.id} className="gv-table-row align-top">
              <td className="px-3 py-4">
                <p className="font-semibold text-[var(--gv-text)]">{goal.title}</p>
                <p className="mt-1 max-w-md text-xs text-[var(--gv-text-muted)]">{goal.thrustArea} · {goal.weightage}% weightage</p>
                <p className="mt-1 max-w-md text-xs text-[var(--gv-text-muted)]">{goal.description}</p>
                {goal.managerComment ? <p className="mt-2 text-xs text-[var(--gv-accent)]">Manager: {goal.managerComment}</p> : null}
              </td>
              <td className="px-3 py-4 text-[var(--gv-text-secondary)]">{goal.owner ? `${goal.owner.firstName} ${goal.owner.lastName}` : "Me"}</td>
              <td className="px-3 py-4 min-w-40">
                <ProgressBar value={goal.progress} target={goal.targetValue} />
                <p className="mt-1 text-xs text-[var(--gv-text-muted)]">{goal.progress}/{goal.targetValue || "deadline"} · {unitLabels[goal.unit] || goal.unit}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--gv-text-secondary)]">{scoreText(goal)}</p>
              </td>
              <td className="px-3 py-4"><Badge tone={goal.status === "COMPLETED" ? "green" : goal.status === "AT_RISK" ? "red" : "blue"}>{goal.status}</Badge></td>
              <td className="px-3 py-4"><Badge tone={goal.approvalStatus === "APPROVED" ? "green" : goal.approvalStatus === "REJECTED" ? "red" : "yellow"}>{goal.approvalStatus}</Badge></td>
              {!compact ? (
                <td className="px-3 py-4">
                  <div className="flex flex-wrap gap-2">
                    {onApprove && goal.approvalStatus === "PENDING" ? <Button variant="success" onClick={() => onApprove(goal)}>Approve</Button> : null}
                    {onReject && goal.approvalStatus === "PENDING" ? <Button variant="danger" onClick={() => onReject(goal)}>Reject</Button> : null}
                    {onProgress && !goal.lockedAt && ["ACTIVE", "PAUSED", "AT_RISK"].includes(goal.status) ? <Button variant="secondary" onClick={() => onProgress(goal)}>Update</Button> : null}
                    {onSubmitCheckin && ["ACTIVE", "PAUSED", "AT_RISK", "COMPLETED"].includes(goal.status) ? <Button onClick={() => onSubmitCheckin(goal)}>Submit</Button> : null}
                    {onUnlock && goal.approvalStatus === "APPROVED" ? <Button variant="secondary" onClick={() => onUnlock(goal)}><Unlock size={15} />Unlock</Button> : null}
                    {onAdminEdit && goal.approvalStatus === "APPROVED" ? <Button onClick={() => onAdminEdit(goal)}>Edit</Button> : null}
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
  const [auditLogs, setAuditLogs] = useState([]);
  const [governance, setGovernance] = useState({ cycles: [], windows: [] });
  const [hrAnalytics, setHrAnalytics] = useState(null);
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
        const [departmentData, userData, auditData, cycleData, windowData, qoqData, heatmapData, distributionData, managerEffectivenessData] = await Promise.all([
          apiRequest("/departments"),
          apiRequest("/users"),
          apiRequest("/audit-trail"),
          apiRequest("/governance/cycles"),
          apiRequest(`/governance/checkin-windows?cycleYear=${filters.year}`),
          apiRequest(`/analytics/qoq-achievement?cycleYear=${filters.year}&level=department`),
          apiRequest(`/analytics/completion-heatmap?cycleYear=${filters.year}`),
          apiRequest(`/analytics/goal-distribution?cycleYear=${filters.year}`),
          apiRequest(`/analytics/manager-effectiveness?cycleYear=${filters.year}`),
        ]);
        setDepartments(departmentData);
        setUsers(userData);
        setAuditLogs(auditData);
        setGovernance({ cycles: cycleData, windows: windowData });
        setHrAnalytics({ qoq: qoqData, heatmap: heatmapData, distribution: distributionData, managerEffectiveness: managerEffectivenessData });
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
    return <div className="gv-card rounded-xl border border-[var(--gv-border)] bg-[var(--gv-surface)] p-8 text-sm text-[var(--gv-text-muted)]">Loading Goalverse workspace...</div>;
  }

  statIndex = 0;
  return (
    <section className="grid gap-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="bg-gradient-to-r from-[var(--gv-primary)] to-[var(--gv-primary-light)] bg-clip-text text-sm font-semibold uppercase tracking-wide text-transparent">Goalverse</p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--gv-text)]">{role === "HR_ADMIN" ? "HR Command Center" : role === "MANAGER" ? "Manager Team Workspace" : "My Goal Workspace"}</h1>
          <p className="mt-2 text-sm text-[var(--gv-text-secondary)]">Signed in as {user?.firstName} {user?.lastName}. Demo password for seeded users is Password@123.</p>
        </div>
        <Filters filters={filters} setFilters={setFilters} reload={load} />
      </div>

      {message ? <div className="rounded-md border border-[var(--gv-success-light)] bg-[var(--gv-success-surface)] px-4 py-3 text-sm text-[var(--gv-success)]">{message}</div> : null}
      {error ? <div className="rounded-md border border-[var(--gv-danger-light)] bg-[var(--gv-danger-surface)] px-4 py-3 text-sm text-[var(--gv-danger)]">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard title="Total goals" value={stats.total || 0} caption="Visible in selected period" icon={Flag} />
        <StatCard title="Active" value={stats.active || 0} caption="Approved work in motion" icon={Activity} />
        <StatCard title="Pending" value={stats.pending || 0} caption="Awaiting manager approval" icon={Clock3} />
        <StatCard title="Completed" value={stats.completed || 0} caption="Finished goals" icon={CheckCircle2} />
      </div>

      {role === "HR_ADMIN" ? <HrWorkspace departments={departments} users={users} goals={goals} auditLogs={auditLogs} governance={governance} analytics={hrAnalytics} filters={filters} runAction={runAction} /> : null}
      {role === "MANAGER" ? <ManagerWorkspace goals={goals} checkins={checkins} team={data?.team || []} filters={filters} runAction={runAction} /> : null}
      {role === "EMPLOYEE" ? <EmployeeWorkspace goals={goals} checkins={checkins} filters={filters} runAction={runAction} /> : null}
    </section>
  );
}

function HrWorkspace({ departments, users, goals, auditLogs, governance, analytics, filters, runAction }) {
  const [departmentName, setDepartmentName] = useState("");
  const [userForm, setUserForm] = useState({ firstName: "", lastName: "", email: "", password: "Password@123", role: "EMPLOYEE", departmentId: "", managerId: "", jobTitle: "" });
  const [sharedGoalForm, setSharedGoalForm] = useState({ employeeIds: [], primaryOwnerId: "", thrustArea: "Business Impact", title: "", description: "", targetValue: 100, weightage: 10, unit: "MIN", cycleYear: filters.year, dueDate: "" });
  const [qoqFilter, setQoqFilter] = useState({ level: "department", id: "" });
  const [qoqData, setQoqData] = useState(analytics?.qoq || []);
  const [modal, setModal] = useState(null);
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
  const activeCycle = governance.cycles.find((cycle) => Number(cycle.year) === Number(filters.year));
  const windowByQuarter = Object.fromEntries(governance.windows.map((window) => [window.quarter, window]));
  const employees = users.filter((item) => item.role === "EMPLOYEE");

  useEffect(() => {
    setSharedGoalForm((current) => ({ ...current, cycleYear: filters.year }));
  }, [filters.year]);

  useEffect(() => {
    setQoqData(analytics?.qoq || []);
  }, [analytics?.qoq]);

  async function refreshQoqTrend(nextFilter = qoqFilter) {
    const params = new URLSearchParams({ cycleYear: filters.year, level: nextFilter.level });
    if (nextFilter.id) params.set("id", nextFilter.id);
    const data = await apiRequest(`/analytics/qoq-achievement?${params.toString()}`);
    setQoqData(data);
  }

  function unlockGoal(goal) {
    setModal({ type: "unlock", goal, form: { reason: "Approved HR exception for post-lock correction.", durationHours: 24 } });
  }

  function editGoal(goal) {
    setModal({
      type: "adminEdit",
      goal,
      form: {
        title: goal.title,
        description: goal.description || "",
        targetValue: goal.targetValue || 0,
        unit: goal.unit,
        quarter: goal.quarter,
        year: goal.year,
        dueDate: formatDateInput(goal.dueDate),
        progress: goal.progress || 0,
        status: goal.status,
        priority: goal.priority,
        employeeNote: goal.employeeNote || "",
        managerComment: goal.managerComment || "",
      },
    });
  }

  function updateModalForm(field, value) {
    setModal((current) => ({ ...current, form: { ...current.form, [field]: value } }));
  }

  async function submitHrModal(event) {
    event.preventDefault();
    if (modal.type === "unlock") {
      await runAction(
        () => apiRequest(`/goals/${modal.goal.id}/unlock`, { method: "PATCH", body: modal.form }),
        "Goal unlocked for HR exception",
      );
    }
    if (modal.type === "adminEdit") {
      await runAction(
        () => apiRequest(`/goals/${modal.goal.id}/admin-update`, { method: "PATCH", body: modal.form }),
        "Locked goal exception saved",
      );
    }
    setModal(null);
  }

  async function exportAchievementReport() {
    await runAction(
      () => downloadReport(`/reports/achievement.csv?quarter=${filters.quarter}&year=${filters.year}`, `goalverse-achievement-report-q${filters.quarter}-${filters.year}.csv`),
      "Achievement report downloaded",
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Cycle And Check-in Controls" actions={<Badge tone={activeCycle?.isGoalSettingOpen ? "green" : "slate"}>{activeCycle?.isGoalSettingOpen ? "Goal cycle open" : "Goal cycle closed"}</Badge>}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-4">
            <p className="font-semibold text-[var(--gv-text)]">Annual Goal Cycle</p>
            <p className="mt-1 text-sm text-[var(--gv-text-secondary)]">Goal creation opens from 1 May, but HR can override for demo or exception windows.</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => runAction(() => apiRequest("/governance/cycle", { method: "PATCH", body: { year: Number(filters.year), isGoalSettingOpen: true } }), "Goal cycle opened")}>Open</Button>
              <Button variant="secondary" onClick={() => runAction(() => apiRequest("/governance/cycle", { method: "PATCH", body: { year: Number(filters.year), isGoalSettingOpen: false } }), "Goal cycle closed")}>Close</Button>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-4">
            <p className="font-semibold text-[var(--gv-text)]">Quarterly Check-in Windows</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((quarter) => {
                const isOpen = Boolean(windowByQuarter[quarter]?.isOpen);
                return (
                  <Button
                    key={quarter}
                    variant={isOpen ? "success" : "secondary"}
                    onClick={() => runAction(
                      () => apiRequest("/governance/checkin-window", { method: "PATCH", body: { cycleYear: Number(filters.year), quarter, isOpen: !isOpen } }),
                      `Q${quarter} check-in ${isOpen ? "closed" : "opened"}`,
                    )}
                  >
                    Q{quarter}: {isOpen ? "Open" : "Closed"}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Achievement Report" actions={<Button onClick={exportAchievementReport}><Download size={16} />Export CSV</Button>}>
        <div className="grid gap-3 text-sm text-[var(--gv-text-secondary)] md:grid-cols-3">
          <div className="rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-4">
            <p className="font-semibold text-[var(--gv-text)]">Rows</p>
            <p className="mt-1">{goals.length} employee goals for Q{filters.quarter} {filters.year}</p>
          </div>
          <div className="rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-4">
            <p className="font-semibold text-[var(--gv-text)]">Planned Fields</p>
            <p className="mt-1">Target, unit, deadline, period, priority</p>
          </div>
          <div className="rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-4">
            <p className="font-semibold text-[var(--gv-text)]">Actual Fields</p>
            <p className="mt-1">Progress, score, status, check-in notes</p>
          </div>
        </div>
      </Panel>

      <Panel id="create-department" title="Create Department" actions={<Badge tone="blue">{departments.length} departments</Badge>}>
        <div className="rounded-lg border border-[var(--gv-accent-light)] bg-[var(--gv-info-surface)] p-4">
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
        <div className="rounded-lg border border-[var(--gv-success-light)] bg-[var(--gv-success-surface)] p-4">
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

      <Panel title="Push Shared Department KPI" actions={<Badge tone="blue">Shared goals</Badge>}>
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          runAction(() => apiRequest("/shared-goals", { method: "POST", body: sharedGoalForm }), "Shared goal pushed");
          setSharedGoalForm({ employeeIds: [], primaryOwnerId: "", thrustArea: "Business Impact", title: "", description: "", targetValue: 100, weightage: 10, unit: "MIN", cycleYear: filters.year, dueDate: "" });
        }}>
          <div className="grid gap-3 md:grid-cols-2">
            <Select label="Primary owner" value={sharedGoalForm.primaryOwnerId} onChange={(event) => {
              const primaryOwnerId = event.target.value;
              setSharedGoalForm((current) => ({
                ...current,
                primaryOwnerId,
                employeeIds: current.employeeIds.includes(primaryOwnerId) ? current.employeeIds : [...current.employeeIds, primaryOwnerId],
              }));
            }} required>
              <option value="">Select employee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
            </Select>
            <Select label="Thrust Area" value={sharedGoalForm.thrustArea} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, thrustArea: event.target.value })}>
              {thrustAreaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
            </Select>
            <Input label="Goal title" value={sharedGoalForm.title} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, title: event.target.value })} required />
            <Select label="UoM" value={sharedGoalForm.unit} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, unit: event.target.value })}>
              {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            {["MIN", "MAX"].includes(sharedGoalForm.unit) ? <Input label="Target" type="number" value={sharedGoalForm.targetValue} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, targetValue: event.target.value })} required /> : null}
            <Input label="Default weightage %" type="number" min="10" max="100" value={sharedGoalForm.weightage} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, weightage: event.target.value })} required />
            <Input label="Deadline" type="date" value={sharedGoalForm.dueDate} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, dueDate: event.target.value })} />
          </div>
          <Textarea label="Description" value={sharedGoalForm.description} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, description: event.target.value })} />
          <div className="grid gap-2 rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-3">
            <p className="text-sm font-semibold text-[var(--gv-text)]">Recipients</p>
            <div className="grid gap-2 md:grid-cols-2">
              {employees.map((employee) => (
                <label key={employee.id} className="flex items-center gap-2 text-sm text-[var(--gv-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={sharedGoalForm.employeeIds.includes(employee.id)}
                    onChange={(event) => setSharedGoalForm((current) => ({
                      ...current,
                      employeeIds: event.target.checked ? [...new Set([...current.employeeIds, employee.id])] : current.employeeIds.filter((id) => id !== employee.id),
                    }))}
                  />
                  {employee.firstName} {employee.lastName}
                </label>
              ))}
            </div>
          </div>
          <Button><Plus size={16} />Push shared KPI</Button>
        </form>
      </Panel>

      <Panel title="Completion Rate By Department">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentCompletion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="completion" fill="var(--gv-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Goal Status Distribution">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} label>
                {statusDistribution.map((entry, index) => <Cell key={entry.name} fill={chartFills[index]} />)}
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
              <Bar dataKey="goals" fill="var(--gv-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="QoQ Achievement Trend" actions={
        <div className="flex gap-2">
          <Select label="Level" value={qoqFilter.level} onChange={(event) => {
            const next = { level: event.target.value, id: "" };
            setQoqFilter(next);
            refreshQoqTrend(next);
          }}>
            <option value="individual">Individual</option>
            <option value="team">Team</option>
            <option value="department">Department</option>
          </Select>
          <Select label="Selection" value={qoqFilter.id} onChange={(event) => {
            const next = { ...qoqFilter, id: event.target.value };
            setQoqFilter(next);
            refreshQoqTrend(next);
          }}>
            <option value="">All</option>
            {qoqFilter.level === "individual" ? employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>) : null}
            {qoqFilter.level === "team" ? users.filter((item) => item.role === "MANAGER").map((manager) => <option key={manager.id} value={manager.id}>{manager.firstName} {manager.lastName}</option>) : null}
            {qoqFilter.level === "department" ? departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>) : null}
          </Select>
        </div>
      }>
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={qoqData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="var(--gv-primary)" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Completion Rate Heatmap">
        <div className="grid gap-3">
          <div className="grid grid-cols-[1fr_repeat(4,80px)] gap-2 text-xs font-semibold text-[var(--gv-text-secondary)]">
            <span>Department</span>
            {[1, 2, 3, 4].map((quarter) => <span key={quarter} className="text-center">Q{quarter}</span>)}
          </div>
          {(analytics?.heatmap || []).map((row) => (
            <div key={row.departmentId} className="grid grid-cols-[1fr_repeat(4,80px)] items-center gap-2">
              <span className="text-sm font-semibold text-[var(--gv-text)]">{row.department}</span>
              {row.quarters.map((cell) => (
                <span
                  key={`${row.departmentId}-${cell.quarter}`}
                  className={`rounded-md px-2 py-3 text-center text-xs font-bold ${cell.completionRate >= 80 ? "bg-[var(--gv-success-surface)] text-[var(--gv-success)]" : cell.completionRate >= 50 ? "bg-[var(--gv-warning-surface)] text-[var(--gv-warning)]" : "bg-[var(--gv-danger-surface)] text-[var(--gv-danger)]"}`}
                >
                  {cell.completionRate}%
                </span>
              ))}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Goal Distribution Analysis">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ["By Thrust Area", analytics?.distribution?.thrustArea || []],
            ["By UoM Type", analytics?.distribution?.uomType || []],
            ["By Status", analytics?.distribution?.status || []],
          ].map(([title, data]) => (
            <div key={title} className="h-72 min-w-0">
              <p className="mb-2 text-sm font-semibold text-[var(--gv-text)]">{title}</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} label>
                    {data.map((entry, index) => <Cell key={entry.name} fill={chartFills[index % chartFills.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Manager Effectiveness Dashboard">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.managerEffectiveness || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="manager" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="completionRate" fill="var(--gv-success)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Department Stats">
        <div className="grid gap-3">
          {departments.map((department) => (
            <div key={department.id} className="gv-list-item grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border border-[var(--gv-border)] px-4 py-3">
              <div><p className="font-semibold text-[var(--gv-text)]">{department.name}</p><p className="text-xs text-[var(--gv-text-muted)]">Managers and employees mapped by HR</p></div>
              <Badge tone="blue">{department.users?.filter((item) => item.role === "MANAGER").length || 0} managers</Badge>
              <Badge tone="green">{department.users?.filter((item) => item.role === "EMPLOYEE").length || 0} employees</Badge>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Audit Trail" actions={<Badge tone="slate">{auditLogs.length} post-lock events</Badge>}>
        {auditLogs.length ? (
          <div className="grid gap-3">
            {auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="gv-list-item rounded-lg border border-[var(--gv-border)] px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--gv-text)]">{log.goal?.title || "Goal change"}</p>
                    <p className="mt-1 text-sm text-[var(--gv-text-secondary)]">
                      {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "System"} - {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge tone={log.action.includes("unlocked") ? "yellow" : "blue"}>{log.action.replace("goal.audit.", "")}</Badge>
                </div>
                {log.metadata?.changes?.length ? (
                  <div className="mt-3 grid gap-2 text-xs text-[var(--gv-text-secondary)]">
                    {log.metadata.changes.map((change) => (
                      <p key={`${log.id}-${change.field}`}><span className="font-semibold text-[var(--gv-text)]">{change.field}</span>: {String(change.oldValue ?? "")} {"->"} {String(change.newValue ?? "")}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[var(--gv-text-secondary)]">{log.summary}</p>
                )}
              </div>
            ))}
          </div>
        ) : <EmptyState>No locked-goal changes have been recorded for this cycle.</EmptyState>}
      </Panel>

      <Panel title="All Goals" actions={<Badge tone="yellow">Unlock before exception edits</Badge>}>
        <GoalsTable goals={goals} onUnlock={unlockGoal} onAdminEdit={editGoal} />
      </Panel>
      {modal ? (
        <Modal
          title={modal.type === "unlock" ? "Unlock Goal Exception" : "Edit Unlocked Goal"}
          subtitle={modal.type === "unlock" ? "Reason and duration are required." : "Post-lock field changes"}
          onClose={() => setModal(null)}
        >
          <form className="grid gap-4" onSubmit={submitHrModal}>
            {modal.type === "unlock" ? (
              <>
                <div className="rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-4 text-sm text-[var(--gv-text-secondary)]">
                  <p className="font-semibold text-[var(--gv-text)]">{modal.goal.title}</p>
                  <p className="mt-1">Locked on {modal.goal.lockedAt || modal.goal.approvedAt ? new Date(modal.goal.lockedAt || modal.goal.approvedAt).toLocaleString() : "approval"}.</p>
                </div>
                <Textarea label="Exception reason" value={modal.form.reason} onChange={(event) => updateModalForm("reason", event.target.value)} required />
                <Input label="Unlock duration hours" type="number" min="1" max="168" value={modal.form.durationHours} onChange={(event) => updateModalForm("durationHours", event.target.value)} required />
              </>
            ) : null}

            {modal.type === "adminEdit" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Goal title" value={modal.form.title} onChange={(event) => updateModalForm("title", event.target.value)} required />
                <Select label="Unit" value={modal.form.unit} onChange={(event) => updateModalForm("unit", event.target.value)}>
                  {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
                {["MIN", "MAX"].includes(modal.form.unit) ? (
                  <Input label="Target value" type="number" min="0" value={modal.form.targetValue} onChange={(event) => updateModalForm("targetValue", event.target.value)} required />
                ) : null}
                <Input label="Progress" type="number" min="0" value={modal.form.progress} onChange={(event) => updateModalForm("progress", event.target.value)} />
                <Select label="Status" value={modal.form.status} onChange={(event) => updateModalForm("status", event.target.value)}>
                  {["ACTIVE", "PAUSED", "AT_RISK", "COMPLETED", "SUBMITTED"].map((status) => <option key={status} value={status}>{status}</option>)}
                </Select>
                <Select label="Priority" value={modal.form.priority} onChange={(event) => updateModalForm("priority", event.target.value)}>
                  {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </Select>
                <Input label="Quarter" type="number" min="1" max="4" value={modal.form.quarter} onChange={(event) => updateModalForm("quarter", event.target.value)} />
                <Input label="Year" type="number" value={modal.form.year} onChange={(event) => updateModalForm("year", event.target.value)} />
                <Input label="Deadline" type="date" value={modal.form.dueDate} onChange={(event) => updateModalForm("dueDate", event.target.value)} />
                <Textarea label="Description" value={modal.form.description} onChange={(event) => updateModalForm("description", event.target.value)} />
                <Textarea label="Employee note" value={modal.form.employeeNote} onChange={(event) => updateModalForm("employeeNote", event.target.value)} />
                <Textarea label="Manager comment" value={modal.form.managerComment} onChange={(event) => updateModalForm("managerComment", event.target.value)} />
              </div>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-[var(--gv-border)] pt-4">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit">{modal.type === "unlock" ? "Unlock goal" : "Save exception edit"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function ManagerWorkspace({ goals, checkins, team, filters, runAction }) {
  const pending = goals.filter((goal) => goal.approvalStatus === "PENDING");
  const pendingSheets = Object.values(
    pending.filter((goal) => goal.submittedAt).reduce((acc, goal) => {
      const ownerId = goal.owner?.id || goal.ownerId;
      acc[ownerId] = acc[ownerId] || { owner: goal.owner, goals: [] };
      acc[ownerId].goals.push(goal);
      return acc;
    }, {}),
  );
  const submitted = checkins.filter((checkin) => checkin.submissionStatus === "submitted");
  const [modal, setModal] = useState(null);
  const [sharedGoalForm, setSharedGoalForm] = useState({ employeeIds: [], primaryOwnerId: "", thrustArea: "Business Impact", title: "", description: "", targetValue: 100, weightage: 10, unit: "MIN", cycleYear: filters.year, dueDate: "" });

  function approve(goal) {
    setModal({
      type: "approve",
      goal,
      form: {
        title: goal.title,
        description: goal.description || "",
        targetValue: goal.targetValue || 0,
        weightage: goal.weightage || 10,
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

  function approveSheet(sheet) {
    setModal({
      type: "approveSheet",
      sheet,
      form: {
        managerComment: "Approved for this annual cycle.",
        goals: sheet.goals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          targetValue: goal.targetValue || 0,
          weightage: goal.weightage || 10,
          dueDate: formatDateInput(goal.dueDate),
        })),
      },
    });
  }

  function returnSheet(sheet) {
    setModal({ type: "returnSheet", sheet, form: { managerComment: "Please rebalance goal weightages and resubmit." } });
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
    if (modal.type === "approveSheet") {
      await runAction(
        () => apiRequest(`/goal-sheets/${modal.sheet.owner.id}/approve`, { method: "PATCH", body: { cycleYear: Number(filters.year), managerComment: modal.form.managerComment, goals: modal.form.goals } }),
        "Goal sheet approved and locked",
      );
    }
    if (modal.type === "returnSheet") {
      await runAction(
        () => apiRequest(`/goal-sheets/${modal.sheet.owner.id}/return`, { method: "PATCH", body: { cycleYear: Number(filters.year), managerComment: modal.form.managerComment } }),
        "Goal sheet returned for rework",
      );
    }
    setModal(null);
  }

  return (
    <div className="grid gap-6">
      <Panel id="pending-sheets" title="Pending Goal Sheets" actions={<Badge tone="yellow">{pendingSheets.length} sheets</Badge>}>
        {pendingSheets.length ? (
          <div className="grid gap-3">
            {pendingSheets.map((sheet) => (
              <div key={sheet.owner.id} className="rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--gv-text)]">{sheet.owner.firstName} {sheet.owner.lastName}</p>
                    <p className="text-sm text-[var(--gv-text-secondary)]">{sheet.goals.length} goals · {sheet.goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0)}% weightage</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => returnSheet(sheet)}>Return</Button>
                    <Button onClick={() => approveSheet(sheet)}>Review Sheet</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState>No submitted annual goal sheets are waiting.</EmptyState>}
      </Panel>

      <Panel id="pending-approvals" title="Pending Approvals" actions={<Badge tone="yellow">{pending.length} pending</Badge>}>
        <GoalsTable goals={pending} onApprove={approve} onReject={reject} />
      </Panel>
      <Panel title="Push Shared KPI To Team">
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          runAction(() => apiRequest("/shared-goals", { method: "POST", body: sharedGoalForm }), "Shared goal pushed to team");
          setSharedGoalForm({ employeeIds: [], primaryOwnerId: "", thrustArea: "Business Impact", title: "", description: "", targetValue: 100, weightage: 10, unit: "MIN", cycleYear: filters.year, dueDate: "" });
        }}>
          <div className="grid gap-3 md:grid-cols-2">
            <Select label="Primary owner" value={sharedGoalForm.primaryOwnerId} onChange={(event) => {
              const primaryOwnerId = event.target.value;
              setSharedGoalForm((current) => ({ ...current, primaryOwnerId, employeeIds: current.employeeIds.includes(primaryOwnerId) ? current.employeeIds : [...current.employeeIds, primaryOwnerId] }));
            }} required>
              <option value="">Select direct report</option>
              {team.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}</option>)}
            </Select>
            <Select label="Thrust Area" value={sharedGoalForm.thrustArea} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, thrustArea: event.target.value })}>
              {thrustAreaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
            </Select>
            <Input label="Goal title" value={sharedGoalForm.title} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, title: event.target.value })} required />
            <Input label="Target" type="number" value={sharedGoalForm.targetValue} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, targetValue: event.target.value })} required />
            <Input label="Weightage %" type="number" min="10" max="100" value={sharedGoalForm.weightage} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, weightage: event.target.value })} required />
            <Select label="UoM" value={sharedGoalForm.unit} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, unit: event.target.value })}>
              {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
          <Textarea label="Description" value={sharedGoalForm.description} onChange={(event) => setSharedGoalForm({ ...sharedGoalForm, description: event.target.value })} />
          <div className="grid gap-2 md:grid-cols-2">
            {team.map((employee) => (
              <label key={employee.id} className="flex items-center gap-2 text-sm text-[var(--gv-text-secondary)]">
                <input
                  type="checkbox"
                  checked={sharedGoalForm.employeeIds.includes(employee.id)}
                  onChange={(event) => setSharedGoalForm((current) => ({
                    ...current,
                    employeeIds: event.target.checked ? [...new Set([...current.employeeIds, employee.id])] : current.employeeIds.filter((id) => id !== employee.id),
                  }))}
                />
                {employee.firstName} {employee.lastName}
              </label>
            ))}
          </div>
          <Button><Plus size={16} />Push shared KPI</Button>
        </form>
      </Panel>
      <Panel id="submitted-checkins" title="Submitted Quarterly Check-ins" actions={<Badge tone="blue">{submitted.length} ready</Badge>}>
        {submitted.length ? (
          <div className="grid gap-3">
            {submitted.map((checkin) => (
              <div key={checkin.id} className="gv-list-item grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-[var(--gv-border)] px-4 py-3">
                <div>
                  <p className="font-semibold text-[var(--gv-text)]">{checkin.goal?.title}</p>
                  <p className="text-sm text-[var(--gv-text-muted)]">{checkin.submittedBy?.firstName} {checkin.submittedBy?.lastName}: {checkin.progress}% progress. {checkin.wins}</p>
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
          title={modal.type === "approveSheet" ? "Review Annual Goal Sheet" : modal.type === "returnSheet" ? "Return Goal Sheet" : modal.type === "approve" ? "Review Pending Goal" : modal.type === "reject" ? "Reject Goal Request" : "Review Quarterly Check-in"}
          subtitle={modal.type === "approveSheet" ? "Edit targets or weightages before approval. Total weightage must remain 100%." : modal.type === "approve" ? "Review employee input, adjust fields if needed, then set manager priority and deadline." : "Add clear manager feedback before saving."}
          onClose={() => setModal(null)}
        >
          <form className="grid gap-5" onSubmit={submitManagerModal}>
            {modal.type === "approveSheet" ? (
              <>
                <div className="grid gap-3">
                  {modal.form.goals.map((goal, index) => (
                    <div key={goal.id} className="grid gap-3 rounded-lg border border-[var(--gv-border)] p-3 md:grid-cols-[1fr_120px_150px]">
                      <p className="font-semibold text-[var(--gv-text)]">{goal.title}</p>
                      <Input label="Target" type="number" value={goal.targetValue} onChange={(event) => setModal((current) => {
                        const goals = [...current.form.goals];
                        goals[index] = { ...goals[index], targetValue: event.target.value };
                        return { ...current, form: { ...current.form, goals } };
                      })} />
                      <Input label="Weightage %" type="number" min="10" max="100" value={goal.weightage} onChange={(event) => setModal((current) => {
                        const goals = [...current.form.goals];
                        goals[index] = { ...goals[index], weightage: event.target.value };
                        return { ...current, form: { ...current.form, goals } };
                      })} />
                    </div>
                  ))}
                </div>
                <Input label="Manager comment" value={modal.form.managerComment} onChange={(event) => updateModalForm("managerComment", event.target.value)} />
              </>
            ) : null}

            {modal.type === "returnSheet" ? (
              <Textarea label="Rework instructions" value={modal.form.managerComment} onChange={(event) => updateModalForm("managerComment", event.target.value)} required />
            ) : null}

            {modal.type === "approve" ? (
              <>
                <div className="rounded-lg border border-[var(--gv-accent-light)] bg-[var(--gv-info-surface)] p-4">
                  <h4 className="font-semibold text-[var(--gv-text)]">Employee Submitted Fields</h4>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--gv-text-secondary)] md:grid-cols-2">
                    <p><span className="font-semibold">Employee:</span> {modal.goal.owner?.firstName} {modal.goal.owner?.lastName}</p>
                    <p><span className="font-semibold">Unit:</span> {unitLabels[modal.goal.unit]}</p>
                    <p><span className="font-semibold">Target:</span> {modal.goal.targetValue || "Timeline/Zero based"}</p>
                    <p><span className="font-semibold">Period:</span> Q{modal.goal.quarter} {modal.goal.year}</p>
                    <p className="md:col-span-2"><span className="font-semibold">Description:</span> {modal.goal.description}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--gv-border)] p-4">
                  <h4 className="font-semibold text-[var(--gv-text)]">Manager Edits To Goal Fields</h4>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Input label="Goal title" value={modal.form.title} onChange={(event) => updateModalForm("title", event.target.value)} required />
                    <Select label="Unit of measurement" value={modal.form.unit} onChange={(event) => updateModalForm("unit", event.target.value)}>
                      {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                    {["MIN", "MAX"].includes(modal.form.unit) ? (
                      <Input label="Target value" type="number" min="0" value={modal.form.targetValue} onChange={(event) => updateModalForm("targetValue", event.target.value)} required />
                    ) : null}
                    <Input label="Weightage %" type="number" min="10" max="100" value={modal.form.weightage} onChange={(event) => updateModalForm("weightage", event.target.value)} required />
                    <Input label="Quarter" type="number" min="1" max="4" value={modal.form.quarter} onChange={(event) => updateModalForm("quarter", event.target.value)} required />
                    <Input label="Year" type="number" value={modal.form.year} onChange={(event) => updateModalForm("year", event.target.value)} required />
                    <Textarea label="Description" value={modal.form.description} onChange={(event) => updateModalForm("description", event.target.value)} />
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--gv-success-light)] bg-[var(--gv-success-surface)] p-4">
                  <h4 className="font-semibold text-[var(--gv-text)]">Priority Weightage And Deadline</h4>
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
                <div className="rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-4 text-sm text-[var(--gv-text-secondary)]">
                  <p className="font-semibold text-[var(--gv-text)]">{modal.checkin.goal?.title}</p>
                  <p className="mt-1">{modal.checkin.submittedBy?.firstName} {modal.checkin.submittedBy?.lastName} submitted {modal.checkin.progress}% progress.</p>
                  <p className="mt-2">{modal.checkin.wins}</p>
                </div>
                <Textarea label="Manager feedback" value={modal.form.reviewerNotes} onChange={(event) => updateModalForm("reviewerNotes", event.target.value)} required />
              </>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-[var(--gv-border)] pt-4">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit">{modal.type === "approveSheet" ? "Approve sheet" : modal.type === "returnSheet" ? "Return sheet" : modal.type === "approve" ? "Approve goal" : modal.type === "reject" ? "Reject goal" : "Submit review"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function EmployeeWorkspace({ goals, checkins, filters, runAction }) {
  const [goalForm, setGoalForm] = useState({ thrustArea: "Business Impact", title: "", description: "", targetValue: 100, weightage: 10, unit: "MIN", quarter: filters.quarter, year: filters.year, cycleYear: filters.year, dueDate: "" });
  const [modal, setModal] = useState(null);
  const draftGoals = goals.filter((goal) => goal.approvalStatus === "PENDING");
  const draftWeightage = draftGoals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);

  function updateProgress(goal) {
    setModal({ type: "progress", goal, form: { progress: goal.progress || 0, status: goal.unit === "TIMELINE" ? "completed" : "on_track", employeeNote: goal.employeeNote || "Updated from dashboard." } });
  }

  function submitCheckin(goal) {
    setModal({ type: "submit", goal, form: { wins: "Progress submitted for manager review.", blockers: "None noted.", nextSteps: "Continue into next quarter.", status: goal.status === "COMPLETED" ? "completed" : "on_track" } });
  }

  function updateModalForm(field, value) {
    setModal((current) => ({ ...current, form: { ...current.form, [field]: value } }));
  }

  async function submitEmployeeModal(event) {
    event.preventDefault();
    if (modal.type === "progress") {
      await runAction(
        () => apiRequest(`/goals/${modal.goal.id}/progress`, { method: "PATCH", body: { ...modal.form, status: modal.form.status === "completed" ? "COMPLETED" : "ACTIVE", progress: Number(modal.form.progress) } }),
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
          setGoalForm({ thrustArea: "Business Impact", title: "", description: "", targetValue: 100, weightage: 10, unit: "MIN", quarter: filters.quarter, year: filters.year, cycleYear: filters.year, dueDate: "" });
        }}>
          <Select label="Thrust Area" value={goalForm.thrustArea} onChange={(event) => setGoalForm({ ...goalForm, thrustArea: event.target.value })}>
            {thrustAreaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
          </Select>
          <Input label="Goal name" value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} required />
          <Input label="Description" value={goalForm.description} onChange={(event) => setGoalForm({ ...goalForm, description: event.target.value })} required />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Select label="Unit of measurement" value={goalForm.unit} onChange={(event) => setGoalForm({ ...goalForm, unit: event.target.value })}>
              {unitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            {["MIN", "MAX"].includes(goalForm.unit) ? (
              <Input label="Target value" type="number" min="0" value={goalForm.targetValue} onChange={(event) => setGoalForm({ ...goalForm, targetValue: event.target.value })} required />
            ) : null}
            <Input label="Weightage %" type="number" min="10" max="100" value={goalForm.weightage} onChange={(event) => setGoalForm({ ...goalForm, weightage: event.target.value })} required />
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--gv-border)] bg-[var(--gv-surface-alt)] p-3">
          <div className="text-sm text-[var(--gv-text-secondary)]">
            Draft sheet: {draftGoals.length}/8 goals, {draftWeightage}% weightage
          </div>
          <Button
            variant={draftWeightage === 100 ? "primary" : "secondary"}
            disabled={draftWeightage !== 100 || draftGoals.length === 0}
            onClick={() => runAction(() => apiRequest("/goal-sheets/submit", { method: "POST", body: { cycleYear: Number(filters.year) } }), "Goal sheet submitted to manager")}
          >
            Submit Goal Sheet
          </Button>
        </div>
        <GoalsTable goals={goals} onProgress={updateProgress} onSubmitCheckin={submitCheckin} />
      </Panel>
      <Panel title="Manager Feedback">
        {checkins.length ? (
          <div className="grid gap-3">
            {checkins.map((checkin) => (
              <div key={checkin.id} className="gv-list-item rounded-lg border border-[var(--gv-border)] px-4 py-3">
                <p className="font-semibold text-[var(--gv-text)]">{checkin.goal?.title}</p>
                <p className="mt-1 text-sm text-[var(--gv-text-muted)]">{checkin.reviewerNotes || "Submitted. Manager feedback pending."}</p>
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
              <Bar dataKey="progress" fill="var(--gv-primary)" radius={[4, 4, 0, 0]} />
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
                  <div className="rounded-md border border-[var(--gv-accent-light)] bg-[var(--gv-info-surface)] px-4 py-3 text-sm text-[var(--gv-accent)]">Timeline goals are scored by completion on or before the manager deadline.</div>
                )}
                <Select label="Status" value={modal.form.status} onChange={(event) => updateModalForm("status", event.target.value)}>
                  {goalStatusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </Select>
                <Textarea label="Progress note" value={modal.form.employeeNote} onChange={(event) => updateModalForm("employeeNote", event.target.value)} />
              </>
            ) : null}

            {modal.type === "submit" ? (
              <>
                <Select label="Final status" value={modal.form.status} onChange={(event) => updateModalForm("status", event.target.value)}>
                  {goalStatusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </Select>
                <Textarea label="Wins" value={modal.form.wins} onChange={(event) => updateModalForm("wins", event.target.value)} required />
                <Textarea label="Blockers" value={modal.form.blockers} onChange={(event) => updateModalForm("blockers", event.target.value)} />
                <Textarea label="Next steps" value={modal.form.nextSteps} onChange={(event) => updateModalForm("nextSteps", event.target.value)} />
              </>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-[var(--gv-border)] pt-4">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit">{modal.type === "progress" ? "Save progress" : "Submit check-in"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
