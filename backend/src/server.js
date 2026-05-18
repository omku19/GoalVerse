import app from "./app.js";
import { validateEnv } from "./config/env.js";

validateEnv(["DATABASE_URL", "JWT_SECRET"]);

const PORT = process.env.PORT || 5000;

/* ─── Global safety nets ─────────────────────────────────── */
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
  process.exitCode = 1;
});

/* ─── Start server ───────────────────────────────────────── */
const server = app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

server.on("error", (error) => {
  console.error("Failed to start API server:", error.message);
  process.exitCode = 1;
});
