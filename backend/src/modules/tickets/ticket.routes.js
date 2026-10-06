import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { viewTicketHtmlHandler, getTicketDetailsHandler } from "./ticket.controller.js";

export const ticketRouter = Router();

// Renders standalone dynamic HTML ticket for browser viewing and native Print-to-PDF
ticketRouter.get("/:id/view", authenticate, viewTicketHtmlHandler);

// Fetches ticket JSON details
ticketRouter.get("/:id", authenticate, getTicketDetailsHandler);
