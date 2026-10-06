/**
 * Abstract Payment Provider contract.
 * Any payment gateway (Stripe, PayPal, Adyen, Square) must implement this interface.
 */
export class PaymentProvider {
  /**
   * Create a payment intent or checkout session with the provider.
   * @param {object} params
   * @param {number} params.amountCents - Total charge in smallest currency unit (cents)
   * @param {string} params.currency - 3-letter currency code (e.g. "aud")
   * @param {object} [params.metadata] - Key-value metadata (orderId, orderNumber, userId)
   * @param {string} [params.idempotencyKey] - Unique key to prevent double charging
   * @returns {Promise<{ id: string, clientSecret: string, amount: number, status: string }>}
   */
  async createPaymentIntent(_params) {
    throw new Error("Method createPaymentIntent() must be implemented.");
  }

  /**
   * Retrieve an existing payment intent by ID.
   * @param {string} paymentIntentId
   * @returns {Promise<object>}
   */
  async retrievePaymentIntent(_paymentIntentId) {
    throw new Error("Method retrievePaymentIntent() must be implemented.");
  }

  /**
   * Cryptographically verify a webhook signature from the payment gateway.
   * @param {object} params
   * @param {Buffer|string} params.rawBody - Raw request body
   * @param {string} params.signature - Signature header from provider
   * @param {string} params.secret - Webhook signing secret
   * @returns {object} Verified event payload
   */
  verifyWebhookSignature(_params) {
    throw new Error("Method verifyWebhookSignature() must be implemented.");
  }

  /**
   * Process a refund for a previously captured payment.
   * @param {object} params
   * @param {string} params.paymentIntentId
   * @param {number} [params.amountCents]
   * @param {string} [params.reason]
   * @param {string} [params.idempotencyKey]
   * @returns {Promise<{ id: string, amount: number, status: string }>}
   */
  async createRefund(_params) {
    throw new Error("Method createRefund() must be implemented.");
  }
}
