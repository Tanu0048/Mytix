import { Router } from "express";
import * as catalogController from "./catalog.controller.js";
import { validate } from "../../middleware/validate.js";
import { cacheHeaders } from "../../middleware/cacheHeaders.js";
import { publicLimiter } from "../../middleware/rateLimit.js";
import { getEventsQuerySchema, slugParamSchema } from "./catalog.schema.js";

const router = Router();

router.use(publicLimiter);

router.get("/home", cacheHeaders(30), catalogController.getHome);
router.get("/events", validate(getEventsQuerySchema), cacheHeaders(15), catalogController.getEvents);
router.get("/events/upcoming", validate(getEventsQuerySchema), cacheHeaders(15), catalogController.getUpcomingEvents);
router.get("/events/:slug", validate(slugParamSchema), cacheHeaders(15), catalogController.getEventBySlug);
router.get("/events/:slug/availability", validate(slugParamSchema), cacheHeaders(5), catalogController.getAvailability);
router.get("/artists", cacheHeaders(30), catalogController.getArtists);
router.get("/artists/:slug", validate(slugParamSchema), cacheHeaders(30), catalogController.getArtistBySlug);
router.get("/venues", cacheHeaders(30), catalogController.getVenues);
router.get("/venues/:slug", validate(slugParamSchema), cacheHeaders(30), catalogController.getVenueBySlug);
router.get("/organisers/:slug", validate(slugParamSchema), cacheHeaders(30), catalogController.getOrganiserBySlug);

export default router;
