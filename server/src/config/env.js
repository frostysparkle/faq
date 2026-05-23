import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

// Semantic search uses @xenova/transformers (local, no API key required).
// Model is downloaded automatically on first server start (~90MB, cached in node_modules/.cache).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, "../../../.env");

dotenv.config({ path: rootEnvPath });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().trim().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().trim().min(1),
  JWT_REFRESH_EXPIRY: z.string().trim().min(1),
  CLIENT_URL: z.string().trim().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = Object.freeze(parsedEnv.data);
