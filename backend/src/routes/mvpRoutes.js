import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../config/db.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();
const PASSWORD_ROUNDS = 12;
const roles = {
  hr: "HR_ADMIN",
  manager: "MANAGER",
  employee: "EMPLOYEE",
};
const unitTypes = ["MIN", "MAX", "TIMELINE", "ZERO"];

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function forbidden(message = "Forbidden") {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

function notFound(message = "Not found") {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function parseQuarterYear(query) {
  const quarter = query.quarter ? Number(query.quarter) : undefined;
  const year = query.year ? Number(query.year) : undefined;
  const where = {};

  if (quarter) where.quarter = quarter;
  if (year) where.year = year;

  return where;
}

function userSelect() {
  return {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
    jobTitle: true,
    departmentId: true,
    managerId: true,
    isActive: true,
    department: { select: { id: true, name: true } },
    manager: { select: { id: true, firstName: true, lastName: true, email: true } },
  };
}

function goalInclude() {
  return {
    owner: { select: userSelect() },
    department: { select: { id: true, name: true } },
    quarterlyCheckins: { orderBy: { createdAt: "desc" } },
  };
}

function calculateGoalScore(goal) {
  const unit = String(goal.unit || "").toUpperCase();
  const achievement = Number(goal.progress || 0);
  const target = Number(goal.targetValue || 0);

  if (unit === "MAX") {
    if (achievement <= 0) return { ratio: target > 0 ? 1 : 0, percent: target > 0 ? 100 : 0 };
    const ratio = target / achievement;
    return { ratio, percent: Math.round(ratio * 100) };
  }

  if (unit === "TIMELINE") {
    const isComplete = goal.status === "COMPLETED" || goal.status === "SUBMITTED";
    const completedAt = goal.updatedAt ? new Date(goal.updatedAt) : null;
    const deadline = goal.dueDate ? new Date(goal.dueDate) : null;
    const onTime = Boolean(isComplete && deadline && completedAt && completedAt <= deadline);
    return { ratio: onTime ? 1 : 0, percent: onTime ? 100 : 0 };
  }

  if (unit === "ZERO") {
    const ratio = achievement === 0 ? 1 : 0;
    return { ratio, percent: ratio * 100 };
  }

  const ratio = target > 0 ? achievement / target : 0;
  return { ratio, percent: Math.round(ratio * 100) };
}

function decorateGoal(goal) {
  if (!goal) return goal;
  return {
    ...goal,
    unit: String(goal.unit || "").toUpperCase(),
    score: calculateGoalScore(goal),
  };
}

function decorateGoals(goals) {
  return goals.map(decorateGoal);
}

function csvValue(value) {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows, columns) {
  return [
    columns.map((column) => csvValue(column.header)).join(","),
    ...rows.map((row) => columns.map((column) => csvValue(column.value(row))).join(",")),
  ].join("\n");
}

function normalizeAuditValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === undefined) return null;
  return value;
}

function buildFieldChanges(before, after, fields) {
  return fields
    .map((field) => ({
      field,
      oldValue: normalizeAuditValue(before?.[field]),
      newValue: normalizeAuditValue(after?.[field]),
    }))
    .filter((change) => JSON.stringify(change.oldValue) !== JSON.stringify(change.newValue));
}

function isGoalLocked(goal) {
  return Boolean(goal?.lockedAt || goal?.approvedAt);
}

function isGoalUnlocked(goal) {
  return Boolean(goal?.unlockedUntil && new Date(goal.unlockedUntil) > new Date());
}

async function writePostLockGoalAudit({ actorId, before, after, fields, action = "goal.audit.updated", summary }) {
  if (!isGoalLocked(before)) return null;

  const changes = buildFieldChanges(before, after, fields);
  if (!changes.length) return null;

  return writeLog({
    actorId,
    goalId: before.id,
    departmentId: before.departmentId,
    action,
    entityType: "goal",
    entityId: before.id,
    summary: summary || `${changes.length} locked goal field${changes.length === 1 ? "" : "s"} changed`,
    metadata: {
      lockedAt: before.lockedAt || before.approvedAt,
      changes,
    },
  });
}

async function getUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw forbidden("Inactive or missing user");
  return user;
}

async function ensureGoalAccess(req, goal) {
  const user = await getUser(req.user.id);
  if (user.role === roles.hr) return user;
  if (user.role === roles.employee && goal.ownerId === user.id) return user;
  if (user.role === roles.manager) {
    const owner = await prisma.user.findUnique({ where: { id: goal.ownerId } });
    if (owner?.managerId === user.id || owner?.departmentId === user.departmentId) return user;
  }
  throw forbidden();
}

async function writeLog({ actorId, goalId, departmentId, action, entityType, entityId, summary, metadata }) {
  return prisma.activityLog.create({
    data: { actorId, goalId, departmentId, action, entityType, entityId, summary, metadata },
  });
}

async function notify({ recipientId, actorId, goalId, type, title, message, data = {} }) {
  if (!recipientId) return null;
  return prisma.notification.create({ data: { recipientId, actorId, goalId, type, title, message, data } });
}

const departmentSchema = z.object({ name: z.string().trim().min(2).max(120), description: z.string().optional() });
const userSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["HR_ADMIN", "MANAGER", "EMPLOYEE"]),
  departmentId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  isActive: z.boolean().optional(),
});
const goalSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().max(1000).optional().nullable(),
  thrustArea: z.string().max(100).optional().nullable(),
  targetValue: z.coerce.number().min(0).optional(),
  weightage: z.coerce.number().int().min(10).max(100).optional(),
  unit: z.enum(unitTypes),
  quarter: z.coerce.number().int().min(1).max(4),
  year: z.coerce.number().int().min(2024).max(2035),
  cycleYear: z.coerce.number().int().min(2024).max(2035).optional(),
  dueDate: z.string().optional().nullable(),
});
const adminGoalUpdateSchema = goalSchema.partial().extend({
  progress: z.coerce.number().min(0).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "AT_RISK", "COMPLETED", "SUBMITTED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  employeeNote: z.string().max(500).optional().nullable(),
  managerComment: z.string().max(1000).optional().nullable(),
});
const unlockGoalSchema = z.object({
  reason: z.string().trim().min(5).max(500),
  durationHours: z.coerce.number().int().min(1).max(168).optional().default(24),
});

