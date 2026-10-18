import { prisma } from "../../lib/prisma.js";
import { pgboss } from "../../lib/pgboss.js";
import { logger } from "../../lib/logger.js";
import { deleteCached } from "../../lib/cache.js";
import { AppError } from "../../utils/errors.js";
import { HOLD_DURATION_MINUTES } from "../../config/constants.js";

export async function getActiveHolds(userId) {
  const holds = await prisma.inventoryHold.findMany({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() }
    },
    include: {
      ticketType: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      }
    }
  });

  return holds.map(hold => ({
    holdId: hold.id,
    eventId: hold.ticketType.event.id,
    eventSlug: hold.ticketType.event.slug,
    eventTitle: hold.ticketType.event.title,
    ticketName: hold.ticketType.name,
    quantity: hold.quantity,
    totalCents: hold.quantity * hold.ticketType.priceCents,
    expiresAt: hold.expiresAt,
    secondsRemaining: Math.max(0, Math.floor((hold.expiresAt.getTime() - Date.now()) / 1000))
  }));
}

export async function createHold(userId, { ticketTypeId, quantity, selectedSeats }) {
  const now = new Date();

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          startsAt: true
        }
      }
    }
  });

  if (!ticketType) {
    throw new AppError("NOT_FOUND", 404, "Ticket type not found.");
  }

  if (ticketType.event.status !== "PUBLISHED") {
    throw new AppError("EVENT_NOT_AVAILABLE", 400, "Event is not published for ticket sales.");
  }

  // 1-Hour Cutoff: Ticket booking closes 1 hour before show starts
  if (ticketType.event.startsAt) {
    const oneHourBeforeShow = new Date(new Date(ticketType.event.startsAt).getTime() - 60 * 60 * 1000);
    if (now >= oneHourBeforeShow) {
      throw new AppError("BOOKING_CLOSED", 400, "Ticket bookings close 1 hour before the show starts.");
    }
  }

  // Sold Out check
  if (ticketType.available <= 0) {
    throw new AppError("SOLD_OUT", 400, "All tickets for this tier are sold out.");
  }

  if (ticketType.available < quantity) {
    throw new AppError("NOT_ENOUGH_TICKETS", 400, `Only ${ticketType.available} tickets available in this category.`);
  }

  // Only check SALE_NOT_STARTED if saleStartsAt is explicitly before the event start and hasn't arrived
  if (ticketType.saleStartsAt && now < ticketType.saleStartsAt) {
    const eventStartsAt = ticketType.event?.startsAt ? new Date(ticketType.event.startsAt) : null;
    if (eventStartsAt && ticketType.saleStartsAt < eventStartsAt) {
      throw new AppError("SALE_NOT_STARTED", 400, "Ticket sales have not started yet.");
    }
  }

  // Only check SALE_ENDED if saleEndsAt is explicitly before event start and has passed
  if (ticketType.saleEndsAt && now > ticketType.saleEndsAt) {
    const eventStartsAt = ticketType.event?.startsAt ? new Date(ticketType.event.startsAt) : null;
    if (eventStartsAt && ticketType.saleEndsAt < eventStartsAt) {
      throw new AppError("SALE_ENDED", 400, "Ticket sales for this tier have ended.");
    }
  }

  if (quantity < ticketType.minPerOrder) {
    throw new AppError(
      "QUANTITY_BELOW_MINIMUM",
      400,
      `Minimum quantity per order for this ticket is ${ticketType.minPerOrder}.`
    );
  }

  if (quantity > ticketType.maxPerOrder) {
    throw new AppError(
      "QUANTITY_EXCEEDS_MAXIMUM",
      400,
      `Maximum quantity per order for this ticket is ${ticketType.maxPerOrder}.`
    );
  }

  // Prevent multiple concurrent active holds by the same user on the same event
  const existingHold = await prisma.inventoryHold.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: now },
      ticketType: {
        eventId: ticketType.event.id
      }
    }
  });

  if (existingHold) {
    return {
      holdId: existingHold.id,
      eventId: ticketType.event.id,
      quantity: existingHold.quantity,
      expiresAt: existingHold.expiresAt,
      existing: true
    };
  }

  // Validate selectedSeats against already booked or currently held seats
  if (Array.isArray(selectedSeats) && selectedSeats.length > 0) {
    const seatKeys = selectedSeats.map((s) => (typeof s === "string" ? s : `${s.row}-${s.seatNumber}`));

    // 1. Check if any seat is already booked
    const existingTickets = await prisma.ticket.findMany({
      where: {
        order: { eventId: ticketType.event.id, status: { in: ["PAID", "PENDING"] } },
        status: { not: "CANCELLED" }
      },
      select: { seatRow: true, seatNumber: true, sectionName: true }
    });

    for (const t of existingTickets) {
      const cleanRow = t.seatRow?.includes(":") ? t.seatRow.split(":")[1] : t.seatRow;
      const tKey1 = `${cleanRow}-${t.seatNumber}`;
      const tKey2 = `${t.seatRow}-${t.seatNumber}`;
      const tKey3 = t.sectionName ? `${t.sectionName}:${cleanRow}-${t.seatNumber}` : null;

      for (const reqSeat of seatKeys) {
        if (reqSeat === tKey1 || reqSeat === tKey2 || reqSeat === tKey3 || reqSeat.endsWith(`:${cleanRow}-${t.seatNumber}`) || reqSeat.endsWith(`-${cleanRow}-${t.seatNumber}`)) {
          throw new AppError("SEAT_ALREADY_BOOKED", 409, `Seat ${reqSeat} has already been booked. Please choose another seat.`);
        }
      }
    }

    // 2. Check if any seat is held by another user
    const otherHolds = await prisma.inventoryHold.findMany({
      where: {
        ticketType: { eventId: ticketType.event.id },
        status: "ACTIVE",
        expiresAt: { gt: now },
        userId: { not: userId }
      },
      select: { selectedSeats: true }
    });

    for (const h of otherHolds) {
      if (Array.isArray(h.selectedSeats)) {
        for (const heldSeat of h.selectedSeats) {
          if (seatKeys.includes(heldSeat)) {
            throw new AppError("SEAT_HELD", 409, `Seat ${heldSeat} is currently held by another user. Please choose another seat.`);
          }
        }
      }
    }
  }

  const expiresAt = new Date(now.getTime() + HOLD_DURATION_MINUTES * 60 * 1000);

  // Atomic Compare-And-Swap stock decrement and hold creation in one transaction
  const hold = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.ticketType.updateMany({
      where: {
        id: ticketTypeId,
        available: { gte: quantity }
      },
      data: {
        available: { decrement: quantity }
      }
    });

    if (updateResult.count === 0) {
      throw new AppError("SOLD_OUT", 409, "Tickets are sold out or requested quantity is unavailable.");
    }

    return tx.inventoryHold.create({
      data: {
        userId,
        ticketTypeId,
        quantity,
        selectedSeats: selectedSeats || null,
        status: "ACTIVE",
        expiresAt
      },
      include: {
        ticketType: {
          select: {
            id: true,
            name: true,
            priceCents: true,
            event: {
              select: {
                id: true,
                title: true,
                slug: true
              }
            }
          }
        }
      }
    });
  });

  // Bust availability cache for real-time responsiveness
  if (ticketType.event?.slug) {
    deleteCached(`availability:${ticketType.event.slug}`);
  }

  // Schedule background delayed job for automatic hold release after TTL
  try {
    await pgboss.send(
      "hold.release",
      { holdId: hold.id },
      { startAfter: HOLD_DURATION_MINUTES * 60 }
    );
  } catch (err) {
    logger.error("Failed to enqueue delayed hold release job", {
      holdId: hold.id,
      error: err.message
    });
  }

  const secondsRemaining = Math.max(0, Math.floor((hold.expiresAt.getTime() - Date.now()) / 1000));

  return {
    holdId: hold.id,
    eventId: hold.ticketType.event.id,
    eventTitle: hold.ticketType.event.title,
    ticketTypeId: hold.ticketTypeId,
    ticketTypeName: hold.ticketType.name,
    quantity: hold.quantity,
    unitPriceCents: hold.ticketType.priceCents,
    totalCents: hold.ticketType.priceCents * hold.quantity,
    expiresAt: hold.expiresAt,
    secondsRemaining
  };
}

