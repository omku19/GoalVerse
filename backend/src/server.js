import app from "./app.js";
import env, { validateEnv } from "./config/env.js";

validateEnv(["DATABASE_URL", "JWT_SECRET"]);

const server = app.listen(env.port, () => {
  console.log(`API server running on port ${env.port}`);
});

server.on("error", (error) => {
  console.error("Failed to start API server:", error.message);
  process.exitCode = 1;
});
