export default function errorHandler(error, _req, res, _next) {
  /* ─── Detect database-level failures ────────────────────── */
  const isDatabaseUnavailable = [
    "P1001",        // Can't reach database server
    "P1002",        // Database timeout
    "P1008",        // Operations timed out
    "P1017",        // Server closed connection
    "ETIMEDOUT",    // TCP timeout (Neon serverless cold-start)
    "EACCES",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOTFOUND",
  ].includes(error.code);

  const isValidationError = error.name === "ZodError";
  const isPrismaValidation = error.name === "PrismaClientValidationError";
  const isPrismaKnown = error.name === "PrismaClientKnownRequestError";

  let statusCode = error.statusCode || 500;
  if (isValidationError || isPrismaValidation) statusCode = 400;
  if (isDatabaseUnavailable) statusCode = 503;
  if (isPrismaKnown && !isDatabaseUnavailable) statusCode = error.statusCode || 400;

  /* ─── Always log server errors ──────────────────────────── */
  if (statusCode >= 500 || isDatabaseUnavailable) {
    console.error(`[${statusCode}]`, error);
  }

  /* ─── Build a safe message ──────────────────────────────── */
  let message = "Internal server error";

  if (isDatabaseUnavailable) {
    message = "Service temporarily unavailable — please retry in a few seconds";
  } else if (isValidationError) {
    message = error.issues?.[0]?.message || "Validation failed";
  } else if (isPrismaValidation) {
    message = "Invalid request data";
  } else if (isPrismaKnown) {
    message = error.meta?.cause || error.message || "Database request failed";
  } else if (statusCode < 500) {
    message = error.message || message;
  }

  /* ─── Always return valid JSON ──────────────────────────── */
  res.status(statusCode).json({ message });
}
