import { prisma } from "../../lib/prisma.js";
import { generateSlug } from "../../utils/slug.js";
import { AppError } from "../../utils/errors.js";
import { parseCursorPagination, formatPaginatedResponse } from "../../utils/pagination.js";

export async function applyForOrganiser(userId, data) {
  const existing = await prisma.organiser.findUnique({
    where: { userId }
  });

  if (existing) {
    throw new AppError("VALIDATION_ERROR", 400, "An organiser application already exists for this account.");
  }

  const organiser = await prisma.organiser.create({
    data: {
      userId,
      businessName: data.businessName,
      abn: data.abn,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      payoutDetails: data.payoutDetails,
      status: "APPROVED" // Auto-approve for streamlined onboarding in Phase 3
    }
  });

  // Promote user role to ORGANISER
  await prisma.user.update({
    where: { id: userId },
    data: { role: "ORGANISER" }
  });

  return organiser;
}

export async function createEvent(userId, data) {
  const organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  if (!organiser || organiser.status !== "APPROVED") {
    throw new AppError("FORBIDDEN", 403, "Approved organiser account is required to create events.");
  }

  const venue = await prisma.venue.findUnique({
    where: { id: data.venueId }
  });

  if (!venue) {
    throw new AppError("NOT_FOUND", 404, "Venue not found.");
  }

  // Generate unique slug
  let slug = generateSlug(data.title);
  const existingSlug = await prisma.event.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const event = await prisma.event.create({
    data: {
      organiserId: organiser.id,
      venueId: data.venueId,
      title: data.title,
      slug,
      description: data.description,
      startsAt: new Date(data.startsAt),
      doorsOpenAt: data.doorsOpenAt ? new Date(data.doorsOpenAt) : null,
      status: "PUBLISHED", // Published upon creation for testing Phase 3
      category: data.category || "Concert",
      artists: data.artists?.length
        ? {
            create: data.artists.map((a) => ({
              artistId: a.artistId,
              isHeadline: a.isHeadline
            }))
          }
        : undefined,
      ticketTypes: {
        create: data.ticketTypes.map((t) => ({
          name: t.name,
          priceCents: t.priceCents,
          quantity: t.quantity,
          available: t.quantity,
          saleStartsAt: new Date(t.saleStartsAt),
          saleEndsAt: new Date(t.saleEndsAt),
          minPerOrder: t.minPerOrder || 1,
          maxPerOrder: t.maxPerOrder || 10
        }))
      }
    },
    include: {
      ticketTypes: true,
      venue: true,
      artists: { include: { artist: true } }
    }
  });

  return event;
}

export async function listOrganiserEvents(userId, query = {}) {
  const organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  if (!organiser) {
    throw new AppError("FORBIDDEN", 403, "Organiser profile not found.");
  }

  const { limit, cursor } = parseCursorPagination(query);

  const events = await prisma.event.findMany({
    where: { organiserId: organiser.id },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    include: {
      venue: { select: { name: true, city: true } },
      ticketTypes: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          quantity: true,
          available: true,
          sold: true
        }
      }
    }
  });

  return formatPaginatedResponse(events, limit);
}

export async function getEventSalesStats(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ticketTypes: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          quantity: true,
          available: true,
          sold: true
        }
      }
    }
  });

  if (!event) {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  let totalRevenueCents = 0;
  let totalSold = 0;
  let totalCapacity = 0;

  for (const tier of event.ticketTypes) {
    totalSold += tier.sold;
    totalCapacity += tier.quantity;
    totalRevenueCents += tier.sold * tier.priceCents;
  }

  return {
    eventId: event.id,
    eventTitle: event.title,
    eventStatus: event.status,
    totalCapacity,
    totalSold,
    totalRevenueCents,
    ticketTiers: event.ticketTypes
  };
}
