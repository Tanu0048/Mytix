import { asyncHandler } from "../../utils/asyncHandler.js";
import { processStripeWebhook } from "./stripeWebhook.service.js";

export const stripeWebhookHandler = asyncHandler(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const result = await processStripeWebhook(req.body, signature);
  res.status(200).json(result);
});
