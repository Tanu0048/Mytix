import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { getPaymentProvider } from "../../providers/payment/index.js";
import { calculateOrderPricing } from "./pricing.service.js";
import { AppError } from "../../utils/errors.js";
import { env } from "../../config/env.js";
import { findHoldGroup } from "../holds/hold.service.js";

/**
 * Initiates the checkout pipeline for an active inventory hold.
 * Generates an order in PENDING status and creates a Stripe PaymentIntent.
 */
export async function createCheckoutSession(userId, { holdId, attendees = [] }, idempotencyKey) {
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

  // A booking can span several ticket categories (one hold each, sharing a groupId)
  const group = await findHoldGroup(prisma, hold, {
    ticketType: { select: { id: true, name: true, priceCents: true } }
  });
  if (group.some((h) => h.status !== "ACTIVE" || now > h.expiresAt)) {
    throw new AppError("HOLD_EXPIRED", 410, "Your ticket reservation has expired. Please select tickets again.");
  }
  const totalQuantity = group.reduce((sum, h) => sum + h.quantity, 0);

  // Auto-populate attendees from buyer account if not provided or empty
  let finalAttendees = Array.isArray(attendees) ? [...attendees] : [];
  if (finalAttendees.length === 0) {
    const buyer = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });
    finalAttendees = Array(totalQuantity).fill(null).map(() => ({
      name: buyer?.name || "Event Attendee",
      email: buyer?.email || "attendee@mytix.com"
    }));
  } else if (finalAttendees.length !== totalQuantity) {
    throw new AppError(
      "ATTENDEE_COUNT_MISMATCH",
      400,
      `Exactly ${totalQuantity} attendee(s) must be specified for this reservation.`
    );
  }

  // Ensure no already-paid order exists on this hold
  const paidOrder = hold.orders.find((o) => o.status === "PAID");
  if (paidOrder) {
    throw new AppError("ORDER_ALREADY_PAID", 409, "This reservation has already been paid and fulfilled.");
  }

  // Calculate whole-cents pricing with Australian domestic surcharge
  const ticketTotalCents = group.reduce((sum, h) => sum + h.ticketType.priceCents * h.quantity, 0);
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

      // One order item per ticket category in the booking
      for (const h of group) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            ticketTypeId: h.ticketTypeId,
            quantity: h.quantity,
            unitPriceCents: h.ticketType.priceCents,
            selectedSeats: h.selectedSeats || null
          }
        });
      }

      return createdOrder;
    });
  }

  // Create or retrieve PaymentIntent from active payment gateway
  let paymentIntent;
  try {
    const paymentProvider = getPaymentProvider();
    paymentIntent = await paymentProvider.createPaymentIntent({
      amountCents: order.totalCents,
      currency: order.currency.toLowerCase(),
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId,
        holdId: hold.id,
        attendees: JSON.stringify(finalAttendees)
      },
      idempotencyKey
    });
  } catch (err) {
    const isGatewayNotConfigured =
      err.code === "PAYMENT_GATEWAY_NOT_CONFIGURED" ||
      (err.message && err.message.includes("PAYMENT_GATEWAY_NOT_CONFIGURED"));

    // Strictly restrict demo-mode auto-fulfillment to non-production environments
    if (isGatewayNotConfigured && env.NODE_ENV !== "production") {
      // Demo Mode: Mock the PaymentIntent and Fulfill immediately (Development / Testing only)
      const { fulfillOrderAfterPayment } = await import("../payments/fulfillment.service.js");
      const { generateTicketsForOrder } = await import("../tickets/ticket.service.js");
      paymentIntent = {
        id: `pi_demo_${Date.now()}`,
        clientSecret: `sec_demo_${Date.now()}`,
        amount: order.totalCents,
        currency: order.currency.toLowerCase(),
        status: "succeeded",
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId,
          holdId: hold.id,
          attendees: JSON.stringify(finalAttendees)
        }
      };
      await fulfillOrderAfterPayment(paymentIntent);
      // Generate tickets synchronously in demo mode to avoid pgboss queue delays
      await generateTicketsForOrder(order.id, finalAttendees);
    } else if (isGatewayNotConfigured) {
      throw new AppError(
        "PAYMENT_SERVICE_UNAVAILABLE",
        503,
        "Payment gateway is not configured or currently unavailable. Please try again later."
      );
    } else {
      throw err;
    }
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    eventId: hold.ticketType.event.id,
    eventTitle: hold.ticketType.event.title,
    ticketTypeId: hold.ticketTypeId,
    ticketTypeName: group.map((h) => h.ticketType.name).join(" + "),
    quantity: totalQuantity,
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