function normalizeGoalPayload(payload) {
  const unit = String(payload.unit || "").toUpperCase();
  if (["MIN", "MAX"].includes(unit) && (!payload.targetValue || Number(payload.targetValue) <= 0)) {
    throw badRequest("Target value is required for Min and Max unit types");
  }

  if (unit === "TIMELINE" && !payload.dueDate) {
    throw badRequest("Deadline is required for Timeline goals");
  }

  return {
    ...payload,
    unit,
    targetValue: ["TIMELINE", "ZERO"].includes(unit) ? 0 : Number(payload.targetValue),
    dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
  };
}

function normalizeAdminGoalUpdate(payload, existing) {
  const data = { ...payload };
  const nextUnit = String(payload.unit || existing.unit || "").toUpperCase();

  if (payload.unit) {
    data.unit = nextUnit;
  }

  if (payload.targetValue !== undefined) {
    data.targetValue = Number(payload.targetValue);
  }

  if (payload.dueDate !== undefined) {
    data.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  }

  if (["MIN", "MAX"].includes(nextUnit) && data.targetValue !== undefined && Number(data.targetValue) <= 0) {
    throw badRequest("Target value must be greater than zero for Min and Max unit types");
  }

  if (nextUnit === "TIMELINE" && data.dueDate === null) {
    throw badRequest("Deadline is required for Timeline goals");
  }

  return data;
}

router.use(authenticate);

router.get("/departments", authorizeRoles([roles.hr]), asyncHandler(async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: {
      users: { select: { id: true, role: true, isActive: true } },
    },
  });
  res.json({ data: departments });
}));

router.post("/departments", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const payload = departmentSchema.parse(req.body);
  const department = await prisma.department.create({
    data: {
      name: payload.name,
      slug: payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      description: payload.description,
    },
  });
  await writeLog({ actorId: req.user.id, departmentId: department.id, action: "department.created", entityType: "department", entityId: department.id, summary: `Created ${department.name}` });
  res.status(201).json({ data: department });
}));

router.put("/departments/:id", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const payload = departmentSchema.parse(req.body);
  const department = await prisma.department.update({
    where: { id: req.params.id },
    data: { name: payload.name, description: payload.description },
  });
  res.json({ data: department });
}));

router.get("/departments/stats", authorizeRoles([roles.hr]), asyncHandler(async (_req, res) => {
  const departments = await prisma.department.findMany({
    include: { users: true, goals: true },
    orderBy: { name: "asc" },
  });
  const data = departments.map((department) => ({
    id: department.id,
    name: department.name,
    employees: department.users.filter((user) => user.role === roles.employee && user.isActive).length,
    managers: department.users.filter((user) => user.role === roles.manager && user.isActive).length,
    goals: department.goals.length,
    completed: department.goals.filter((goal) => goal.status === "COMPLETED").length,
    delayed: department.goals.filter((goal) => goal.status === "AT_RISK").length,
  }));
  res.json({ data });
}));

router.get("/departments/:id/managers", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const managers = await prisma.user.findMany({
    where: { departmentId: req.params.id, role: roles.manager, isActive: true },
    select: userSelect(),
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  res.json({ data: managers });
}));

router.get("/users", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.role) where.role = String(req.query.role).toUpperCase();
  if (req.query.departmentId) where.departmentId = String(req.query.departmentId);
  const users = await prisma.user.findMany({ where, select: userSelect(), orderBy: [{ role: "asc" }, { firstName: "asc" }] });
  res.json({ data: users });
}));

router.post("/users", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const payload = userSchema.extend({ password: z.string().min(8) }).parse(req.body);
  if (payload.role !== roles.hr && !payload.departmentId) throw badRequest("Department is required");
  if (payload.role === roles.employee && !payload.managerId) throw badRequest("Employee manager is required");
  const passwordHash = await bcrypt.hash(payload.password, PASSWORD_ROUNDS);
  const { password: _password, ...userData } = payload;
  const user = await prisma.user.create({
    data: { ...userData, email: payload.email.toLowerCase(), passwordHash },
    select: userSelect(),
  });
  await writeLog({ actorId: req.user.id, departmentId: user.departmentId, action: "user.created", entityType: "user", entityId: user.id, summary: `Created ${user.email}` });
  res.status(201).json({ data: user });
}));

router.get("/users/:id", authorizeRoles([roles.hr, roles.manager]), asyncHandler(async (req, res) => {
  const authUser = await getUser(req.user.id);
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: userSelect() });
  if (!user) throw notFound("User not found");
  if (authUser.role === roles.manager && user.managerId !== authUser.id && user.id !== authUser.id) throw forbidden();
  res.json({ data: user });
}));

router.put("/users/:id", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const payload = userSchema.partial().parse(req.body);
  const data = { ...payload };
  if (payload.password) {
    data.passwordHash = await bcrypt.hash(payload.password, PASSWORD_ROUNDS);
    delete data.password;
  }
  if (data.email) data.email = data.email.toLowerCase();
  const user = await prisma.user.update({ where: { id: req.params.id }, data, select: userSelect() });
  res.json({ data: user });
}));

router.patch("/users/:id/deactivate", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const activeReports = await prisma.user.count({ where: { managerId: req.params.id, isActive: true } });
  if (activeReports > 0) throw badRequest("Reassign active employees before deactivating this manager");
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false }, select: userSelect() });
  res.json({ data: user });
}));

router.get("/users/:id/goals", authorizeRoles([roles.hr, roles.manager]), asyncHandler(async (req, res) => {
  const where = { ownerId: req.params.id, ...parseQuarterYear(req.query) };
  const goals = await prisma.goal.findMany({ where, include: goalInclude(), orderBy: { createdAt: "desc" } });
  if (goals[0]) await ensureGoalAccess(req, goals[0]);
  res.json({ data: decorateGoals(goals) });
}));

