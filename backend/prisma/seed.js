import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const PASSWORD = "Password@123";

function required(name, fallback) {
  return process.env[name] || fallback;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function upsertUser({ email, firstName, lastName, role, departmentId = null, managerId = null, jobTitle }) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    update: { firstName, lastName, role, departmentId, managerId, jobTitle, isActive: true, passwordHash },
    create: { email, firstName, lastName, role, departmentId, managerId, jobTitle, isActive: true, passwordHash },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  await prisma.notification.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.quarterlyCheckin.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.checkinWindow.deleteMany();
  await prisma.goalCycle.deleteMany();

  const departmentNames = ["Revenue Operations", "Product Engineering", "Customer Success", "People Operations"];
  const departments = {};

  for (const name of departmentNames) {
    departments[name] = await prisma.department.upsert({
      where: { slug: slugify(name) },
      update: { name, isActive: true },
      create: { name, slug: slugify(name), isActive: true },
    });
  }

  const hr1 = await upsertUser({
    email: "hr1@goalverse.com",
    firstName: "Aarav",
    lastName: "Mehta",
    role: Role.HR_ADMIN,
    jobTitle: "Head of People",
  });
  const configuredAdminEmail = required("ADMIN_EMAIL", "hr1@goalverse.com").toLowerCase();
  if (configuredAdminEmail !== "hr1@goalverse.com") {
    await upsertUser({
      email: configuredAdminEmail,
      firstName: "Om",
      lastName: "Admin",
      role: Role.HR_ADMIN,
      jobTitle: "System Admin",
    });
  }
  await upsertUser({
    email: "hr2@goalverse.com",
    firstName: "Maya",
    lastName: "Rao",
    role: Role.HR_ADMIN,
    jobTitle: "HR Business Partner",
  });

  const managers = [
    await upsertUser({ email: "manager1@goalverse.com", firstName: "Nisha", lastName: "Kapoor", role: Role.MANAGER, departmentId: departments["Revenue Operations"].id, jobTitle: "Revenue Manager" }),
    await upsertUser({ email: "manager2@goalverse.com", firstName: "Rohan", lastName: "Iyer", role: Role.MANAGER, departmentId: departments["Product Engineering"].id, jobTitle: "Engineering Manager" }),
    await upsertUser({ email: "manager3@goalverse.com", firstName: "Sara", lastName: "Thomas", role: Role.MANAGER, departmentId: departments["Customer Success"].id, jobTitle: "CS Manager" }),
  ];

  const employees = [
    await upsertUser({ email: "employee1@goalverse.com", firstName: "Kabir", lastName: "Shah", role: Role.EMPLOYEE, departmentId: departments["Revenue Operations"].id, managerId: managers[0].id, jobTitle: "Account Executive" }),
    await upsertUser({ email: "employee2@goalverse.com", firstName: "Anika", lastName: "Sen", role: Role.EMPLOYEE, departmentId: departments["Revenue Operations"].id, managerId: managers[0].id, jobTitle: "Sales Analyst" }),
    await upsertUser({ email: "employee3@goalverse.com", firstName: "Dev", lastName: "Nair", role: Role.EMPLOYEE, departmentId: departments["Product Engineering"].id, managerId: managers[1].id, jobTitle: "Frontend Engineer" }),
    await upsertUser({ email: "employee4@goalverse.com", firstName: "Ira", lastName: "Kulkarni", role: Role.EMPLOYEE, departmentId: departments["Product Engineering"].id, managerId: managers[1].id, jobTitle: "Backend Engineer" }),
    await upsertUser({ email: "employee5@goalverse.com", firstName: "Zoya", lastName: "Khan", role: Role.EMPLOYEE, departmentId: departments["Customer Success"].id, managerId: managers[2].id, jobTitle: "Customer Success Lead" }),
    await upsertUser({ email: "employee6@goalverse.com", firstName: "Neil", lastName: "Dutta", role: Role.EMPLOYEE, departmentId: departments["Customer Success"].id, managerId: managers[2].id, jobTitle: "Implementation Specialist" }),
  ];

  await prisma.goalCycle.create({
    data: {
      year: 2026,
      isGoalSettingOpen: true,
      openedAt: new Date("2026-05-01"),
    },
  });
  await prisma.checkinWindow.createMany({
    data: [1, 2, 3, 4].map((quarter) => ({
      cycleYear: 2026,
      quarter,
      isOpen: quarter === 2,
      openedAt: quarter === 2 ? new Date("2026-05-01") : null,
    })),
  });

  const goalTemplates = [
    // [title, desc, target, unit, priority, status, approval, progress, isSubmitted]
    ["Close enterprise pipeline", "Move high-value opportunities through the quarter.", 120, "MIN", "HIGH", "ACTIVE", "APPROVED", 80, true],
    ["Reduce onboarding cycle time", "Lower implementation turnaround time without losing quality.", 14, "MAX", "MEDIUM", "AT_RISK", "APPROVED", 18, true],
    ["Launch self-serve insights", "Ship dashboard improvements before the release deadline.", 0, "TIMELINE", "HIGH", "ACTIVE", "APPROVED", 0, true],
    ["Zero critical API incidents", "Keep critical production incidents at zero this quarter.", 0, "ZERO", "MEDIUM", "COMPLETED", "APPROVED", 0, true],
    ["Refresh quarterly success plans", "Create measurable plans for top accounts.", 30, "MIN", "LOW", "DRAFT", "PENDING", 0, true],
    ["Document implementation runbooks", "Publish reusable deployment and support guides.", 12, "MIN", "MEDIUM", "DRAFT", "PENDING", 0, false],
  ];

  for (let index = 0; index < employees.length; index += 1) {
    const employee = employees[index];
    const template = goalTemplates[index];
    const manager = managers.find((item) => item.id === employee.managerId);
    const [title, description, targetValue, unit, priority, status, approvalStatus, progress, isSubmitted] = template;
    const goal = await prisma.goal.create({
      data: {
        ownerId: employee.id,
        createdById: employee.id,
        approvedById: approvalStatus === "APPROVED" ? manager?.id : null,
        departmentId: employee.departmentId,
        title,
        thrustArea: ["Financial", "Process", "Innovation", "Compliance", "Customer", "People"][index],
        description,
        targetValue,
        weightage: 100,
        unit,
        cycleYear: 2026,
        priority,
        status,
        approvalStatus,
        progress,
        quarter: 2,
        year: 2026,
        submittedAt: (approvalStatus === "APPROVED" || isSubmitted) ? new Date("2026-05-05") : null,
        dueDate: new Date("2026-06-30"),
        approvedAt: approvalStatus === "APPROVED" ? new Date("2026-04-05") : null,
        lockedAt: approvalStatus === "APPROVED" ? new Date("2026-04-05") : null,
        managerComment: approvalStatus === "PENDING" ? null : "Clear scope and measurable outcome.",
        employeeNote: progress > 0 ? "Latest progress is updated for the weekly manager sync." : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        actorId: employee.id,
        goalId: goal.id,
        departmentId: employee.departmentId,
        action: "goal.seeded",
        entityType: "goal",
        entityId: goal.id,
        summary: `Demo goal created: ${title}`,
      },
    });

    if (status === "SUBMITTED" || status === "COMPLETED") {
      await prisma.quarterlyCheckin.create({
        data: {
          goalId: goal.id,
          submittedById: employee.id,
          reviewedById: manager?.id,
          quarter: 2,
          year: 2026,
          progress,
          status: status === "COMPLETED" ? "completed" : "delayed",
          submissionStatus: status === "COMPLETED" ? "reviewed" : "submitted",
          wins: "Strong collaboration and visible business impact.",
          blockers: status === "COMPLETED" ? "No major blockers." : "Dependency review is still open.",
          nextSteps: "Carry lessons into the next quarterly plan.",
          reviewerNotes: status === "COMPLETED" ? "Excellent execution and documentation." : null,
          submittedAt: new Date("2026-05-12"),
          reviewedAt: status === "COMPLETED" ? new Date("2026-05-14") : null,
        },
      });
    }
  }

  await prisma.notification.create({
    data: {
      recipientId: hr1.id,
      type: "demo_ready",
      title: "Goalverse demo data is ready",
      message: "Departments, managers, employees, goals, and check-ins were seeded.",
    },
  });

  console.log("Seed completed");
  console.log("Default password for all demo users: Password@123");
  console.log("Try: hr1@goalverse.com, manager1@goalverse.com, employee1@goalverse.com");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
