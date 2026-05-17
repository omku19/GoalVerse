import jwt from "jsonwebtoken";
import env from "../config/env.js";

export function signToken(payload) {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  return jwt.verify(token, env.jwtSecret);
}
