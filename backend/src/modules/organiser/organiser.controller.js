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

export const exportAttendees = asyncHandler(async (req, res) => {
  const result = await organiserService.exportEventAttendeesCsv(req.params.id);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="attendees-${result.slug}.csv"`);
  res.status(200).send(result.csv);
});

export const issueComplimentary = asyncHandler(async (req, res) => {
  const result = await organiserService.issueComplimentaryTickets(req.user.id, req.params.id, req.body);
  res.status(201).json({
    success: true,
    data: result
  });
});
