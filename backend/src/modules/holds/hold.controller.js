import { asyncHandler } from "../../utils/asyncHandler.js";
import * as holdService from "./hold.service.js";

export const createHoldHandler = asyncHandler(async (req, res) => {
  const result = await holdService.createHold(req.user.id, req.body);
  res.status(201).json({
    status: "success",
    data: result
  });
});

export const getActiveHoldsHandler = asyncHandler(async (req, res) => {
  const result = await holdService.getActiveHolds(req.user.id);
  res.status(200).json({
    status: "success",
    data: result
  });
});

export const getHoldHandler = asyncHandler(async (req, res) => {
  const result = await holdService.getHoldById(req.params.id, req.user.id, req.user.role);
  res.status(200).json({
    status: "success",
    data: result
  });
});

export const releaseHoldHandler = asyncHandler(async (req, res) => {
  const result = await holdService.releaseHold(req.params.id, req.user.id, req.user.role);
  res.status(200).json({
    status: "success",
    data: result
  });
});
