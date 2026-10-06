import Stripe from "stripe";
import { PaymentProvider } from "./payment.interface.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../utils/errors.js";

export class StripePaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.stripe = null;

    if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.includes("placeholder")) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-09-30.acacia"
      });
    }
  }

  ensureClient() {
    if (!this.stripe) {
      if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.includes("placeholder")) {
        this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
          apiVersion: "2024-09-30.acacia"
        });
      } else {
        throw new AppError(
          "PAYMENT_GATEWAY_NOT_CONFIGURED",
          500,
          "Stripe secret key (STRIPE_SECRET_KEY) is not configured with a valid key."
        );
      }
    }
    return this.stripe;
  }

  async createPaymentIntent({ amountCents, currency = "aud", metadata = {}, idempotencyKey }) {
    const stripe = this.ensureClient();

    const options = idempotencyKey ? { idempotencyKey } : {};

    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: currency.toLowerCase(),
          metadata,
          automatic_payment_methods: { enabled: true }
        },
        options
      );

      return {
        id: intent.id,
        clientSecret: intent.client_secret,
        amount: intent.amount,
        currency: intent.currency,
        status: intent.status
      };
    } catch (err) {
      logger.error("Failed to create Stripe PaymentIntent", {
        amountCents,
        error: err.message
      });
      throw new AppError("PAYMENT_INTENT_FAILED", 500, `Payment initialization failed: ${err.message}`);
    }
  }

  async retrievePaymentIntent(paymentIntentId) {
    const stripe = this.ensureClient();
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (err) {
      logger.error("Failed to retrieve Stripe PaymentIntent", {
        paymentIntentId,
        error: err.message
      });
      throw new AppError("PAYMENT_LOOKUP_FAILED", 500, `Payment lookup failed: ${err.message}`);
    }
  }

  verifyWebhookSignature({ rawBody, signature, secret }) {
    const stripe = this.ensureClient();
    try {
      return stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      logger.error("Stripe webhook signature verification failed", { error: err.message });
      throw new AppError("INVALID_WEBHOOK_SIGNATURE", 400, `Webhook signature verification failed: ${err.message}`);
    }
  }

  async createRefund({ paymentIntentId, amountCents, reason, idempotencyKey }) {
    const stripe = this.ensureClient();
    const options = idempotencyKey ? { idempotencyKey } : {};

    try {
      const refundParams = {
        payment_intent: paymentIntentId
      };
      if (amountCents) refundParams.amount = amountCents;
      if (reason) refundParams.reason = reason;

      const refund = await stripe.refunds.create(refundParams, options);

      return {
        id: refund.id,
        amount: refund.amount,
        status: refund.status
      };
    } catch (err) {
      logger.error("Failed to process Stripe refund", {
        paymentIntentId,
        error: err.message
      });
      throw new AppError("REFUND_FAILED", 500, `Refund processing failed: ${err.message}`);
    }
  }
}
