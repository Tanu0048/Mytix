import { prisma } from "../../lib/prisma.js";
import { getPaymentProvider } from "../../providers/payment/index.js";
import { fulfillOrderAfterPayment, handleFailedPayment } from "../payments/fulfillment.service.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../utils/errors.js";
import { env } from "../../config/env.js";

/**
 * Handles incoming raw Stripe webhook notifications.
 * Verifies HMAC signature, deduplicates in database, and triggers fulfillment.
 */
export async function processStripeWebhook(rawBody, signature) {
  const secret = env.STRIPE_WEBHOOK_SECRET;

  if (!secret || secret.includes("placeholder")) {
    logger.warn("Stripe webhook secret is not configured, skipping signature check in dev mode");
    return { received: true, warning: "WEBHOOK_SECRET_NOT_CONFIGURED" };
  }

  const paymentProvider = getPaymentProvider();
  let event;

  try {
    event = paymentProvider.verifyWebhookSignature({
      rawBody,
      signature,
      secret
    });
  } catch (err) {
    logger.error("Invalid Stripe webhook signature", { error: err.message });
    throw new AppError("INVALID_SIGNATURE", 400, "Webhook signature verification failed.");
  }

  // Deduplication check in webhook_events table
  try {
    await prisma.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: event
      }
    });
  } catch (err) {
    if (err.code === "P2002") {
      logger.info("Skipping already processed Stripe webhook event", { eventId: event.id });
      return { received: true, duplicate: true };
    }
    logger.error("Failed to record webhook event in database", { error: err.message });
  }

  logger.info("Processing Stripe webhook event", {
    type: event.type,
    eventId: event.id
  });

  switch (event.type) {
    case "payment_intent.succeeded":
      await fulfillOrderAfterPayment(event.data.object);
      break;

    case "payment_intent.payment_failed":
      await handleFailedPayment(event.data.object);
      break;

    default:
      logger.info("Unhandled Stripe webhook event type ignored", { type: event.type });
  }

  return { received: true };
}
