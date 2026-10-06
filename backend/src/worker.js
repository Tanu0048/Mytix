import "./config/env.js";
import { getBoss } from "./lib/pgboss.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { releaseHoldIfActive, sweepExpiredHolds } from "./modules/holds/hold.service.js";

let isWorkerRunning = false;

export async function startWorker() {
  if (isWorkerRunning) {
    return;
  }
  logger.info("Initializing pg-boss background worker service");

  const boss = getBoss();
  await boss.start();

  logger.info("pg-boss background worker started successfully");

  // Delayed release worker job for individual holds after 10-minute TTL
  await boss.work("hold.release", async (jobs) => {
    const jobList = Array.isArray(jobs) ? jobs : [jobs];
    for (const job of jobList) {
      const { holdId } = job.data;
      logger.info("Processing delayed hold.release job", { holdId });
      try {
        await releaseHoldIfActive(holdId, "EXPIRED");
      } catch (err) {
        logger.error("Error executing hold.release job", { holdId, error: err.message });
      }
    }
  });

  // Schedule recurring 60-second backup sweep to reclaim orphaned holds
  await boss.schedule("hold.sweep", "* * * * *");
  await boss.work("hold.sweep", async () => {
    logger.info("Executing recurring hold.sweep cron task");
    try {
      await sweepExpiredHolds();
    } catch (err) {
      logger.error("Error running hold.sweep task", { error: err.message });
    }
  });

  isWorkerRunning = true;
  logger.info("Registered hold.release consumer and hold.sweep cron schedule");
}

export async function stopWorker() {
  if (!isWorkerRunning) {
    return;
  }
  try {
    const boss = getBoss();
    await boss.stop();
    isWorkerRunning = false;
    logger.info("Background worker stopped cleanly");
  } catch (err) {
    logger.error("Error stopping background worker", { error: err.message });
  }
}

// Standalone execution support: node src/worker.js
const isDirectRun = process.argv[1] && (process.argv[1].endsWith("worker.js") || process.argv[1].endsWith("worker"));
if (isDirectRun) {
  startWorker().catch((err) => {
    logger.error("Failed to start standalone background worker", { error: err.message, stack: err.stack });
    process.exit(1);
  });

  async function shutdownStandalone(signal) {
    logger.info(`Standalone worker received ${signal}, shutting down`);
    await stopWorker();
    await prisma.$disconnect();
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdownStandalone("SIGTERM"));
  process.on("SIGINT", () => shutdownStandalone("SIGINT"));
}
