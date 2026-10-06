import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { getOrderParamsSchema } from "./order.schema.js";
import { getOrderHandler } from "./order.controller.js";

export const orderRouter = Router();

// Order retrieval requires authentication
orderRouter.get(
  "/:orderNumber",
  authenticate,
  validate(getOrderParamsSchema),
  getOrderHandler
);
