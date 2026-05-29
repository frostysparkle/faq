import mongoose from "mongoose";
import { env } from "./env.js";

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 2000;

const delay = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

export const connectDB = async (attempt = 1) => {
  try {
    mongoose.set("strictQuery", true);

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });

    console.info("MongoDB connected");
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      console.error("MongoDB connection failed after retries", error);
      throw error;
    }

    const retryDelay = BASE_RETRY_DELAY_MS * attempt;
    console.warn(`MongoDB connection failed. Retrying in ${retryDelay}ms.`);
    await delay(retryDelay);
    await connectDB(attempt + 1);
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    console.info("MongoDB disconnected");
  }
};

export const registerGracefulShutdown = (server) => {
  const shutdown = async (signal) => {
    console.info(`${signal} received. Shutting down Samagama API.`);

    await new Promise((resolve) => {
      server.close(resolve);
    });

    await disconnectDB();
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
};
