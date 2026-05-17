import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import { signToken } from "../utils/jwt.js";
import { validateLoginInput } from "../utils/validators.js";

function invalidCredentialsError() {
  const error = new Error("Invalid credentials");
  error.code = "INVALID_CREDENTIALS";
  return error;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    isActive: user.isActive,
  };
}

export async function loginUser(payload) {
  const validationError = validateLoginInput(payload);

  if (validationError) {
    throw invalidCredentialsError();
  }

  const email = payload.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.isActive || !user.passwordHash) {
    throw invalidCredentialsError();
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

  if (!isPasswordValid) {
    throw invalidCredentialsError();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const safeUser = sanitizeUser(user);
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: safeUser,
  };
}
