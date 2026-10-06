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

  // Schedule payment reconciliation every 15 minutes for stuck pending orders
  await boss.schedule("payment.reconcile", "*/15 * * * *");
  await boss.work("payment.reconcile", async () => {
    logger.info("Executing payment.reconcile cron task");
    try {
      const { reconcileStuckOrders } = await import("./modules/payments/reconcile.service.js");
      await reconcileStuckOrders();
    } catch (err) {
      logger.error("Error running payment.reconcile task", { error: err.message });
    }
  });

  // Worker consumer for ticket generation & order confirmation emails
  await boss.work("ticket.generate", async (jobs) => {
    const jobList = Array.isArray(jobs) ? jobs : [jobs];
    for (const job of jobList) {
      const { orderId, attendees } = job.data;
      logger.info("Executing ticket.generate background job", { orderId });
      try {
        const { generateTicketsForOrder } = await import("./modules/tickets/ticket.service.js");
        await generateTicketsForOrder(orderId, attendees);
      } catch (err) {
        logger.error("Error executing ticket.generate job", { orderId, error: err.message });
      }
    }
  });

  isWorkerRunning = true;
  logger.info("Registered hold, payment, and ticket worker consumers and cron schedules");
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