router.post("/goals", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const payload = normalizeGoalPayload(goalSchema.parse(req.body));
  const user = await getUser(req.user.id);
  if (!user.managerId) throw badRequest("You need an assigned manager before creating goals");
  const goal = await prisma.goal.create({
    data: {
      ...payload,
      ownerId: user.id,
      createdById: user.id,
      departmentId: user.departmentId,
      cycleYear: payload.cycleYear || payload.year,
      thrustArea: payload.thrustArea || "Business Impact",
      weightage: payload.weightage || 10,
      status: "DRAFT",
      approvalStatus: "PENDING",
      priority: "MEDIUM",
    },
    include: goalInclude(),
  });
  await writeLog({ actorId: user.id, goalId: goal.id, departmentId: goal.departmentId, action: "goal.created", entityType: "goal", entityId: goal.id, summary: goal.title });
  await notify({ recipientId: user.managerId, actorId: user.id, goalId: goal.id, type: "goal_pending", title: "New goal pending approval", message: `${user.firstName} submitted ${goal.title}` });
  res.status(201).json({ data: decorateGoal(goal) });
}));

router.get("/goals", asyncHandler(async (req, res) => {
  const user = await getUser(req.user.id);
  const where = { ...parseQuarterYear(req.query) };
  if (req.query.approval_status) where.approvalStatus = String(req.query.approval_status).toUpperCase();
  if (req.query.status) where.status = String(req.query.status).toUpperCase();
  if (user.role === roles.employee) where.ownerId = user.id;
  if (user.role === roles.manager) {
    const reports = await prisma.user.findMany({ where: { managerId: user.id }, select: { id: true } });
    where.ownerId = { in: reports.map((report) => report.id) };
  }
  const goals = await prisma.goal.findMany({ where, include: goalInclude(), orderBy: { updatedAt: "desc" } });
  res.json({ data: decorateGoals(goals) });
}));

