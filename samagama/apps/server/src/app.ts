import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import { generalRateLimiter } from "./middlewares/rateLimiters.js";
import { apiRouter } from "./routes/index.js";
import { ok } from "./utils/apiResponse.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(generalRateLimiter);
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/health", (_req, res) => ok(res, { status: "ok", service: "samagama-server" }));
  app.use("/api", apiRouter);
  app.use(errorMiddleware);

  return app;
}
