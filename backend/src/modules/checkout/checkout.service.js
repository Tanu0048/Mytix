import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { getPaymentProvider } from "../../providers/payment/index.js";
import { calculateOrderPricing } from "./pricing.service.js";
import { AppError } from "../../utils/errors.js";

/**
 * Initiates the checkout pipeline for an active inventory hold.
 * Generates an order in PENDING status and creates a Stripe PaymentIntent.
 */
export async function createCheckoutSession(userId, { holdId, attendees }, idempotencyKey) {
  const now = new Date();

  const hold = await prisma.inventoryHold.findUnique({
    where: { id: holdId },
    include: {
      ticketType: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        }
      },
      orders: {
        where: {
          status: { in: ["PENDING", "PAID"] }
        }
      }
    }
  });

  if (!hold) {
    throw new AppError("NOT_FOUND", 404, "Hold reservation not found.");
  }

  if (hold.userId !== userId) {
    throw new AppError("FORBIDDEN", 403, "You do not own this ticket reservation.");
  }

  if (hold.status !== "ACTIVE" || now > hold.expiresAt) {
    throw new AppError(
      "HOLD_EXPIRED",
      410,
      "Your ticket reservation has expired. Please select tickets again."
    );
  }

  if (attendees.length !== hold.quantity) {
    throw new AppError(
      "ATTENDEE_COUNT_MISMATCH",
      400,
      `Exactly ${hold.quantity} attendee(s) must be specified for this reservation.`
    );
  }

  // Ensure no already-paid order exists on this hold
  const paidOrder = hold.orders.find((o) => o.status === "PAID");
  if (paidOrder) {
    throw new AppError("ORDER_ALREADY_PAID", 409, "This reservation has already been paid and fulfilled.");
  }

  // Calculate whole-cents pricing with Australian domestic surcharge
  const ticketTotalCents = hold.ticketType.priceCents * hold.quantity;
  const pricing = await calculateOrderPricing(ticketTotalCents);

  // Re-use an existing pending order if created moments earlier, or create a new one
  let order = hold.orders.find((o) => o.status === "PENDING");

  if (!order) {
    const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

    order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          eventId: hold.ticketType.event.id,
          holdId: hold.id,
          status: "PENDING",
          ticketTotalCents: pricing.ticketTotalCents,
          buyerFeeCents: pricing.buyerFeeCents,
          totalCents: pricing.totalCents,
          currency: "AUD"
        }
      });

      await tx.orderItem.create({
        data: {
          orderId: createdOrder.id,
          ticketTypeId: hold.ticketTypeId,
          quantity: hold.quantity,
          unitPriceCents: hold.ticketType.priceCents
        }
      });

      return createdOrder;
    });
  }

  // Create or retrieve PaymentIntent from active payment gateway
  const paymentProvider = getPaymentProvider();
  const paymentIntent = await paymentProvider.createPaymentIntent({
    amountCents: order.totalCents,
    currency: order.currency.toLowerCase(),
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId,
      holdId: hold.id,
      attendees: JSON.stringify(attendees)
    },
    idempotencyKey
  });

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    eventId: hold.ticketType.event.id,
    eventTitle: hold.ticketType.event.title,
    ticketTypeId: hold.ticketTypeId,
    ticketTypeName: hold.ticketType.name,
    quantity: hold.quantity,
    pricing: {
      ticketTotalCents: order.ticketTotalCents,
      buyerFeeCents: order.buyerFeeCents,
      totalCents: order.totalCents,
      currency: order.currency
    },
    payment: {
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.id,
      amountCents: paymentIntent.amount,
      status: paymentIntent.status
    }
  };
}
