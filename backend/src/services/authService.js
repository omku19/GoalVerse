import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import prisma from "../config/db.js";
import { decodeToken, signToken } from "../utils/jwt.js";
import { validateLoginInput } from "../utils/validators.js";

function invalidCredentialsError() {
  const error = new Error("Invalid credentials");
  error.code = "INVALID_CREDENTIALS";
  return error;
}

export function sanitizeUser(user) {
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

function unauthorizedError() {
  const error = new Error("Unauthorized");
  error.code = "UNAUTHORIZED";
  return error;
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
  const jwtId = randomUUID();
  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    jti: jwtId,
  });
  const decoded = decodeToken(token);

  await prisma.authSession.create({
    data: {
      userId: user.id,
      jwtId,
      expiresAt: new Date(decoded.exp * 1000),
    },
  });

  return {
    token,
    user: safeUser,
  };
}

export async function revokeCurrentSession(authSession) {
  if (!authSession?.id || authSession.revokedAt) {
    return null;
  }

  return prisma.authSession.update({
    where: { id: authSession.id },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUserProfile(authUser) {
  if (!authUser?.id) {
    throw unauthorizedError();
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  if (!user || !user.isActive) {
    throw unauthorizedError();
  }

  return sanitizeUser(user);
}
