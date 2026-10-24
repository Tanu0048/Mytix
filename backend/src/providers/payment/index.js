import { StripePaymentProvider } from "./stripePayment.js";

// Currently active payment provider adapter
let paymentInstance = new StripePaymentProvider();

/**
 * Returns the currently active payment provider instance.
 * @returns {import("./payment.interface.js").PaymentProvider}
 */
export function getPaymentProvider() {
  return paymentInstance;
}

export function setPaymentProvider(provider) {
  paymentInstance = provider;
}

export { PaymentProvider } from "./payment.interface.js";
