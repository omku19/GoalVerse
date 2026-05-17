import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Building2, CheckCircle2, Clock3, Flag, Plus, Send, ShieldCheck, Users } from "lucide-react";
import { apiRequest } from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.js";

const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
const currentYear = new Date().getFullYear();
const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const goalStatusOptions = ["ACTIVE", "PAUSED", "AT_RISK", "COMPLETED"];

function StatCard({ title, value, caption, icon: Icon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[#1E40FF] text-white">
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{caption}</p>
    </div>
  );
}

function Panel({ title, actions, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function Input({ label, ...props }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        {...props}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#1E40FF] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <select
        {...props}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#1E40FF] focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function Button({ children, variant = "primary", ...props }) {
  const variants = {
    primary: "bg-[#1E40FF] text-white hover:bg-blue-800",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button {...props} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]}`}>
      {children}
    </button>
  );
}

function ProgressBar({ value, target }) {
  const percent = Math.min(100, Math.round((Number(value || 0) / Math.max(Number(target || 1), 1)) * 100));
  return (
    <div className="grid gap-1">
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#7EF663]" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-slate-500">{percent}%</span>
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
            <tr key={goal.id} className="align-top">
              <td className="px-3 py-4">
                <p className="font-semibold text-slate-950">{goal.title}</p>
                <p className="mt-1 max-w-md text-xs text-slate-500">{goal.description}</p>
                {goal.managerComment ? <p className="mt-2 text-xs text-blue-700">Manager: {goal.managerComment}</p> : null}
              </td>
              <td className="px-3 py-4 text-slate-600">{goal.owner ? `${goal.owner.firstName} ${goal.owner.lastName}` : "Me"}</td>
              <td className="px-3 py-4 min-w-40">
                <ProgressBar value={goal.progress} target={goal.targetValue} />
                <p className="mt-1 text-xs text-slate-500">{goal.progress}/{goal.targetValue} {goal.unit}</p>
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
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading Goalverse workspace...</div>;
  }

  return (
    <section className="grid gap-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#1E40FF]">Goalverse</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{role === "HR_ADMIN" ? "HR Command Center" : role === "MANAGER" ? "Manager Team Workspace" : "My Goal Workspace"}</h1>
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel title="Organization Setup" actions={<Badge tone="blue">{users.length} users</Badge>}>
        <div className="grid gap-4">
          <form className="flex gap-3" onSubmit={(event) => {
            event.preventDefault();
            runAction(() => apiRequest("/departments", { method: "POST", body: { name: departmentName } }), "Department created");
            setDepartmentName("");
          }}>
            <Input label="Department name" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} placeholder="Design Operations" required />
            <div className="pt-6"><Button><Plus size={16} />Add</Button></div>
          </form>
          <form className="grid gap-3 xl:grid-cols-3" onSubmit={(event) => {
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
            <div className="pt-6"><Button><ShieldCheck size={16} />Create user</Button></div>
          </form>
        </div>
      </Panel>

      <Panel title="Goal Health">
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90} label>
                {chartData.map((entry, index) => <Cell key={entry.name} fill={["#1E40FF", "#f59e0b", "#7EF663", "#ef4444"][index]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Department Stats">
        <div className="grid gap-3">
          {departments.map((department) => (
            <div key={department.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-md border border-slate-200 px-4 py-3">
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

  function approve(goal) {
    const dueDate = window.prompt("Deadline date (YYYY-MM-DD)", "2026-06-30");
    const priority = window.prompt("Priority: LOW, MEDIUM, HIGH, CRITICAL", "HIGH");
    if (!dueDate || !priorityOptions.includes(priority?.toUpperCase())) return;
    runAction(() => apiRequest(`/goals/${goal.id}/approve`, { method: "PATCH", body: { dueDate, priority: priority.toUpperCase(), managerComment: "Approved for this quarter." } }), "Goal approved");
  }

  function reject(goal) {
    const managerComment = window.prompt("Reason for rejection");
    if (!managerComment) return;
    runAction(() => apiRequest(`/goals/${goal.id}/reject`, { method: "PATCH", body: { managerComment } }), "Goal sent back for revision");
  }

  function review(checkin) {
    const reviewerNotes = window.prompt("Manager feedback", "Good progress. Keep focus on the next milestone.");
    if (!reviewerNotes) return;
    runAction(() => apiRequest(`/checkins/${checkin.id}/review`, { method: "PATCH", body: { reviewerNotes } }), "Review submitted");
  }

  return (
    <div className="grid gap-6">
      <Panel title="Pending Approvals" actions={<Badge tone="yellow">{pending.length} pending</Badge>}>
        <GoalsTable goals={pending} onApprove={approve} onReject={reject} />
      </Panel>
      <Panel title="Submitted Quarterly Check-ins" actions={<Badge tone="blue">{submitted.length} ready</Badge>}>
        {submitted.length ? (
          <div className="grid gap-3">
            {submitted.map((checkin) => (
              <div key={checkin.id} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md border border-slate-200 px-4 py-3">
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
    </div>
  );
}

function EmployeeWorkspace({ goals, checkins, filters, runAction }) {
  const [goalForm, setGoalForm] = useState({ title: "", description: "", targetValue: 100, unit: "units", quarter: filters.quarter, year: filters.year });

  function updateProgress(goal) {
    const progress = window.prompt(`Progress out of ${goal.targetValue} ${goal.unit}`, goal.progress || 0);
    const status = window.prompt("Status: ACTIVE, PAUSED, AT_RISK, COMPLETED", goal.status);
    if (progress === null || !goalStatusOptions.includes(status?.toUpperCase())) return;
    runAction(() => apiRequest(`/goals/${goal.id}/progress`, { method: "PATCH", body: { progress: Number(progress), status: status.toUpperCase(), employeeNote: "Updated from dashboard." } }), "Progress updated");
  }

  function submitCheckin(goal) {
    const wins = window.prompt("Quarterly note", "Progress submitted for manager review.");
    if (!wins) return;
    runAction(() => apiRequest("/checkins", { method: "POST", body: { goalId: goal.id, quarter: Number(filters.quarter), year: Number(filters.year), progress: goal.progress, status: goal.status === "COMPLETED" ? "completed" : "delayed", wins, blockers: "None noted.", nextSteps: "Continue into next quarter." } }), "Quarterly check-in submitted");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Create Goal">
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          runAction(() => apiRequest("/goals", { method: "POST", body: goalForm }), "Goal sent to manager for approval");
          setGoalForm({ title: "", description: "", targetValue: 100, unit: "units", quarter: filters.quarter, year: filters.year });
        }}>
          <Input label="Goal name" value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} required />
          <Input label="Description" value={goalForm.description} onChange={(event) => setGoalForm({ ...goalForm, description: event.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target value" type="number" value={goalForm.targetValue} onChange={(event) => setGoalForm({ ...goalForm, targetValue: event.target.value })} required />
            <Input label="Unit" value={goalForm.unit} onChange={(event) => setGoalForm({ ...goalForm, unit: event.target.value })} required />
            <Input label="Quarter" type="number" min="1" max="4" value={goalForm.quarter} onChange={(event) => setGoalForm({ ...goalForm, quarter: event.target.value })} required />
            <Input label="Year" type="number" value={goalForm.year} onChange={(event) => setGoalForm({ ...goalForm, year: event.target.value })} required />
          </div>
          <Button><Plus size={16} />Create goal</Button>
        </form>
      </Panel>
      <Panel title="My Goals">
        <GoalsTable goals={goals} onProgress={updateProgress} onSubmitCheckin={submitCheckin} />
      </Panel>
      <Panel title="Manager Feedback">
        {checkins.length ? (
          <div className="grid gap-3">
            {checkins.map((checkin) => (
              <div key={checkin.id} className="rounded-md border border-slate-200 px-4 py-3">
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
            <BarChart data={goals.map((goal) => ({ name: goal.title.slice(0, 16), progress: Math.round((goal.progress / Math.max(goal.targetValue, 1)) * 100) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="progress" fill="#1E40FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
