import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import env from "./config/env.js";
import apiRoutes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import notFoundHandler from "./middleware/notFoundHandler.js";

const app = express();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      let originHost = "";
      try {
        originHost = new URL(origin).hostname;
      } catch (_error) {
        return callback(new Error("Not allowed by CORS"));
      }

      if (env.frontendUrls.includes(origin)) return callback(null, true);

      const suffixAllowed = env.frontendOriginSuffixes.some((suffix) => {
        const normalizedSuffix = suffix.startsWith(".") ? suffix : `.${suffix}`;
        const bareSuffix = normalizedSuffix.slice(1);
        return originHost === bareSuffix || originHost.endsWith(normalizedSuffix);
      });

      if (suffixAllowed) return callback(null, true);

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.use("/api/auth", authLimiter);
app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
