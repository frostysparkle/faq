import "dotenv/config";
import { z } from "zod";
import { SETTINGS_DEFAULTS } from "@samagama/shared";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/samagama_portal"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default("development-access-secret-change-before-production"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default("development-refresh-secret-change-before-production"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  PASSWORD_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  LLM_PROVIDER: z.enum(["mock", "gemini", "local_llama"]).default("mock"),
  EMBEDDING_PROVIDER: z.enum(["mock", "gemini"]).default("mock"),
  GEMINI_API_KEY: z.string().optional(),
  DUPLICATE_WARNING_THRESHOLD: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(SETTINGS_DEFAULTS.duplicateWarningThreshold),
  DUPLICATE_STRONG_THRESHOLD: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(SETTINGS_DEFAULTS.duplicateStrongThreshold),
  CHATBOT_RETRIEVAL_THRESHOLD: z.coerce
    .number()
    .min(0)
    .max(1)
    .default(SETTINGS_DEFAULTS.chatbotRetrievalThreshold),
  CHATBOT_MAX_SOURCES: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .default(SETTINGS_DEFAULTS.chatbotMaxSources)
});

export const env = envSchema.parse(process.env);
