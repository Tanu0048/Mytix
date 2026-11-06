import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { pgboss } from "../../lib/pgboss.js";
import { logger } from "../../lib/logger.js";
import { deleteCached } from "../../lib/cache.js";
import { AppError } from "../../utils/errors.js";
import { HOLD_DURATION_MINUTES } from "../../config/constants.js";
import { calculateOrderPricing } from "../checkout/pricing.service.js";
import { validateSelectedSeats } from "../organiser/seating.js";

/**
 * Parses a seat reference into { section, row, num }.
 * Accepts "Section:A-1", "Section-A-1", "A-1" or { section, row, seatNumber }.
 */
function parseSeat(seat) {
  if (seat && typeof seat === "object") {
    return {
      section: seat.section || null,
      row: seat.row != null ? String(seat.row) : null,
      num: seat.seatNumber != null ? String(seat.seatNumber) : seat.seat != null ? String(seat.seat) : null
    };
  }
  if (typeof seat !== "string") return { section: null, row: null, num: null };

  let section = null;
  let rest = seat;
  const colon = seat.indexOf(":");
  if (colon !== -1) {
    section = seat.slice(0, colon);
    rest = seat.slice(colon + 1);
  }
  const parts = rest.split("-");
  if (parts.length < 2) return { section, row: rest, num: null };
  const num = parts[parts.length - 1];
  const row = parts[parts.length - 2];
  if (!section && parts.length > 2) section = parts.slice(0, -2).join("-");
  return { section, row, num };
}

/** Same physical seat: row and number match, and sections match whenever both are known. */
function isSameSeat(a, b) {
  if (!a.row || !a.num || a.row !== b.row || a.num !== b.num) return false;
  return !a.section || !b.section || a.section === b.section;
}

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

/** Max number of different ticket categories in one booking. */
const MAX_ITEMS_PER_BOOKING = 10;

/**
 * Loads a ticket category and checks that the requested quantity (and seats, for seat maps)
 * can be held right now. Returns the validated item.
 */
async function prepareHoldItem({ ticketTypeId, quantity, selectedSeats: requestedSeatList }, now) {
  let selectedSeats = requestedSeatList;

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          startsAt: true,
          seatingType: true,
          seatingConfig: true
        }
      }
    }
  });

  if (!ticketType) {
    throw new AppError("NOT_FOUND", 404, "Ticket type not found.");
  }

  // Seat-map events (v2 configs): seated categories need valid seats, standing ones need none.
  // Legacy (pre-v2) seat maps keep the old lenient behaviour.
  if (ticketType.event.seatingType === "RESERVED" && ticketType.event.seatingConfig?.version === 2) {
    const normalized = validateSelectedSeats(ticketType.event.seatingConfig, ticketType.name, selectedSeats, quantity);
    selectedSeats = normalized || undefined;
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

  if (ticketType.available <= 0) {
    throw new AppError("SOLD_OUT", 400, `All “${ticketType.name}” tickets are sold out.`);
  }

  if (ticketType.available < quantity) {
    throw new AppError("NOT_ENOUGH_TICKETS", 400, `Only ${ticketType.available} “${ticketType.name}” tickets are available.`);
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
      throw new AppError("SALE_ENDED", 400, `Ticket sales for “${ticketType.name}” have ended.`);
    }
  }

  if (quantity < ticketType.minPerOrder) {
    throw new AppError(
      "QUANTITY_BELOW_MINIMUM",
      400,
      `Minimum quantity per order for “${ticketType.name}” is ${ticketType.minPerOrder}.`
    );
  }

  if (quantity > ticketType.maxPerOrder) {
    throw new AppError(
      "QUANTITY_EXCEEDS_MAXIMUM",
      400,
      `Maximum quantity per order for “${ticketType.name}” is ${ticketType.maxPerOrder}.`
    );
  }

  return { ticketType, quantity, selectedSeats };
}

/** Throws if any requested seat is already booked, or currently held by another user. */
async function assertSeatsFree(userId, eventId, seatKeys, now) {
  if (seatKeys.length === 0) return;
  const requestedSeats = seatKeys.map((key) => ({ key, seat: parseSeat(key) }));

  // 1. Already booked?
  const existingTickets = await prisma.ticket.findMany({
    where: {
      order: { eventId, status: { in: ["PAID", "PENDING"] } },
      status: { not: "CANCELLED" }
    },
    select: { seatRow: true, seatNumber: true, sectionName: true }
  });

  for (const t of existingTickets) {
    if (!t.seatRow || !t.seatNumber) continue;
    // Older tickets stored the section inside seatRow ("Section:A"), so split it back out.
    const rowHasSection = t.seatRow.includes(":");
    const ticketSeat = {
      section: t.sectionName || (rowHasSection ? t.seatRow.split(":")[0] : null),
      row: rowHasSection ? t.seatRow.split(":")[1] : t.seatRow,
      num: String(t.seatNumber)
    };
    for (const { key, seat } of requestedSeats) {
      if (isSameSeat(seat, ticketSeat)) {
        throw new AppError("SEAT_ALREADY_BOOKED", 409, `Seat ${key} has already been booked. Please choose another seat.`);
      }
    }
  }

  // 2. Held by someone else?
  const otherHolds = await prisma.inventoryHold.findMany({
    where: {
      ticketType: { eventId },
      status: "ACTIVE",
      expiresAt: { gt: now },
      userId: { not: userId }
    },
    select: { selectedSeats: true }
  });

  for (const h of otherHolds) {
    if (!Array.isArray(h.selectedSeats)) continue;
    for (const heldSeat of h.selectedSeats) {
      const held = parseSeat(heldSeat);
      const clash = requestedSeats.find(({ seat }) => isSameSeat(seat, held));
      if (clash) {
        throw new AppError("SEAT_HELD", 409, `Seat ${clash.key} is currently held by another user. Please choose another seat.`);
      }
    }
  }
}

