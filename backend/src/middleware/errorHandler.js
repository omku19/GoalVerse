export default function errorHandler(error, _req, res, _next) {
  const isDatabaseUnavailable = ["P1001", "P1002", "EACCES", "ECONNREFUSED", "ENOTFOUND"].includes(error.code);
  const isValidationError = error.name === "ZodError";
  const statusCode = error.statusCode || (isValidationError ? 400 : isDatabaseUnavailable ? 503 : 500);

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message: isDatabaseUnavailable
      ? "Service temporarily unavailable"
      : isValidationError
        ? error.issues?.[0]?.message || "Validation failed"
        : statusCode >= 500
          ? "Internal server error"
          : error.message,
  });
}
