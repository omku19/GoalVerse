import "dotenv/config";

function parseList(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL,
  frontendUrls: parseList(process.env.FRONTEND_URLS, process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  frontendOriginSuffixes: parseList(process.env.FRONTEND_ORIGIN_SUFFIXES, [".vercel.app"]),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  sessionIdleTimeoutMinutes: parsePositiveNumber(process.env.SESSION_IDLE_TIMEOUT_MINUTES, 30),
};

export function validateEnv(requiredKeys = []) {
  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(", ")}`);
  }
}

export default env;
