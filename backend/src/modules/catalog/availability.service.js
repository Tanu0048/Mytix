import { prisma } from "../../lib/prisma.js";
import { getCached, setCached } from "../../lib/cache.js";
import { AppError } from "../../utils/errors.js";
import { CACHE_TTL } from "../../config/constants.js";

export async function getEventAvailability(slug) {
  const cacheKey = `availability:${slug}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      startsAt: true,
      ticketTypes: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          available: true,
          sold: true,
          saleStartsAt: true,
          saleEndsAt: true,
          minPerOrder: true,
          maxPerOrder: true
        },
        orderBy: { priceCents: "asc" }
      }
    }
  });

  if (!event) {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  const now = new Date();
  const oneHourBeforeShow = event.startsAt ? new Date(new Date(event.startsAt).getTime() - 60 * 60 * 1000) : null;
  const isBookingClosed = oneHourBeforeShow ? now >= oneHourBeforeShow : false;

  const tiers = event.ticketTypes.map((tier) => {
    const eventStarts = event.startsAt ? new Date(event.startsAt) : null;
    const saleStartsValid = !tier.saleStartsAt || (eventStarts && tier.saleStartsAt >= eventStarts) || now >= tier.saleStartsAt;
    const saleEndsValid = !tier.saleEndsAt || (eventStarts && tier.saleEndsAt >= eventStarts) || now <= tier.saleEndsAt;
    const isSaleOpen = !isBookingClosed && saleStartsValid && saleEndsValid;
    const isSoldOut = tier.available <= 0;

    return {
      id: tier.id,
      name: tier.name,
      priceCents: tier.priceCents,
      available: tier.available,
      isSoldOut,
      isSaleOpen,
      minPerOrder: tier.minPerOrder,
      maxPerOrder: tier.maxPerOrder
    };
  });

  const response = {
    eventId: event.id,
    eventStatus: event.status,
    startsAt: event.startsAt,
    isBookingClosed,
    allSoldOut: tiers.every((t) => t.isSoldOut),
    ticketTypes: tiers
  };

  setCached(cacheKey, response, CACHE_TTL.AVAILABILITY_SECONDS * 1000);
  return response;
}

export async function getEventSeats(slug) {
  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      startsAt: true,
      seatingType: true,
      seatingConfig: true,
      ticketTypes: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          available: true
        }
      }
    }
  });

  if (!event) {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      order: { eventId: event.id, status: { in: ["PAID", "PENDING"] } },
      status: { not: "CANCELLED" }
    },
    select: { seatRow: true, seatNumber: true, sectionName: true }
  });

  const bookedSeatsSet = new Set();
  for (const t of tickets) {
    if (t.seatRow && t.seatNumber) {
      let section = t.sectionName || "";
      let row = t.seatRow;
      if (row.includes(":")) {
        const parts = row.split(":");
        if (!section) section = parts[0];
        row = parts[1];
      }
      const num = t.seatNumber;

      bookedSeatsSet.add(`${row}-${num}`);
      if (section) {
        bookedSeatsSet.add(`${section}:${row}-${num}`);
        bookedSeatsSet.add(`${section}-${row}-${num}`);
      }
    }
  }

  const activeHolds = await prisma.inventoryHold.findMany({
    where: {
      ticketType: { eventId: event.id },
      status: "ACTIVE",
      expiresAt: { gt: new Date() }
    },
    select: { selectedSeats: true }
  });

  const heldSeatsSet = new Set();
  for (const h of activeHolds) {
    if (Array.isArray(h.selectedSeats)) {
      for (const s of h.selectedSeats) {
        if (typeof s === "string") {
          heldSeatsSet.add(s);
          if (s.includes(":")) {
            const [sec, rest] = s.split(":");
            heldSeatsSet.add(rest);
            heldSeatsSet.add(`${sec}-${rest}`);
          }
        } else if (s && s.row && s.seatNumber) {
          const row = s.row;
          const num = s.seatNumber;
          heldSeatsSet.add(`${row}-${num}`);
          if (s.section) {
            heldSeatsSet.add(`${s.section}:${row}-${num}`);
            heldSeatsSet.add(`${s.section}-${row}-${num}`);
          }
        }
      }
    }
  }

  const bookedSeats = Array.from(bookedSeatsSet);
  const heldSeats = Array.from(heldSeatsSet);

  const now = new Date();
  const oneHourBeforeShow = event.startsAt ? new Date(new Date(event.startsAt).getTime() - 60 * 60 * 1000) : null;
  const isBookingClosed = oneHourBeforeShow ? now >= oneHourBeforeShow : false;
  const allSoldOut = event.ticketTypes.every((t) => (t.available ?? 0) <= 0);

  return {
    eventId: event.id,
    startsAt: event.startsAt,
    isBookingClosed,
    allSoldOut,
    seatingType: event.seatingType || "GENERAL",
    seatingConfig: event.seatingConfig || null,
    ticketTypes: event.ticketTypes,
    bookedSeats,
    heldSeats
  };
}
