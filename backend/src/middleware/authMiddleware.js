import env from "../config/env.js";
import prisma from "../config/db.js";
import { verifyToken } from "../utils/jwt.js";

function unauthorized(res) {
  return res.status(401).json({
    message: "Unauthorized",
  });
}

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized(res);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    const session = decoded.jti
      ? await prisma.authSession.findUnique({
        where: { jwtId: decoded.jti },
        include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
      })
      : null;
    const now = new Date();
    const idleTimeoutMs = env.sessionIdleTimeoutMinutes * 60 * 1000;

    if (!session || !session.user?.isActive || session.revokedAt || session.expiresAt <= now) {
      return unauthorized(res);
    }

    if (now.getTime() - session.lastSeenAt.getTime() > idleTimeoutMs) {
      await prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      return unauthorized(res);
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };
    req.authToken = token;
    req.authSession = session;

    if (now.getTime() - session.lastSeenAt.getTime() > 60 * 1000) {
      await prisma.authSession.update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      });
    }

    return next();
  } catch (_error) {
    return unauthorized(res);
  }
}

export function authorizeRoles(allowedRoles = []) {
  return (req, res, next) => {
    if (!allowedRoles.length || allowedRoles.includes(req.user?.role)) {
      return next();
    }

    return res.status(403).json({
      message: "Forbidden",
    });
  };
}
