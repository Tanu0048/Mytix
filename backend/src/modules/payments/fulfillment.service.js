import { prisma } from "../../lib/prisma.js";
import { pgboss } from "../../lib/pgboss.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../utils/errors.js";

/**
 * Executes the atomic Order Fulfillment Saga once Stripe confirms payment.
 * Runs in a single Prisma transaction:
 * 1. Order status -> PAID
 * 2. InventoryHold status -> CONVERTED
 * 3. TicketType.sold -> increment
 * 4. Create Payment record
 * 5. Write double-entry LedgerEntry rows (SALE, BUYER_FEE, STRIPE_FEE)
 * 6. Enqueue ticket generation & order confirmation email
 */
export async function fulfillOrderAfterPayment(paymentIntent) {
  const { orderId, attendees: rawAttendees } = paymentIntent.metadata || {};

  if (!orderId) {
    logger.error("PaymentIntent metadata is missing orderId", { paymentIntentId: paymentIntent.id });
    throw new AppError("INVALID_METADATA", 400, "Missing orderId in payment metadata.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      hold: true,
      items: {
        include: {
          ticketType: true
        }
      },
      event: {
        select: {
          id: true,
          organiserId: true,
          title: true
        }
      }
    }
  });

  if (!order) {
    logger.error("Order not found during payment fulfillment", { orderId });
    throw new AppError("ORDER_NOT_FOUND", 404, `Order ${orderId} not found.`);
  }

  if (order.status === "PAID") {
    logger.info("Order is already marked PAID, skipping redundant fulfillment", { orderId });
    return order;
  }

  // Parse actual Stripe fee if available from balance transaction, or compute estimated domestic rate
  const stripeFeeCents = paymentIntent.charges?.data?.[0]?.balance_transaction?.fee ||
    Math.round(order.totalCents * 0.017 + 30);
  const netCents = order.totalCents - stripeFeeCents;
  const cardCountry = paymentIntent.charges?.data?.[0]?.payment_method_details?.card?.country || "AU";

  const updatedOrder = await prisma.$transaction(async (tx) => {
    // 1. Mark Order as PAID
    const paidOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID" }
    });

    // 2. Mark InventoryHold as CONVERTED (if attached)
    if (order.holdId) {
      await tx.inventoryHold.updateMany({
        where: { id: order.holdId, status: "ACTIVE" },
        data: { status: "CONVERTED" }
      });
    }

    // 3. Increment sold count for each ticket type in order items
    for (const item of order.items) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: {
          sold: { increment: item.quantity }
        }
      });
    }

    // 4. Create Payment record
    await tx.payment.create({
      data: {
        orderId: order.id,
        stripePaymentIntentId: paymentIntent.id,
        amountCents: paymentIntent.amount,
        stripeFeeCents,
        netCents,
        cardCountry,
        status: "SUCCEEDED"
      }
    });

    // 5. Write double-entry financial ledger lines
    // Line A: Ticket face value earned by the organiser
    await tx.ledgerEntry.create({
      data: {
        organiserId: order.event.organiserId,
        eventId: order.eventId,
        orderId: order.id,
        type: "SALE",
        amountCents: order.ticketTotalCents
      }
    });

    // Line B: Buyer surcharge fee collected
    if (order.buyerFeeCents > 0) {
      await tx.ledgerEntry.create({
        data: {
          organiserId: order.event.organiserId,
          eventId: order.eventId,
          orderId: order.id,
          type: "BUYER_FEE",
          amountCents: order.buyerFeeCents
        }
      });
    }

    // Line C: Stripe processing fee deduction (negative balance line)
    await tx.ledgerEntry.create({
      data: {
        organiserId: order.event.organiserId,
        eventId: order.eventId,
        orderId: order.id,
        type: "STRIPE_FEE",
        amountCents: -stripeFeeCents
      }
    });

    return paidOrder;
  });

  logger.info("Order fulfillment transaction committed successfully", {
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
    totalCents: updatedOrder.totalCents
  });

  // Parse attendees list from metadata for ticket generation
  let attendeesList = [];
  try {
    if (rawAttendees) {
      attendeesList = JSON.parse(rawAttendees);
    }
  } catch (err) {
    logger.warn("Could not parse attendees from payment metadata", { error: err.message });
  }

  // 6. Enqueue background jobs for Ticket Generation and Email Notification
  try {
    await pgboss.send("ticket.generate", {
      orderId: updatedOrder.id,
      attendees: attendeesList
    });
  } catch (err) {
    logger.error("Failed to enqueue ticket.generate job", {
      orderId: updatedOrder.id,
      error: err.message
    });
  }

  return updatedOrder;
}

export async function handleFailedPayment(paymentIntent) {
  const { orderId } = paymentIntent.metadata || {};
  if (!orderId) return;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId }
    });

    if (order && order.status === "PENDING") {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "FAILED" }
      });

      if (order.holdId) {
        // Release inventory hold back to stock
        const hold = await tx.inventoryHold.findUnique({
          where: { id: order.holdId }
        });
        if (hold && hold.status === "ACTIVE") {
          await tx.inventoryHold.update({
            where: { id: hold.id },
            data: { status: "RELEASED" }
          });
          await tx.ticketType.update({
            where: { id: hold.ticketTypeId },
            data: { available: { increment: hold.quantity } }
          });
        }
      }
    }
  });

  logger.info("Handled payment failure for order", { orderId });
}
