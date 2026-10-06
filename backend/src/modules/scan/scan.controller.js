import { asyncHandler } from "../../utils/asyncHandler.js";
import * as scanService from "./scan.service.js";

export const scanTicketHandler = asyncHandler(async (req, res) => {
  const result = await scanService.processOnlineScan({
    qrToken: req.body.qrToken,
    gate: req.body.gate,
    deviceId: req.body.deviceId,
    userId: req.user.id,
    userRole: req.user.role
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
