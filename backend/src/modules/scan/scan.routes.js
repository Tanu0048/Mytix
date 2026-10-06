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
  getScanStatsHandler
} from "./scan.controller.js";

export const scanRouter = Router();

// Scanning endpoints are strictly restricted to event Organisers and Admins
scanRouter.post(
  "/",
  authenticate,
  authorize("ORGANISER", "ADMIN"),
  validate(scanTicketSchema),
  scanTicketHandler
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
  authorize("ORGANISER", "ADMIN"),
  validate(scanSyncSchema),
  syncOfflineScansHandler
);

scanRouter.get(
  "/stats/:eventId",
  authenticate,
  authorize("ORGANISER", "ADMIN"),
  validate(scanStatsParamSchema),
  getScanStatsHandler
);
