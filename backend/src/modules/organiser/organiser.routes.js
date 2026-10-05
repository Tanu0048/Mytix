import { Router } from "express";
import * as organiserController from "./organiser.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { checkEventOwnership } from "../../middleware/ownership.js";
import {
  applyOrganiserSchema,
  createEventSchema,
  listOrganiserEventsQuerySchema
} from "./organiser.schema.js";

const router = Router();

router.use(authenticate);

// 1. Organiser Application (Any logged-in user can apply)
router.post("/apply", validate(applyOrganiserSchema), organiserController.apply);

// 2. Organiser Dashboard Routes (Must have ORGANISER or ADMIN role)
router.post("/events", authorize("ORGANISER", "ADMIN"), validate(createEventSchema), organiserController.createEvent);
router.get("/events", authorize("ORGANISER", "ADMIN"), validate(listOrganiserEventsQuerySchema), organiserController.getEvents);
router.get("/events/:id/sales", authorize("ORGANISER", "ADMIN"), checkEventOwnership, organiserController.getSalesStats);

export default router;