export async function releaseHold(holdId, userId, userRole) {
  const hold = await prisma.inventoryHold.findUnique({
    where: { id: holdId },
    include: {
      ticketType: {
        include: {
          event: {
            select: { slug: true }
          }
        }
      }
    }
  });

  if (!hold) {
    throw new AppError("NOT_FOUND", 404, "Hold not found.");
  }

  if (userRole !== "ADMIN" && hold.userId !== userId) {
    throw new AppError("FORBIDDEN", 403, "Not authorized to release this hold.");
  }

  if (hold.status !== "ACTIVE") {
    return {
      holdId,
      status: hold.status,
      message: `Hold is already ${hold.status.toLowerCase()}.`
    };
  }

  const result = await releaseHoldIfActive(holdId, "RELEASED");

  return {
    holdId,
    status: "RELEASED",
    releasedQuantity: result.quantity || hold.quantity,
    message: "Hold released successfully."
  };
}

export async function getHoldById(holdId, userId, userRole) {
  const hold = await prisma.inventoryHold.findUnique({
    where: { id: holdId },
    include: {
      ticketType: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      }
    }
  });

  if (!hold) {
    throw new AppError("NOT_FOUND", 404, "Hold not found.");
  }

  if (userRole !== "ADMIN" && hold.userId !== userId) {
    throw new AppError("FORBIDDEN", 403, "Not authorized to view this hold.");
  }

  const now = new Date();
  if (hold.status === "ACTIVE" && now > hold.expiresAt) {
    await releaseHoldIfActive(holdId, "EXPIRED");
    hold.status = "EXPIRED";
  }

  const secondsRemaining = Math.max(0, Math.floor((hold.expiresAt.getTime() - Date.now()) / 1000));

  return {
    holdId: hold.id,
    eventId: hold.ticketType.event.id,
    eventTitle: hold.ticketType.event.title,
    ticketTypeId: hold.ticketTypeId,
    ticketTypeName: hold.ticketType.name,
    quantity: hold.quantity,
    unitPriceCents: hold.ticketType.priceCents,
    totalCents: hold.ticketType.priceCents * hold.quantity,
    status: hold.status,
    expiresAt: hold.expiresAt,
    secondsRemaining: hold.status === "ACTIVE" ? secondsRemaining : 0
  };
}

