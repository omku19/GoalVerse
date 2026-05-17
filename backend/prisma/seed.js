import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";

const SALT_ROUNDS = 12;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

const adapter = new PrismaPg({
  connectionString: getRequiredEnv("DATABASE_URL"),
});

const prisma = new PrismaClient({
  adapter,
});

async function seedHrAdmin() {
  const email = getRequiredEnv("ADMIN_EMAIL").trim().toLowerCase();
  const password = getRequiredEnv("ADMIN_PASSWORD");

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`HR admin already exists: ${email}`);
    return existingUser;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  return prisma.user.create({
    data: {
      firstName: "HR",
      lastName: "Admin",
      email,
      passwordHash,
      role: Role.HR_ADMIN,
      jobTitle: "HR Administrator",
      isActive: true,
    },
  });
}

async function main() {
  const admin = await seedHrAdmin();
  console.log(`Seed completed for HR admin: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
