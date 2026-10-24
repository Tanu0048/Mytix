import { asyncHandler } from "../../utils/asyncHandler.js";
import * as scanService from "./scan.service.js";

export const scanTicketHandler = asyncHandler(async (req, res) => {
  const result = await scanService.processOnlineScan({
    qrToken: req.body.qrToken,
    gate: req.body.gate || req.user.assignedGate || "Main Gate",
    deviceId: req.body.deviceId || "mobile-scanner",
    userId: req.user.id,
    userRole: req.user.role,
    staffId: req.user.staffId,
    staffOrganiserId: req.user.organiserId,
    staffEventId: req.user.eventId
  });
  res.status(200).json({
    status: "success",
    data: result
  });
});

export const exportManifestHandler = asyncHandler(async (req, res) => {
  const result = await scanService.exportEventManifest(
    req.params.eventId,
    req.user.id,
    req.user.role
  );
  res.status(200).json({
    status: "success",
    data: result
  });
});

export const syncOfflineScansHandler = asyncHandler(async (req, res) => {
  const result = await scanService.syncOfflineScans({
    eventId: req.body.eventId,
    scans: req.body.scans,
    userId: req.user.id,
    userRole: req.user.role
  });
  res.status(200).json({
    status: "success",
    data: result
  });
});

export const getScanStatsHandler = asyncHandler(async (req, res) => {
  const result = await scanService.getLiveScanStats(
    req.params.eventId,
    req.user.id,
    req.user.role
  );
  res.status(200).json({
    status: "success",
    data: result
  });
});

export const searchAttendeesHandler = asyncHandler(async (req, res) => {
  const result = await scanService.searchEventAttendees({
    eventId: req.query.eventId,
    query: req.query.query,
    userId: req.user.id,
    userRole: req.user.role,
    staffOrganiserId: req.user.organiserId
  });
  res.status(200).json({
    status: "success",
    data: result
  });
});

export const manualCheckinHandler = asyncHandler(async (req, res) => {
  const result = await scanService.manualCheckInTicket({
    ticketId: req.body.ticketId,
    gate: req.body.gate || req.user.assignedGate || "Manual Gate",
    userId: req.user.id,
    userRole: req.user.role,
    staffOrganiserId: req.user.organiserId,
    staffId: req.user.staffId
  });
  res.status(200).json({
    status: "success",
    data: result
  });
});

export const getAccessibleEventsHandler = asyncHandler(async (req, res) => {
  const events = await scanService.getStaffAccessibleEvents(
    req.user.id,
    req.user.role,
    req.user.organiserId,
    req.user.eventId
  );
  res.status(200).json({
    status: "success",
    data: events
  });
});
