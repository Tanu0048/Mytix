import { StripePaymentProvider } from "./stripePayment.js";

// Currently active payment provider adapter
const paymentInstance = new StripePaymentProvider();

/**
 * Returns the currently active payment provider instance.
 * @returns {import("./payment.interface.js").PaymentProvider}
 */
export function getPaymentProvider() {
  return paymentInstance;
}

export { PaymentProvider } from "./payment.interface.js";
