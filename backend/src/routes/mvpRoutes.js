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
  targetValue: z.coerce.number().min(0).optional(),
  unit: z.enum(unitTypes),
  quarter: z.coerce.number().int().min(1).max(4),
  year: z.coerce.number().int().min(2024).max(2035),
  dueDate: z.string().optional().nullable(),
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

router.get("/departments/:id/managers", authorizeRoles([roles.hr]), asyncHandler(async (req, res) => {
  const managers = await prisma.user.findMany({
    where: { departmentId: req.params.id, role: roles.manager, isActive: true },
    select: userSelect(),
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  res.json({ data: managers });
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

router.get("/goals/:id", asyncHandler(async (req, res) => {
  const goal = await prisma.goal.findUnique({ where: { id: req.params.id }, include: goalInclude() });
  if (!goal) throw notFound("Goal not found");
  await ensureGoalAccess(req, goal);
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
      targetValue: goalData.targetValue,
      unit: goalData.unit,
      quarter: goalData.quarter,
      year: goalData.year,
      approvalStatus: "APPROVED",
      status: "ACTIVE",
      priority: payload.priority,
      dueDate: goalData.dueDate,
      managerComment: payload.managerComment,
      approvedById: req.user.id,
      approvedAt: new Date(),
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
  res.json({ data: decorateGoal(goal) });
}));

router.patch("/goals/:id/complete", authorizeRoles([roles.employee]), asyncHandler(async (req, res) => {
  const existing = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Goal not found");
  if (existing.ownerId !== req.user.id) throw forbidden();
  const goal = await prisma.goal.update({ where: { id: req.params.id }, data: { progress: Math.round(existing.targetValue), status: "COMPLETED" }, include: goalInclude() });
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
  await prisma.goal.update({ where: { id: goal.id }, data: { status: "SUBMITTED", progress: Math.round(payload.progress) } });
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

router.get("/activity-logs", asyncHandler(async (req, res) => {
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
  const goals = await prisma.goal.findMany({ where: { ownerId: { in: reports.map((report) => report.id) }, ...parseQuarterYear(req.query) }, include: goalInclude(), orderBy: { updatedAt: "desc" } });
  const checkins = await prisma.quarterlyCheckin.findMany({ where: { submittedById: { in: reports.map((report) => report.id) } }, include: { goal: true, submittedBy: { select: userSelect() } }, orderBy: { createdAt: "desc" } });
  res.json({ data: buildDashboard(goals, { team: reports, checkins }) });
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
