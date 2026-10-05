import { getBoss } from "./lib/pgboss.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { releaseHoldIfActive, sweepExpiredHolds } from "./modules/holds/hold.service.js";

async function startWorker() {
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

  logger.info("Registered hold.release consumer and hold.sweep cron schedule");
}

startWorker().catch((err) => {
  logger.error("Failed to start background worker", { error: err.message, stack: err.stack });
  process.exit(1);
});

async function shutdownWorker(signal) {
  logger.info(`Worker received ${signal}, shutting down`);
  try {
    const boss = getBoss();
    await boss.stop();
    await prisma.$disconnect();
    logger.info("Worker and database disconnected cleanly");
    process.exit(0);
  } catch (err) {
    logger.error("Error shutting down worker", { error: err.message });
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdownWorker("SIGTERM"));
process.on("SIGINT", () => shutdownWorker("SIGINT"));
