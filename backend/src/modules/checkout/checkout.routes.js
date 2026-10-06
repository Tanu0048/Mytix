import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { idempotency } from "../../middleware/idempotency.js";
import { checkoutSchema } from "./checkout.schema.js";
import { checkoutHandler } from "./checkout.controller.js";

export const checkoutRouter = Router();

// Checkout requires logged-in user, idempotency support, and valid hold + attendees
checkoutRouter.post(
  "/",
  authenticate,
  idempotency,
  validate(checkoutSchema),
  checkoutHandler
);
