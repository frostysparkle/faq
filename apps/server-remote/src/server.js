import app from "./app.js";
import { connectDB, registerGracefulShutdown } from "./config/db.js";
import { env } from "./config/env.js";

const bootstrap = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.info(`Samagama API listening on port ${env.PORT}`);
  });

  registerGracefulShutdown(server);
};

bootstrap().catch((error) => {
  console.error("Failed to start Samagama API", error);
  process.exit(1);
});
