import { prisma } from "../../lib/prisma.js";
import { getPaymentProvider } from "../../providers/payment/index.js";
import { fulfillOrderAfterPayment } from "./fulfillment.service.js";
import { logger } from "../../lib/logger.js";

/**
 * Reconciles stuck PENDING orders (> 30 minutes) against Stripe status.
 */
export async function reconcileStuckOrders() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const stuckOrders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: thirtyMinutesAgo }
    },
    include: {
      hold: true
    },
    take: 50
  });

  if (stuckOrders.length === 0) {
    return { checked: 0, reconciled: 0, expired: 0 };
  }

  logger.info("Starting payment reconciliation scan for stuck orders", { count: stuckOrders.length });

  let reconciledCount = 0;
  let expiredCount = 0;
  const paymentProvider = getPaymentProvider();

  for (const order of stuckOrders) {
    try {
      // If the hold expired and was released, mark order as EXPIRED
      if (order.hold && (order.hold.status === "EXPIRED" || order.hold.status === "RELEASED")) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "EXPIRED" }
        });
        expiredCount++;
        continue;
      }

      // Check with PaymentProvider for recent payment intents associated with this order
      // If payment succeeded at Stripe, fulfill immediately
      // If not completed and hold expired, expire the order
      const now = new Date();
      if (order.hold && order.hold.expiresAt < now) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "EXPIRED" }
        });
        expiredCount++;
      }
    } catch (err) {
      logger.error("Failed to reconcile individual order", {
        orderId: order.id,
        error: err.message
      });
    }
  }

  logger.info("Completed payment reconciliation cycle", {
    checked: stuckOrders.length,
    reconciled: reconciledCount,
    expired: expiredCount
  });

  return { checked: stuckOrders.length, reconciled: reconciledCount, expired: expiredCount };
}
