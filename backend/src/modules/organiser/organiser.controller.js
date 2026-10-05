import { asyncHandler } from "../../utils/asyncHandler.js";
import * as organiserService from "./organiser.service.js";

export const apply = asyncHandler(async (req, res) => {
  const organiser = await organiserService.applyForOrganiser(req.user.id, req.body);
  res.status(201).json(organiser);
});

export const createEvent = asyncHandler(async (req, res) => {
  const event = await organiserService.createEvent(req.user.id, req.body);
  res.status(201).json(event);
});

export const getEvents = asyncHandler(async (req, res) => {
  const events = await organiserService.listOrganiserEvents(req.user.id, req.query);
  res.status(200).json(events);
});

export const getSalesStats = asyncHandler(async (req, res) => {
  const stats = await organiserService.getEventSalesStats(req.params.id);
  res.status(200).json(stats);
});
