import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { createHoldSchema, holdIdParamSchema } from "./hold.schema.js";
import {
  createHoldHandler,
  getHoldHandler,
  releaseHoldHandler
} from "./hold.controller.js";

export const holdRouter = Router();

// All hold operations require authenticated user login
holdRouter.post(
  "/",
  authenticate,
  validate({ body: createHoldSchema }),
  createHoldHandler
);

holdRouter.get(
  "/:id",
  authenticate,
  validate({ params: holdIdParamSchema }),
  getHoldHandler
);

holdRouter.delete(
  "/:id",
  authenticate,
  validate({ params: holdIdParamSchema }),
  releaseHoldHandler
);