/**
 * All holds that belong to the same booking as `hold` (itself first), using the given
 * Prisma client or transaction. Single-category bookings return just [hold].
 */
export async function findHoldGroup(db, hold, include) {
  if (!hold?.groupId) return [hold];
  const group = await db.inventoryHold.findMany({
    where: { groupId: hold.groupId },
    orderBy: { createdAt: "asc" },
    ...(include ? { include } : {})
  });
  // Keep the requested hold first so callers can treat it as the "primary" one
  return [hold, ...group.filter((h) => h.id !== hold.id)];
}

/**
 * Reserves tickets for one booking. Accepts either a single category
 * ({ ticketTypeId, quantity, selectedSeats }) or several at once
 * ({ items: [{ ticketTypeId, quantity, selectedSeats }, ...] }), e.g. 2 VIP + 2 Standard seats.
 * All categories are reserved together or not at all.
 */
export async function createHold(userId, body) {
  const now = new Date();
  const rawItems = Array.isArray(body?.items) && body.items.length > 0 ? body.items : [body];

  if (rawItems.length > MAX_ITEMS_PER_BOOKING) {
    throw new AppError("VALIDATION_ERROR", 400, `A booking can include at most ${MAX_ITEMS_PER_BOOKING} ticket categories.`);
  }
  const seenTypes = new Set();
  for (const item of rawItems) {
    if (seenTypes.has(item.ticketTypeId)) {
      throw new AppError("VALIDATION_ERROR", 400, "Each ticket category can only appear once in a booking.");
    }
    seenTypes.add(item.ticketTypeId);
  }

  const items = [];
  for (const raw of rawItems) items.push(await prepareHoldItem(raw, now));

  const event = items[0].ticketType.event;
  if (items.some((i) => i.ticketType.event.id !== event.id)) {
    throw new AppError("VALIDATION_ERROR", 400, "All tickets in one booking must be for the same event.");
  }

  // One active booking per user per event. A new selection replaces an earlier unpaid
  // reservation; only a reservation whose payment is already in progress is resumed instead.
  const existingHolds = await prisma.inventoryHold.findMany({
    where: {
      userId,
      status: "ACTIVE",
      expiresAt: { gt: now },
      ticketType: { eventId: event.id }
    },
    orderBy: { createdAt: "asc" },
    include: { orders: { where: { status: { in: ["PENDING", "PAID"] } }, select: { id: true } } }
  });

  const inPayment = existingHolds.find((h) => h.orders && h.orders.length > 0);
  if (inPayment) {
    return {
      holdId: inPayment.id,
      eventId: event.id,
      quantity: inPayment.quantity,
      expiresAt: inPayment.expiresAt,
      existing: true
    };
  }
  for (const h of existingHolds) {
    await releaseHoldIfActive(h.id, "RELEASED");
  }

  // Seats across every category in this booking must be free
  const seatKeys = items.flatMap((i) =>
    Array.isArray(i.selectedSeats) ? i.selectedSeats.map((s) => (typeof s === "string" ? s : `${s.row}-${s.seatNumber}`)) : []
  );
  if (new Set(seatKeys).size !== seatKeys.length) {
    throw new AppError("VALIDATION_ERROR", 400, "The same seat was selected twice.");
  }
  await assertSeatsFree(userId, event.id, seatKeys, now);

  const expiresAt = new Date(now.getTime() + HOLD_DURATION_MINUTES * 60 * 1000);
  const groupId = items.length > 1 ? crypto.randomUUID() : null;

  // Atomic compare-and-swap stock decrement for every category, then the holds — all or nothing
  const holds = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const item of items) {
      const updateResult = await tx.ticketType.updateMany({
        where: { id: item.ticketType.id, available: { gte: item.quantity } },
        data: { available: { decrement: item.quantity } }
      });

      if (updateResult.count === 0) {
        throw new AppError("SOLD_OUT", 409, `“${item.ticketType.name}” tickets are sold out or the requested quantity is unavailable.`);
      }

      created.push(
        await tx.inventoryHold.create({
          data: {
            userId,
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
            selectedSeats: item.selectedSeats || null,
            groupId,
            status: "ACTIVE",
            expiresAt
          },
          include: {
            ticketType: { select: { id: true, name: true, priceCents: true } }
          }
        })
      );
    }
    return created;
  });

  // Bust availability cache for real-time responsiveness
  if (event.slug) {
    deleteCached(`availability:${event.slug}`);
  }

  // Schedule background delayed jobs for automatic release after TTL
  for (const hold of holds) {
    try {
      await pgboss.send("hold.release", { holdId: hold.id }, { startAfter: HOLD_DURATION_MINUTES * 60 });
    } catch (err) {
      logger.error("Failed to enqueue delayed hold release job", { holdId: hold.id, error: err.message });
    }
  }

  const primary = holds[0];
  const totalQuantity = holds.reduce((sum, h) => sum + h.quantity, 0);
  const totalCents = holds.reduce((sum, h) => sum + h.ticketType.priceCents * h.quantity, 0);
  const secondsRemaining = Math.max(0, Math.floor((primary.expiresAt.getTime() - Date.now()) / 1000));

  return {
    holdId: primary.id,
    groupId,
    eventId: event.id,
    eventTitle: event.title,
    ticketTypeId: primary.ticketTypeId,
    ticketTypeName: holds.map((h) => h.ticketType.name).join(" + "),
    quantity: totalQuantity,
    unitPriceCents: primary.ticketType.priceCents,
    totalCents,
    items: holds.map((h) => ({
      holdId: h.id,
      ticketTypeId: h.ticketTypeId,
      ticketTypeName: h.ticketType.name,
      quantity: h.quantity,
      unitPriceCents: h.ticketType.priceCents,
      selectedSeats: h.selectedSeats || null
    })),
    expiresAt: primary.expiresAt,
    secondsRemaining
  };
}