export async function releaseHoldIfActive(holdId, targetStatus = "EXPIRED") {
  return prisma.$transaction(async (tx) => {
    const hold = await tx.inventoryHold.findUnique({
      where: { id: holdId },
      include: {
        ticketType: {
          include: {
            event: {
              select: { slug: true }
            }
          }
        }
      }
    });

    if (!hold || hold.status !== "ACTIVE") {
      return { released: false, reason: "NOT_ACTIVE" };
    }

    const updateResult = await tx.inventoryHold.updateMany({
      where: {
        id: holdId,
        status: "ACTIVE"
      },
      data: {
        status: targetStatus
      }
    });

    if (updateResult.count === 1) {
      await tx.ticketType.update({
        where: { id: hold.ticketTypeId },
        data: {
          available: { increment: hold.quantity }
        }
      });

      if (hold.ticketType?.event?.slug) {
        deleteCached(`availability:${hold.ticketType.event.slug}`);
      }

      logger.info("Stock returned to inventory from released hold", {
        holdId,
        ticketTypeId: hold.ticketTypeId,
        quantity: hold.quantity,
        targetStatus
      });

      return { released: true, holdId, quantity: hold.quantity };
    }

    return { released: false, reason: "ALREADY_PROCESSED" };
  });
}

export async function sweepExpiredHolds() {
  const now = new Date();

  const expiredHolds = await prisma.inventoryHold.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: now }
    },
    select: {
      id: true
    },
    take: 100
  });

  if (expiredHolds.length === 0) {
    return { swept: 0, reclaimed: 0 };
  }

  let reclaimedCount = 0;
  for (const item of expiredHolds) {
    try {
      const res = await releaseHoldIfActive(item.id, "EXPIRED");
      if (res.released) {
        reclaimedCount++;
      }
    } catch (err) {
      logger.error("Error releasing expired hold during sweep", {
        holdId: item.id,
        error: err.message
      });
    }
  }

  logger.info("Completed hold sweep cycle", {
    identified: expiredHolds.length,
    reclaimed: reclaimedCount
  });

  return {
    swept: expiredHolds.length,
    reclaimed: reclaimedCount
  };
}
