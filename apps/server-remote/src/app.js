import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { emptyQuerySchema } from "@samagama/shared/schemas";
import { env } from "./config/env.js";
import { ERROR_CODES } from "./constants/errorCodes.js";
import { HTTP_STATUS } from "./constants/httpStatus.js";
import { asyncHandler } from "./middleware/asyncHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { sendSuccess } from "./utils/apiResponse.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/users.js";
import faqRoutes from "./routes/faqRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import { validate } from "./middleware/validate.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: "Too many requests. Please try again shortly.",
        details: null
      }
    }
  })
);

app.get(
  "/api/health",
  validate(emptyQuerySchema, "query"),
  asyncHandler(async (_req, res) => {
    sendSuccess(
      res,
      {
        service: "samagama-navigator-api",
        status: "ok",
        environment: env.NODE_ENV
      },
      HTTP_STATUS.OK
    );
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api", questionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assistant", assistantRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