export async function releaseHold(holdId, userId, userRole) {
  const hold = await prisma.inventoryHold.findUnique({ where: { id: holdId } });

  if (!hold) {
    throw new AppError("NOT_FOUND", 404, "Hold not found.");
  }

  if (userRole !== "ADMIN" && hold.userId !== userId) {
    throw new AppError("FORBIDDEN", 403, "Not authorized to release this hold.");
  }

  const group = await findHoldGroup(prisma, hold);
  if (group.every((h) => h.status !== "ACTIVE")) {
    return {
      holdId,
      status: hold.status,
      message: `Hold is already ${hold.status.toLowerCase()}.`
    };
  }

  let releasedQuantity = 0;
  for (const h of group) {
    const result = await releaseHoldIfActive(h.id, "RELEASED");
    if (result.released) releasedQuantity += result.quantity || 0;
  }

  return {
    holdId,
    status: "RELEASED",
    releasedQuantity,
    message: "Hold released successfully."
  };
}

export async function getHoldById(holdId, userId, userRole) {
  const ticketTypeInclude = {
    ticketType: {
      select: {
        id: true,
        name: true,
        priceCents: true,
        event: { select: { id: true, title: true, slug: true, startsAt: true } }
      }
    }
  };
  const hold = await prisma.inventoryHold.findUnique({ where: { id: holdId }, include: ticketTypeInclude });

  if (!hold) {
    throw new AppError("NOT_FOUND", 404, "Hold not found.");
  }

  if (userRole !== "ADMIN" && hold.userId !== userId) {
    throw new AppError("FORBIDDEN", 403, "Not authorized to view this hold.");
  }

  const group = await findHoldGroup(prisma, hold, ticketTypeInclude);

  const now = new Date();
  if (hold.status === "ACTIVE" && now > hold.expiresAt) {
    for (const h of group) await releaseHoldIfActive(h.id, "EXPIRED");
    hold.status = "EXPIRED";
  }

  const secondsRemaining = Math.max(0, Math.floor((hold.expiresAt.getTime() - Date.now()) / 1000));
  const totalQuantity = group.reduce((sum, h) => sum + h.quantity, 0);
  const totalCents = group.reduce((sum, h) => sum + h.ticketType.priceCents * h.quantity, 0);
  const allSeats = group.flatMap((h) => (Array.isArray(h.selectedSeats) ? h.selectedSeats : []));

  // Same pricing the checkout will charge, so the UI never has to guess the booking fee.
  const pricing = await calculateOrderPricing(totalCents);

  return {
    holdId: hold.id,
    groupId: hold.groupId || null,
    eventId: hold.ticketType.event.id,
    eventTitle: hold.ticketType.event.title,
    eventSlug: hold.ticketType.event.slug,
    eventStartsAt: hold.ticketType.event.startsAt,
    pricing,
    selectedSeats: allSeats.length > 0 ? allSeats : null,
    ticketTypeId: hold.ticketTypeId,
    ticketTypeName: group.map((h) => h.ticketType.name).join(" + "),
    quantity: totalQuantity,
    unitPriceCents: hold.ticketType.priceCents,
    totalCents,
    items: group.map((h) => ({
      holdId: h.id,
      ticketTypeId: h.ticketTypeId,
      ticketTypeName: h.ticketType.name,
      quantity: h.quantity,
      unitPriceCents: h.ticketType.priceCents,
      totalCents: h.ticketType.priceCents * h.quantity,
      selectedSeats: h.selectedSeats || null
    })),
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