router.get("/reports/achievement.csv", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const goals = await prisma.goal.findMany({
    where: parseQuarterYear(req.query),
    include: {
      owner: { select: userSelect() },
      department: { select: { id: true, name: true } },
      quarterlyCheckins: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
    orderBy: [{ year: "desc" }, { quarter: "desc" }, { updatedAt: "desc" }],
  });
  const decoratedGoals = decorateGoals(goals);
  const csv = toCsv(decoratedGoals, [
    { header: "Employee", value: (goal) => `${goal.owner?.firstName || ""} ${goal.owner?.lastName || ""}`.trim() },
    { header: "Email", value: (goal) => goal.owner?.email },
    { header: "Department", value: (goal) => goal.department?.name },
    { header: "Manager", value: (goal) => goal.owner?.manager ? `${goal.owner.manager.firstName} ${goal.owner.manager.lastName}` : "" },
    { header: "Goal Title", value: (goal) => goal.title },
    { header: "Planned Description", value: (goal) => goal.description },
    { header: "Planned Target", value: (goal) => goal.targetValue },
    { header: "Measurement Unit", value: (goal) => goal.unit },
    { header: "Quarter", value: (goal) => goal.quarter },
    { header: "Year", value: (goal) => goal.year },
    { header: "Manager Deadline", value: (goal) => goal.dueDate },
    { header: "Priority", value: (goal) => goal.priority },
    { header: "Approval Status", value: (goal) => goal.approvalStatus },
    { header: "Goal Status", value: (goal) => goal.status },
    { header: "Actual Achievement", value: (goal) => goal.progress },
    { header: "Score Percent", value: (goal) => goal.score?.percent },
    { header: "Employee Note", value: (goal) => goal.employeeNote },
    { header: "Latest Check-in Status", value: (goal) => goal.quarterlyCheckins?.[0]?.status },
    { header: "Latest Wins", value: (goal) => goal.quarterlyCheckins?.[0]?.wins },
    { header: "Latest Blockers", value: (goal) => goal.quarterlyCheckins?.[0]?.blockers },
  ]);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="goalverse-achievement-report-q${req.query.quarter || "all"}-${req.query.year || "all"}.csv"`);
  res.status(200).send(csv);
}));

router.get("/audit-trail", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const where = { action: { startsWith: "goal.audit." } };
  if (req.query.goal_id) where.goalId = String(req.query.goal_id);
  if (req.query.user_id) where.actorId = String(req.query.user_id);

  const logs = await prisma.activityLog.findMany({
    where,
    include: { actor: { select: userSelect() }, goal: { include: goalInclude() } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  res.json({ data: logs });
}));

router.get("/goals/:id", asyncHandler(async (req, res) => {
  const goal = await prisma.goal.findUnique({ where: { id: req.params.id }, include: goalInclude() });
  if (!goal) throw notFound("Goal not found");
  await ensureGoalAccess(req, goal);
  res.json({ data: decorateGoal(goal) });
}));

router.patch("/goals/:id/unlock", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const payload = unlockGoalSchema.parse(req.body);
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Goal not found");
  if (!isGoalLocked(existing)) throw badRequest("Only approved locked goals can be unlocked");

  const unlockedUntil = new Date(Date.now() + payload.durationHours * 60 * 60 * 1000);
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: {
      unlockedUntil,
      unlockedById: req.user.id,
      unlockReason: payload.reason,
    },
    include: goalInclude(),
  });

  await writeLog({
    actorId: req.user.id,
    goalId: goal.id,
    departmentId: goal.departmentId,
    action: "goal.audit.unlocked",
    entityType: "goal",
    entityId: goal.id,
    summary: payload.reason,
    metadata: {
      lockedAt: existing.lockedAt || existing.approvedAt,
      unlockedUntil,
      reason: payload.reason,
    },
  });

  res.json({ data: decorateGoal(goal) });
}));

router.patch("/goals/:id/admin-update", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const payload = adminGoalUpdateSchema.parse(req.body);
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Goal not found");
  if (isGoalLocked(existing) && !isGoalUnlocked(existing)) {
    throw badRequest("Locked goals must be unlocked by HR before exception edits");
  }

  const data = normalizeAdminGoalUpdate(payload, existing);
  const auditedFields = Object.keys(data).filter((field) => field !== "unlockedUntil" && field !== "unlockReason" && field !== "unlockedById");
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data,
    include: goalInclude(),
  });

  await writePostLockGoalAudit({
    actorId: req.user.id,
    before: existing,
    after: goal,
    fields: auditedFields,
    action: "goal.audit.admin_updated",
    summary: "HR exception edit after goal lock",
  });

  res.json({ data: decorateGoal(goal) });
}));

router.put("/goals/:id", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const payload = normalizeGoalPayload(goalSchema.parse(req.body));
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Goal not found");
  if (existing.ownerId !== req.user.id) throw forbidden();
  if (!["DRAFT"].includes(existing.status) && existing.approvalStatus !== "REJECTED") throw badRequest("Only draft or rejected goals can be edited");
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: { ...payload, approvalStatus: "PENDING", managerComment: null },
    include: goalInclude(),
  });
  res.json({ data: decorateGoal(goal) });
}));

router.delete("/goals/:id", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Goal not found");
  if (existing.ownerId !== req.user.id) throw forbidden();
  if (existing.status !== "DRAFT") throw badRequest("Only draft goals can be deleted");
  await prisma.goal.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

router.patch("/goals/:id/approve", authorizeRoles([roles.manager]), asyncHandler(async (req, res) => {
  const schema = goalSchema.extend({ priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), dueDate: z.string().min(1), managerComment: z.string().optional() });
  const payload = schema.parse(req.body);
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id }, include: { owner: true } });
  if (!existing) throw notFound("Goal not found");
  if (existing.owner.managerId !== req.user.id) throw forbidden("Only the assigned manager can approve this goal");
  if (existing.approvalStatus !== "PENDING") throw badRequest("Goal is not pending approval");
  const goalData = normalizeGoalPayload(payload);
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: {
      title: goalData.title,
      description: goalData.description,
      thrustArea: goalData.thrustArea || existing.thrustArea,
      targetValue: goalData.targetValue,
      weightage: goalData.weightage || existing.weightage,
      unit: goalData.unit,
      quarter: goalData.quarter,
      year: goalData.year,
      cycleYear: goalData.cycleYear || existing.cycleYear || goalData.year,
      approvalStatus: "APPROVED",
      status: "ACTIVE",
      priority: payload.priority,
      dueDate: goalData.dueDate,
      managerComment: payload.managerComment,
      approvedById: req.user.id,
      approvedAt: new Date(),
      lockedAt: new Date(),
    },
    include: goalInclude(),
  });
  await writeLog({ actorId: req.user.id, goalId: goal.id, departmentId: goal.departmentId, action: "goal.approved", entityType: "goal", entityId: goal.id, summary: goal.title });
  await notify({ recipientId: goal.ownerId, actorId: req.user.id, goalId: goal.id, type: "goal_approved", title: "Goal approved", message: `${goal.title} is now active` });
  res.json({ data: decorateGoal(goal) });
}));

router.patch("/goals/:id/reject", authorizeRoles([roles.manager]), asyncHandler(async (req, res) => {
  const payload = z.object({ managerComment: z.string().trim().min(3) }).parse(req.body);
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id }, include: { owner: true } });
  if (!existing) throw notFound("Goal not found");
  if (existing.owner.managerId !== req.user.id) throw forbidden();
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: { approvalStatus: "REJECTED", status: "DRAFT", managerComment: payload.managerComment },
    include: goalInclude(),
  });
  await notify({ recipientId: goal.ownerId, actorId: req.user.id, goalId: goal.id, type: "goal_rejected", title: "Goal needs revision", message: payload.managerComment });
  res.json({ data: decorateGoal(goal) });
}));

router.patch("/goals/:id/progress", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const payload = z.object({
    progress: z.coerce.number().min(0),
    status: z.enum(["ACTIVE", "PAUSED", "AT_RISK", "COMPLETED"]),
    employeeNote: z.string().max(500).optional(),
  }).parse(req.body);
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Goal not found");
  if (existing.ownerId !== req.user.id) throw forbidden();
  if (!["ACTIVE", "PAUSED", "AT_RISK", "COMPLETED"].includes(existing.status)) throw badRequest("Only approved active goals can be updated");
  const existingUnit = String(existing.unit || "").toUpperCase();
  if (existingUnit === "MIN" && payload.progress > existing.targetValue) throw badRequest("Progress cannot exceed target value for Min goals");
  if (existingUnit === "TIMELINE" && payload.status !== "COMPLETED") {
    throw badRequest("Timeline goals are measured by completion against the deadline");
  }
  const status = existingUnit === "MIN" && payload.progress >= existing.targetValue ? "COMPLETED" : payload.status;
  const goal = await prisma.goal.update({
    where: { id: req.params.id },
    data: { progress: Math.round(payload.progress), status, employeeNote: payload.employeeNote },
    include: goalInclude(),
  });
  await writeLog({ actorId: req.user.id, goalId: goal.id, departmentId: goal.departmentId, action: "goal.progress_updated", entityType: "goal", entityId: goal.id, summary: payload.employeeNote || "Progress updated", metadata: { oldProgress: existing.progress, newProgress: goal.progress } });
  await writePostLockGoalAudit({
    actorId: req.user.id,
    before: existing,
    after: goal,
    fields: ["progress", "status", "employeeNote"],
    summary: "Employee updated locked goal progress",
  });
  res.json({ data: decorateGoal(goal) });
}));

router.patch("/goals/:id/complete", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Goal not found");
  if (existing.ownerId !== req.user.id) throw forbidden();
  const goal = await prisma.goal.update({ where: { id: req.params.id }, data: { progress: Math.round(existing.targetValue), status: "COMPLETED" }, include: goalInclude() });
  await writePostLockGoalAudit({
    actorId: req.user.id,
    before: existing,
    after: goal,
    fields: ["progress", "status"],
    summary: "Employee completed locked goal",
  });
  res.json({ data: decorateGoal(goal) });
}));

router.post("/checkins", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const payload = z.object({
    goalId: z.string().uuid(),
    quarter: z.coerce.number().int().min(1).max(4),
    year: z.coerce.number().int().min(2024).max(2035),
    progress: z.coerce.number().min(0),
    status: z.enum(["completed", "delayed", "abandoned"]),
    wins: z.string().max(1000).optional(),
    blockers: z.string().max(1000).optional(),
    nextSteps: z.string().max(1000).optional(),
  }).parse(req.body);
  const goal = await prisma.goal.findUnique({ where: { id: payload.goalId }, include: { owner: true } });
  if (!goal) throw notFound("Goal not found");
  if (goal.ownerId !== req.user.id) throw forbidden();
  if (!["ACTIVE", "AT_RISK", "PAUSED", "COMPLETED"].includes(goal.status)) throw badRequest("Only approved goals can be submitted");
  const checkin = await prisma.quarterlyCheckin.create({
    data: { ...payload, submittedById: req.user.id, submittedAt: new Date(), submissionStatus: "submitted" },
    include: { goal: true, submittedBy: { select: userSelect() }, reviewedBy: { select: userSelect() } },
  });
  const updatedGoal = await prisma.goal.update({ where: { id: goal.id }, data: { status: "SUBMITTED", progress: Math.round(payload.progress) } });
  await writePostLockGoalAudit({
    actorId: req.user.id,
    before: goal,
    after: updatedGoal,
    fields: ["progress", "status"],
    summary: "Employee submitted locked goal check-in",
  });
  await notify({ recipientId: goal.owner.managerId, actorId: req.user.id, goalId: goal.id, type: "checkin_submitted", title: "Quarterly check-in submitted", message: `${goal.title} is ready for review` });
  res.status(201).json({ data: checkin });
}));

router.get("/checkins", asyncHandler(async (req, res) => {
  const user = await getUser(req.user.id);
  const where = { ...parseQuarterYear(req.query) };
  if (user.role === roles.employee) where.submittedById = user.id;
  if (user.role === roles.manager) {
    const reports = await prisma.user.findMany({ where: { managerId: user.id }, select: { id: true } });
    where.submittedById = { in: reports.map((report) => report.id) };
  }
  const checkins = await prisma.quarterlyCheckin.findMany({
    where,
    include: { goal: { include: { owner: { select: userSelect() }, department: true } }, submittedBy: { select: userSelect() }, reviewedBy: { select: userSelect() } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: checkins });
}));

router.patch("/checkins/:id/review", authorizeRoles([roles.manager]), asyncHandler(async (req, res) => {
  const payload = z.object({ reviewerNotes: z.string().trim().min(2).max(1000) }).parse(req.body);
  const existing = await prisma.quarterlyCheckin.findUnique({ where: { id: req.params.id }, include: { goal: { include: { owner: true } } } });
  if (!existing) throw notFound("Check-in not found");
  if (existing.goal.owner.managerId !== req.user.id) throw forbidden();
  const checkin = await prisma.quarterlyCheckin.update({
    where: { id: req.params.id },
    data: { reviewerNotes: payload.reviewerNotes, reviewedById: req.user.id, reviewedAt: new Date(), submissionStatus: "reviewed" },
    include: { goal: true, submittedBy: { select: userSelect() }, reviewedBy: { select: userSelect() } },
  });
  await notify({ recipientId: existing.submittedById, actorId: req.user.id, goalId: existing.goalId, type: "checkin_reviewed", title: "Manager feedback added", message: payload.reviewerNotes });
  res.json({ data: checkin });
}));

router.get("/activity-logs", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.goal_id) where.goalId = String(req.query.goal_id);
  if (req.query.user_id) where.actorId = String(req.query.user_id);
  const logs = await prisma.activityLog.findMany({ where, include: { actor: { select: userSelect() }, goal: true }, orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ data: logs });
}));

router.get("/notifications", asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({ where: { recipientId: req.user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  res.json({ data: notifications });
}));

router.patch("/notifications/:id/read", asyncHandler(async (req, res) => {
  const existing = await prisma.notification.findFirst({ where: { id: req.params.id, recipientId: req.user.id } });
  if (!existing) throw notFound("Notification not found");
  const notification = await prisma.notification.update({ where: { id: existing.id }, data: { readAt: new Date() } });
  res.json({ data: notification });
}));

router.get("/dashboard/employee", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const where = { ownerId: req.user.id, ...parseQuarterYear(req.query) };
  const goals = await prisma.goal.findMany({ where, include: goalInclude(), orderBy: { updatedAt: "desc" } });
  const checkins = await prisma.quarterlyCheckin.findMany({ where: { submittedById: req.user.id }, orderBy: { createdAt: "desc" }, take: 5 });
  res.json({ data: buildDashboard(goals, { checkins }) });
}));

router.get("/dashboard/manager", authorizeRoles([roles.manager]), asyncHandler(async (req, res) => {
  const reports = await prisma.user.findMany({ where: { managerId: req.user.id, isActive: true }, select: userSelect() });
  const reportIds = reports.map((report) => report.id);
  const [filteredGoals, pendingGoals, checkins] = await Promise.all([
    prisma.goal.findMany({ where: { ownerId: { in: reportIds }, ...parseQuarterYear(req.query) }, include: goalInclude(), orderBy: { updatedAt: "desc" } }),
    prisma.goal.findMany({ where: { ownerId: { in: reportIds }, approvalStatus: "PENDING" }, include: goalInclude(), orderBy: { updatedAt: "desc" } }),
    prisma.quarterlyCheckin.findMany({ where: { submittedById: { in: reportIds } }, include: { goal: true, submittedBy: { select: userSelect() } }, orderBy: { createdAt: "desc" } }),
  ]);
  const seenIds = new Set(filteredGoals.map((g) => g.id));
  const allGoals = [...filteredGoals, ...pendingGoals.filter((g) => !seenIds.has(g.id))];
  res.json({ data: buildDashboard(allGoals, { team: reports, checkins }) });
}));

router.get("/dashboard/hr", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const [users, departments, goals, checkins] = await Promise.all([
    prisma.user.findMany({ select: userSelect() }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.goal.findMany({ where: parseQuarterYear(req.query), include: goalInclude(), orderBy: { updatedAt: "desc" } }),
    prisma.quarterlyCheckin.findMany({ include: { goal: true, submittedBy: { select: userSelect() } }, orderBy: { createdAt: "desc" } }),
  ]);
  res.json({ data: buildDashboard(goals, { users, departments, checkins }) });
}));

router.get("/analytics/completion-rate", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const goals = await prisma.goal.findMany({ where: parseQuarterYear(req.query) });
  const completed = goals.filter((goal) => calculateGoalScore(goal).percent >= 100).length;
  res.json({ data: { total: goals.length, completed, rate: goals.length ? Math.round((completed / goals.length) * 100) : 0 } });
}));

router.get("/analytics/department-comparison", authorizeRoles([roles.hr]), asyncHandler(async (_req, res) => {
  const departments = await prisma.department.findMany({ include: { goals: true } });
  res.json({ data: departments.map((department) => ({ name: department.name, total: department.goals.length, completed: department.goals.filter((goal) => goal.status === "COMPLETED").length, delayed: department.goals.filter((goal) => goal.status === "AT_RISK").length })) });
}));

router.get("/analytics/delayed-goals", authorizeRoles([roles.hr]), asyncHandler(async (_req, res) => {
  const departments = await prisma.department.findMany({ include: { goals: true } });
  res.json({ data: departments.map((department) => ({ name: department.name, delayed: department.goals.filter((goal) => goal.status === "AT_RISK").length })) });
}));

const checkinStatuses = ["not_started", "on_track", "delayed", "at_risk", "completed"];

function getCycleYear(query) {
  return Number(query.cycleYear || query.year || new Date().getFullYear());
}

function latestCheckinForQuarter(goal, quarter, cycleYear) {
  return (goal.quarterlyCheckins || []).find(
    (ci) => Number(ci.quarter) === quarter && Number(ci.year) === cycleYear,
  );
}

async function isCheckinWindowOpen(cycleYear, quarter) {
  const window = await prisma.checkinWindow.findFirst({
    where: { cycleYear: Number(cycleYear), quarter: Number(quarter) },
  });
  return Boolean(window?.isOpen);
}

/* ─── Governance ──────────────────────────────────────────── */

router.get("/governance/cycles", authorizeRoles([roles.hr]), asyncHandler(async (_req, res) => {
  const cycles = await prisma.goalCycle.findMany({ orderBy: { year: "desc" } });
  res.json({ data: cycles });
}));

router.patch("/governance/cycle", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const payload = z.object({ year: z.coerce.number().int().min(2024).max(2035), isGoalSettingOpen: z.boolean() }).parse(req.body);
  const cycle = await prisma.goalCycle.upsert({
    where: { year: payload.year },
    update: { isGoalSettingOpen: payload.isGoalSettingOpen, ...(payload.isGoalSettingOpen ? { openedAt: new Date() } : { closedAt: new Date() }) },
    create: { year: payload.year, isGoalSettingOpen: payload.isGoalSettingOpen, openedAt: payload.isGoalSettingOpen ? new Date() : null },
  });
  await writeLog({ actorId: req.user.id, action: `governance.cycle_${payload.isGoalSettingOpen ? "opened" : "closed"}`, entityType: "goal_cycle", entityId: cycle.id, summary: `${payload.year} goal cycle ${payload.isGoalSettingOpen ? "opened" : "closed"}` });
  res.json({ data: cycle });
}));

router.get("/governance/checkin-windows", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const cycleYear = getCycleYear(req.query);
  const windows = await prisma.checkinWindow.findMany({ where: { cycleYear }, orderBy: { quarter: "asc" } });
  res.json({ data: windows });
}));

router.patch("/governance/checkin-window", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const payload = z.object({ cycleYear: z.coerce.number().int(), quarter: z.coerce.number().int().min(1).max(4), isOpen: z.boolean() }).parse(req.body);
  const window = await prisma.checkinWindow.upsert({
    where: { cycleYear_quarter: { cycleYear: payload.cycleYear, quarter: payload.quarter } },
    update: { isOpen: payload.isOpen, ...(payload.isOpen ? { openedAt: new Date() } : { closedAt: new Date() }) },
    create: { cycleYear: payload.cycleYear, quarter: payload.quarter, isOpen: payload.isOpen, openedAt: payload.isOpen ? new Date() : null },
  });
  await writeLog({ actorId: req.user.id, action: "governance.checkin_window_updated", entityType: "checkin_window", entityId: window.id, summary: `Q${payload.quarter} ${payload.cycleYear} check-in window ${payload.isOpen ? "opened" : "closed"}` });
  res.json({ data: window });
}));

/* ─── Goal Sheets & Shared Goals ──────────────────────────── */

router.post("/goal-sheets/submit", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const payload = z.object({ cycleYear: z.coerce.number().int() }).parse(req.body);
  const goals = await prisma.goal.findMany({ where: { ownerId: req.user.id, cycleYear: payload.cycleYear, approvalStatus: "PENDING" } });
  if (!goals.length) throw badRequest("No pending goals to submit");
  const totalWeight = goals.reduce((sum, g) => sum + Number(g.weightage || 0), 0);
  if (totalWeight !== 100) throw badRequest(`Weightage must total 100% (currently ${totalWeight}%)`);
  await prisma.goal.updateMany({ where: { id: { in: goals.map((g) => g.id) } }, data: { submittedAt: new Date() } });
  const user = await getUser(req.user.id);
  if (user.managerId) {
    await notify({ recipientId: user.managerId, actorId: user.id, type: "goal_sheet_submitted", title: "Goal sheet submitted", message: `${user.firstName} submitted ${goals.length} goals for review` });
  }
  res.json({ data: { submitted: goals.length } });
}));

router.patch("/goal-sheets/:employeeId/approve", authorizeRoles([roles.manager]), asyncHandler(async (req, res) => {
  const payload = z.object({
    cycleYear: z.coerce.number().int(),
    managerComment: z.string().optional(),
    goals: z.array(z.object({ id: z.string().uuid(), targetValue: z.coerce.number().min(0).optional(), weightage: z.coerce.number().min(10).max(100).optional(), dueDate: z.string().optional() })),
  }).parse(req.body);
  const employee = await prisma.user.findUnique({ where: { id: req.params.employeeId } });
  if (!employee || employee.managerId !== req.user.id) throw forbidden();
  for (const goalUpdate of payload.goals) {
    const data = { approvalStatus: "APPROVED", status: "ACTIVE", approvedById: req.user.id, approvedAt: new Date(), lockedAt: new Date(), managerComment: payload.managerComment || null };
    if (goalUpdate.targetValue !== undefined) data.targetValue = Number(goalUpdate.targetValue);
    if (goalUpdate.weightage !== undefined) data.weightage = Number(goalUpdate.weightage);
    if (goalUpdate.dueDate) data.dueDate = new Date(goalUpdate.dueDate);
    await prisma.goal.update({ where: { id: goalUpdate.id }, data });
  }
  await notify({ recipientId: employee.id, actorId: req.user.id, type: "goal_sheet_approved", title: "Goal sheet approved", message: `Your annual goals have been approved and locked` });
  res.json({ data: { approved: payload.goals.length } });
}));

router.patch("/goal-sheets/:employeeId/return", authorizeRoles([roles.manager]), asyncHandler(async (req, res) => {
  const payload = z.object({ cycleYear: z.coerce.number().int(), managerComment: z.string().trim().min(3) }).parse(req.body);
  const employee = await prisma.user.findUnique({ where: { id: req.params.employeeId } });
  if (!employee || employee.managerId !== req.user.id) throw forbidden();
  await prisma.goal.updateMany({ where: { ownerId: employee.id, cycleYear: payload.cycleYear, approvalStatus: "PENDING" }, data: { approvalStatus: "REJECTED", status: "DRAFT", managerComment: payload.managerComment, submittedAt: null, returnedAt: new Date() } });
  await notify({ recipientId: employee.id, actorId: req.user.id, type: "goal_sheet_returned", title: "Goal sheet returned", message: payload.managerComment });
  res.json({ data: { returned: true } });
}));

router.post("/shared-goals", authorizeRoles([roles.hr, roles.manager]), asyncHandler(async (req, res) => {
  const payload = z.object({
    employeeIds: z.array(z.string().uuid()).min(1),
    primaryOwnerId: z.string().uuid(),
    thrustArea: z.string().optional(),
    title: z.string().trim().min(3),
    description: z.string().optional(),
    targetValue: z.coerce.number().min(0).optional(),
    weightage: z.coerce.number().min(10).max(100).optional(),
    unit: z.enum(unitTypes),
    cycleYear: z.coerce.number().int(),
    dueDate: z.string().optional(),
  }).parse(req.body);
  const groupId = crypto.randomUUID();
  const created = [];
  for (const employeeId of payload.employeeIds) {
    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) continue;
    const goal = await prisma.goal.create({
      data: {
        ownerId: employeeId,
        createdById: req.user.id,
        departmentId: employee.departmentId,
        title: payload.title,
        description: payload.description,
        thrustArea: payload.thrustArea || "Business Impact",
        targetValue: Number(payload.targetValue || 0),
        weightage: Number(payload.weightage || 10),
        unit: payload.unit,
        cycleYear: payload.cycleYear,
        quarter: Math.floor(new Date().getMonth() / 3) + 1,
        year: payload.cycleYear,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        status: "DRAFT",
        approvalStatus: "PENDING",
        priority: "MEDIUM",
        sharedGroupId: groupId,
        sharedSourceGoalId: employeeId === payload.primaryOwnerId ? null : payload.primaryOwnerId,
      },
    });
    created.push(goal);
  }
  res.status(201).json({ data: created });
}));

/* ─── Audit Trail ─────────────────────────────────────────── */

router.get("/audit-trail", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const where = { action: { startsWith: "goal.audit." } };
  if (req.query.goal_id) where.goalId = String(req.query.goal_id);
  if (req.query.user_id) where.actorId = String(req.query.user_id);
  const logs = await prisma.activityLog.findMany({
    where,
    include: { actor: { select: userSelect() }, goal: { include: goalInclude() } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ data: logs });
}));

/* ─── Advanced Analytics ──────────────────────────────────── */

router.get("/analytics/qoq-achievement", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const cycleYear = getCycleYear(req.query);
  const level = String(req.query.level || "department");
  const selectedId = req.query.id ? String(req.query.id) : undefined;
  const where = { cycleYear };
  if (level === "individual" && selectedId) where.ownerId = selectedId;
  if (level === "team" && selectedId) {
    const reports = await prisma.user.findMany({ where: { managerId: selectedId, isActive: true }, select: { id: true } });
    where.ownerId = { in: reports.map((r) => r.id) };
  }
  if (level === "department" && selectedId) where.departmentId = selectedId;
  const goals = await prisma.goal.findMany({ where, include: goalInclude() });
  const quarters = [1, 2, 3, 4].map((quarter) => {
    const scores = goals.flatMap((goal) => {
      const ci = latestCheckinForQuarter(goal, quarter, cycleYear);
      return ci ? [calculateGoalScore({ ...goal, progress: ci.progress, status: ci.status === "completed" ? "COMPLETED" : goal.status }).percent] : [];
    });
    return { quarter: `Q${quarter}`, score: scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0 };
  });
  res.json({ data: quarters });
}));

router.get("/analytics/completion-heatmap", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const cycleYear = getCycleYear(req.query);
  const departments = await prisma.department.findMany({
    include: { users: { where: { role: roles.employee, isActive: true }, select: { id: true } } },
    orderBy: { name: "asc" },
  });
  const checkins = await prisma.quarterlyCheckin.findMany({ where: { year: cycleYear }, select: { submittedById: true, reviewedById: true, quarter: true } });
  const data = departments.map((dept) => ({
    departmentId: dept.id,
    department: dept.name,
    quarters: [1, 2, 3, 4].map((q) => {
      const empIds = dept.users.map((u) => u.id);
      const submitted = new Set(checkins.filter((ci) => Number(ci.quarter) === q && empIds.includes(ci.submittedById)).map((ci) => ci.submittedById));
      return { quarter: `Q${q}`, completionRate: empIds.length ? Math.round((submitted.size / empIds.length) * 100) : 0, submitted: submitted.size, required: empIds.length };
    }),
  }));
  res.json({ data });
}));

router.get("/analytics/goal-distribution", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const cycleYear = getCycleYear(req.query);
  const goals = await prisma.goal.findMany({ where: { cycleYear } });
  const countBy = (items, getKey) => Object.values(items.reduce((acc, item) => {
    const key = getKey(item) || "Unassigned";
    acc[key] = acc[key] || { name: key, value: 0 };
    acc[key].value += 1;
    return acc;
  }, {}));
  res.json({
    data: {
      thrustArea: countBy(goals, (g) => g.thrustArea),
      uomType: countBy(goals, (g) => g.unit),
      status: countBy(goals, (g) => {
        if (g.status === "COMPLETED") return "Completed";
        if (Number(g.progress || 0) <= 0) return "Not Started";
        return "On Track";
      }),
    },
  });
}));

router.get("/analytics/manager-effectiveness", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const cycleYear = getCycleYear(req.query);
  const managers = await prisma.user.findMany({
    where: { role: roles.manager, isActive: true },
    select: { ...userSelect(), directReports: { where: { role: roles.employee, isActive: true }, select: { id: true } } },
  });
  const checkins = await prisma.quarterlyCheckin.findMany({ where: { year: cycleYear, reviewedAt: { not: null } }, select: { reviewedById: true, submittedById: true, quarter: true } });
  const data = managers.map((mgr) => {
    const reportIds = mgr.directReports.map((r) => r.id);
    const required = reportIds.length * 4;
    const reviewed = new Set(checkins.filter((ci) => ci.reviewedById === mgr.id && reportIds.includes(ci.submittedById)).map((ci) => `${ci.submittedById}-${ci.quarter}`)).size;
    return { managerId: mgr.id, manager: `${mgr.firstName} ${mgr.lastName}`, reviewed, required, completionRate: required ? Math.round((reviewed / required) * 100) : 0 };
  }).sort((a, b) => b.completionRate - a.completionRate);
  res.json({ data });
}));

/* ─── Checkins (extended) ─────────────────────────────────── */

router.post("/checkins", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const payload = z.object({
    goalId: z.string().uuid(),
    quarter: z.coerce.number().int().min(1).max(4),
    year: z.coerce.number().int().min(2024).max(2035),
    progress: z.coerce.number().min(0),
    status: z.enum(checkinStatuses),
    wins: z.string().max(1000).optional(),
    blockers: z.string().max(1000).optional(),
    nextSteps: z.string().max(1000).optional(),
  }).parse(req.body);
  const goal = await prisma.goal.findUnique({ where: { id: payload.goalId }, include: { owner: true } });
  if (!goal) throw notFound("Goal not found");
  if (goal.ownerId !== req.user.id) throw forbidden();
  if (!["ACTIVE", "AT_RISK", "PAUSED", "COMPLETED"].includes(goal.status)) throw badRequest("Only approved goals can be submitted");
  if (!(await isCheckinWindowOpen(goal.cycleYear || payload.year, payload.quarter))) throw badRequest("This quarterly check-in window is closed");
  if (String(goal.unit || "").toUpperCase() === "MIN" && payload.progress > goal.targetValue) throw badRequest("Progress cannot exceed target value for Min goals");
  const checkin = await prisma.quarterlyCheckin.create({
    data: { ...payload, submittedById: req.user.id, submittedAt: new Date(), submissionStatus: "submitted" },
    include: { goal: true, submittedBy: { select: userSelect() }, reviewedBy: { select: userSelect() } },
  });
  const nextStatus = payload.status === "completed" ? "COMPLETED" : "ACTIVE";
  const updatedGoal = await prisma.goal.update({ where: { id: goal.id }, data: { status: nextStatus, progress: Math.round(payload.progress) } });
  if (goal.sharedGroupId && !goal.sharedSourceGoalId) {
    await prisma.goal.updateMany({
      where: { sharedGroupId: goal.sharedGroupId, id: { not: goal.id } },
      data: { status: nextStatus, progress: Math.round(payload.progress) },
    });
  }
  await writePostLockGoalAudit({ actorId: req.user.id, before: goal, after: updatedGoal, fields: ["progress", "status"], summary: "Employee submitted locked goal check-in" });
  await notify({ recipientId: goal.owner.managerId, actorId: req.user.id, goalId: goal.id, type: "checkin_submitted", title: "Quarterly check-in submitted", message: `${goal.title} is ready for review` });
  res.status(201).json({ data: checkin });
}));

function buildDashboard(goals, extras = {}) {
  const total = goals.length;
  const completed = goals.filter((goal) => goal.status === "COMPLETED").length;
  const pending = goals.filter((goal) => goal.approvalStatus === "PENDING").length;
  const active = goals.filter((goal) => ["ACTIVE", "AT_RISK", "PAUSED"].includes(goal.status)).length;
  const delayed = goals.filter((goal) => goal.status === "AT_RISK").length;
  const submitted = goals.filter((goal) => goal.status === "SUBMITTED").length;
  return {
    stats: { total, completed, pending, active, delayed, submitted },
    goals: decorateGoals(goals),
    ...extras,
  };
}

export default router;
