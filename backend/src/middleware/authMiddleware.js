import { verifyToken } from "../utils/jwt.js";

function unauthorized(res) {
  return res.status(401).json({
    message: "Unauthorized",
  });
}

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized(res);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

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
