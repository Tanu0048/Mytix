import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { generateSignedQrToken, renderQrCodeDataUri } from "./qr.service.js";
import { renderTicketHtml } from "./ticketHtml.service.js";
import { sendOrderConfirmationNotification } from "../notifications/email.service.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../utils/errors.js";

/**
 * Generates tickets with Ed25519 signed QR codes for an order and triggers the confirmation email.
 */
export async function generateTicketsForOrder(orderId, attendeesList = []) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          ticketType: true
        }
      },
      event: {
        include: {
          venue: true
        }
      },
      tickets: true
    }
  });

  if (!order) {
    logger.error("Order not found when generating tickets", { orderId });
    throw new AppError("ORDER_NOT_FOUND", 404, `Order ${orderId} not found.`);
  }

  // If tickets were already generated, avoid duplicate creation
  if (order.tickets.length > 0) {
    logger.info("Tickets already generated for order", { orderId, count: order.tickets.length });
    return order.tickets;
  }

  const createdTickets = [];
  let attendeeIndex = 0;

  for (const item of order.items) {
    for (let i = 0; i < item.quantity; i++) {
      const ticketId = crypto.randomUUID();
      const attendee = attendeesList[attendeeIndex] || {
        name: order.user.name,
        email: order.user.email
      };
      attendeeIndex++;

      const { token, tokenHash } = generateSignedQrToken({
        ticketId,
        eventId: order.eventId,
        orderId: order.id
      });

      const ticket = await prisma.ticket.create({
        data: {
          id: ticketId,
          orderId: order.id,
          attendeeName: attendee.name,
          attendeeEmail: attendee.email,
          qrTokenHash: tokenHash,
          status: "VALID"
        }
      });

      createdTickets.push({ ...ticket, token });
    }
  }

  logger.info("Successfully generated tickets for order", {
    orderId: order.id,
    orderNumber: order.orderNumber,
    ticketsCreated: createdTickets.length
  });

  // Dispatch transactional order confirmation email
  try {
    const eventDateFormatted = new Intl.DateTimeFormat("en-AU", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Australia/Sydney"
    }).format(order.event.startsAt);

    const firstTierName = order.items[0]?.ticketType?.name || "General Admission";
    const totalAud = (order.totalCents / 100).toFixed(2);
    const viewTicketsUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/me/tickets`;

    await sendOrderConfirmationNotification({
      recipientEmail: order.user.email,
      attendeeName: order.user.name,
      orderNumber: order.orderNumber,
      eventTitle: order.event.title,
      venueName: order.event.venue.name,
      eventDate: eventDateFormatted,
      ticketTypeName: firstTierName,
      quantity: createdTickets.length,
      totalAud,
      viewTicketsUrl
    });
  } catch (emailErr) {
    logger.error("Failed to send order confirmation email", {
      orderId: order.id,
      error: emailErr.message
    });
  }

  return createdTickets;
}

/**
 * Validates ownership and renders the standalone dynamic HTML ticket with embedded QR code.
 */
export async function getTicketHtmlView(ticketId, userId, userRole) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      order: {
        include: {
          items: { include: { ticketType: true } },
          event: { include: { venue: true } }
        }
      }
    }
  });

  if (!ticket) {
    throw new AppError("NOT_FOUND", 404, "Ticket not found.");
  }

  // User ownership check
  if (userRole !== "ADMIN" && ticket.order.userId !== userId) {
    throw new AppError("FORBIDDEN", 403, "You do not own this ticket.");
  }

  const { event } = ticket.order;
  const item = ticket.order.items[0];

  // Generate the signed QR token and render to Data URI
  const { token } = generateSignedQrToken({
    ticketId: ticket.id,
    eventId: event.id,
    orderId: ticket.order.id
  });

  const qrCodeDataUri = await renderQrCodeDataUri(token);

  const eventDateFormatted = new Intl.DateTimeFormat("en-AU", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Australia/Sydney"
  }).format(event.startsAt);

  const unitPriceAud = item?.unitPriceCents ? (item.unitPriceCents / 100).toFixed(2) : "0.00";

  return renderTicketHtml({
    ticketId: ticket.id,
    orderNumber: ticket.order.orderNumber,
    eventTitle: event.title,
    eventCategory: event.category,
    venueName: event.venue.name,
    venueAddress: `${event.venue.address}, ${event.venue.city} ${event.venue.state}`,
    eventDate: eventDateFormatted,
    ticketTypeName: item?.ticketType?.name || "General Admission",
    unitPriceAud,
    attendeeName: ticket.attendeeName,
    attendeeEmail: ticket.attendeeEmail,
    qrCodeDataUri,
    status: ticket.status
  });
}

export async function getTicketDetails(ticketId, userId, userRole) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          eventId: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startsAt: true,
              venue: { select: { name: true, city: true } }
            }
          }
        }
      }
    }
  });

  if (!ticket) {
    throw new AppError("NOT_FOUND", 404, "Ticket not found.");
  }

  if (userRole !== "ADMIN" && ticket.order.userId !== userId) {
    throw new AppError("FORBIDDEN", 403, "You do not have access to this ticket.");
  }

  return ticket;
}
