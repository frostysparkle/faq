import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

async function bootstrap(): Promise<void> {
  await connectDatabase();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Samagama API listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error: unknown) => {
  logger.error("Failed to start API server", error);
  process.exit(1);
});
