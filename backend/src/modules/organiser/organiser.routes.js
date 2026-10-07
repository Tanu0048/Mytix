import { Router } from "express";
import * as organiserController from "./organiser.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { checkEventOwnership } from "../../middleware/ownership.js";
import {
  createEventSchema,
  updateEventSchema,
  listOrganiserEventsQuerySchema,
  issueComplimentaryTicketsSchema
} from "./organiser.schema.js";

const router = Router();

router.use(authenticate);

// Organiser Dashboard Routes (Must have ORGANISER or ADMIN role)
// Note: Organiser accounts are provisioned exclusively by the platform Admin.
router.post("/events", authorize("ORGANISER", "ADMIN"), validate(createEventSchema), organiserController.createEvent);
router.patch("/events/:id", authorize("ORGANISER", "ADMIN"), checkEventOwnership, validate(updateEventSchema), organiserController.updateEvent);
router.get("/events", authorize("ORGANISER", "ADMIN"), validate(listOrganiserEventsQuerySchema), organiserController.getEvents);
router.get("/events/:id", authorize("ORGANISER", "ADMIN"), checkEventOwnership, organiserController.getEvent);
router.delete("/events/:id", authorize("ORGANISER", "ADMIN"), checkEventOwnership, organiserController.deleteEvent);
router.get("/events/:id/sales", authorize("ORGANISER", "ADMIN"), checkEventOwnership, organiserController.getSalesStats);
router.get("/events/:id/attendees/export", authorize("ORGANISER", "ADMIN"), checkEventOwnership, organiserController.exportAttendees);
router.post("/events/:id/complimentary-tickets", authorize("ORGANISER", "ADMIN"), checkEventOwnership, validate(issueComplimentaryTicketsSchema), organiserController.issueComplimentary);

// Venues
router.post("/venues", authorize("ORGANISER", "ADMIN"), organiserController.createVenue);

export default router;
