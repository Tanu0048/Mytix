import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.PORT, () => {
  logger.info(`Server started listening on port ${env.PORT}`, {
    port: env.PORT,
    environment: env.NODE_ENV
  });
});

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, initiating graceful shutdown`);

  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await prisma.$disconnect();
      logger.info("Prisma client disconnected successfully");
      process.exit(0);
    } catch (err) {
      logger.error("Error during database disconnection", { error: err.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Forceful shutdown after timeout limit reached");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception occurred", { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
  process.exit(1);
});
