import { asyncHandler } from "../../utils/asyncHandler.js";
import * as ticketService from "./ticket.service.js";

export const viewTicketHtmlHandler = asyncHandler(async (req, res) => {
  const html = await ticketService.getTicketHtmlView(req.params.id, req.user.id, req.user.role);
  res.status(200).type("html").send(html);
});

export const getTicketDetailsHandler = asyncHandler(async (req, res) => {
  const result = await ticketService.getTicketDetails(req.params.id, req.user.id, req.user.role);
  res.status(200).json({
    status: "success",
    data: result
  });
});
