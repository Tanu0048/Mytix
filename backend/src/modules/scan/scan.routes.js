import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  scanTicketSchema,
  manifestParamSchema,
  scanSyncSchema,
  scanStatsParamSchema
} from "./scan.schema.js";
import {
  scanTicketHandler,
  exportManifestHandler,
  syncOfflineScansHandler,
  getScanStatsHandler,
  searchAttendeesHandler,
  manualCheckinHandler,
  getAccessibleEventsHandler
} from "./scan.controller.js";

export const scanRouter = Router();

// Scanning & Gate Check-In endpoints for Organisers, Admins, and Staff
scanRouter.post(
  "/",
  authenticate,
  authorize("ORGANISER", "ADMIN", "STAFF"),
  validate(scanTicketSchema),
  scanTicketHandler
);

scanRouter.get(
  "/events",
  authenticate,
  authorize("ORGANISER", "ADMIN", "STAFF"),
  getAccessibleEventsHandler
);

scanRouter.get(
  "/search",
  authenticate,
  authorize("ORGANISER", "ADMIN", "STAFF"),
  searchAttendeesHandler
);

scanRouter.post(
  "/manual-checkin",
  authenticate,
  authorize("ORGANISER", "ADMIN", "STAFF"),
  manualCheckinHandler
);

scanRouter.get(
  "/manifest/:eventId",
  authenticate,
  authorize("ORGANISER", "ADMIN"),
  validate(manifestParamSchema),
  exportManifestHandler
);

scanRouter.post(
  "/sync",
  authenticate,
  authorize("ORGANISER", "ADMIN", "STAFF"),
  validate(scanSyncSchema),
  syncOfflineScansHandler
);

scanRouter.get(
  "/stats/:eventId",
  authenticate,
  authorize("ORGANISER", "ADMIN", "STAFF"),
  validate(scanStatsParamSchema),
  getScanStatsHandler
);
