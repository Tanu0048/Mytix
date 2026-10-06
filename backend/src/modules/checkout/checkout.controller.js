import { asyncHandler } from "../../utils/asyncHandler.js";
import * as checkoutService from "./checkout.service.js";

export const checkoutHandler = asyncHandler(async (req, res) => {
  const idempotencyKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];
  const result = await checkoutService.createCheckoutSession(req.user.id, req.body, idempotencyKey);

  res.status(201).json({
    status: "success",
    data: result
  });
});
