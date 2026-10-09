import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { generateSlug } from "../../utils/slug.js";
import { AppError } from "../../utils/errors.js";
import { parseCursorPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { generateTicketsForOrder } from "../tickets/ticket.service.js";

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
      status: "PENDING"
    }
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
      posterPath: data.posterPath,
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

export async function updateEvent(userId, eventId, data) {
  const organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  if (!organiser || organiser.status !== "APPROVED") {
    throw new AppError("FORBIDDEN", 403, "Approved organiser account is required to update events.");
  }

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!existingEvent || existingEvent.organiserId !== organiser.id) {
    throw new AppError("NOT_FOUND", 404, "Event not found or you do not have permission.");
  }

  const updateData = {};
  if (data.title !== undefined) {
    updateData.title = data.title;
    // Generate new slug if title changes
    if (data.title !== existingEvent.title) {
      let slug = generateSlug(data.title);
      const existingSlug = await prisma.event.findFirst({ where: { slug, id: { not: eventId } } });
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
      updateData.slug = slug;
    }
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.posterPath !== undefined) updateData.posterPath = data.posterPath;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.startsAt !== undefined) updateData.startsAt = new Date(data.startsAt);
  if (data.doorsOpenAt !== undefined) updateData.doorsOpenAt = data.doorsOpenAt ? new Date(data.doorsOpenAt) : null;
  if (data.venueId !== undefined) {
    const venue = await prisma.venue.findUnique({ where: { id: data.venueId } });
    if (!venue) throw new AppError("NOT_FOUND", 404, "Venue not found.");
    updateData.venueId = data.venueId;
  }

  if (data.ticketTypes && Array.isArray(data.ticketTypes)) {
    for (const t of data.ticketTypes) {
      if (t.id) {
        const existingTier = await prisma.ticketType.findUnique({ where: { id: t.id } });
        if (existingTier) {
          const sold = existingTier.sold || 0;
          const newQty = Math.max(sold, t.quantity);
          const newAvailable = Math.max(0, newQty - sold);

          await prisma.ticketType.update({
            where: { id: t.id },
            data: {
              name: t.name,
              priceCents: t.priceCents,
              quantity: newQty,
              available: newAvailable,
              ...(t.saleStartsAt ? { saleStartsAt: new Date(t.saleStartsAt) } : {}),
              ...(t.saleEndsAt ? { saleEndsAt: new Date(t.saleEndsAt) } : {}),
              minPerOrder: t.minPerOrder || 1,
              maxPerOrder: t.maxPerOrder || 10,
            }
          });
        }
      } else {
        await prisma.ticketType.create({
          data: {
            eventId,
            name: t.name,
            priceCents: t.priceCents,
            quantity: t.quantity,
            available: t.quantity,
            sold: 0,
            saleStartsAt: t.saleStartsAt ? new Date(t.saleStartsAt) : new Date(),
            saleEndsAt: t.saleEndsAt ? new Date(t.saleEndsAt) : (updateData.startsAt || existingEvent.startsAt),
            minPerOrder: t.minPerOrder || 1,
            maxPerOrder: t.maxPerOrder || 10,
          }
        });
      }
    }
  }

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
    include: {
      ticketTypes: true,
      venue: true,
      artists: { include: { artist: true } }
    }
  });

  return updatedEvent;
}

export async function deleteEvent(userId, eventId) {
  const organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  if (!organiser || organiser.status !== "APPROVED") {
    throw new AppError("FORBIDDEN", 403, "Approved organiser account is required to delete events.");
  }

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!existingEvent || existingEvent.organiserId !== organiser.id) {
    throw new AppError("NOT_FOUND", 404, "Event not found or you do not have permission.");
  }

  // First delete dependencies like artists and ticket types to avoid foreign key constraints
  await prisma.eventArtist.deleteMany({ where: { eventId } });
  await prisma.ticketType.deleteMany({ where: { eventId } });

  await prisma.event.delete({
    where: { id: eventId }
  });

  return true;
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

export async function getOrganiserEvent(userId, eventId) {
  const organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  if (!organiser) {
    throw new AppError("FORBIDDEN", 403, "Organiser profile not found.");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ticketTypes: true,
      venue: true,
      artists: { include: { artist: true } }
    }
  });

  if (!event || event.organiserId !== organiser.id) {
    throw new AppError("NOT_FOUND", 404, "Event not found or unauthorized.");
  }

  return event;
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

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function exportEventAttendeesCsv(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, slug: true }
  });

  if (!event) {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      order: {
        eventId,
        status: "PAID"
      }
    },
    include: {
      order: {
        select: {
          orderNumber: true,
          createdAt: true,
          user: {
            select: { name: true, email: true, phone: true }
          },
          items: {
            include: {
              ticketType: { select: { id: true, name: true } }
            }
          }
        }
      },
      scanLogs: {
        orderBy: { scannedAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const headers = [
    "Ticket ID",
    "Order Number",
    "Attendee Name",
    "Attendee Email",
    "Buyer Name",
    "Buyer Email",
    "Buyer Phone",
    "Ticket Tier",
    "Ticket Status",
    "Used Gate",
    "Scanned At",
    "Purchased At"
  ];

  const rows = [headers.join(",")];

  for (const t of tickets) {
    const tierName = t.order.items[0]?.ticketType?.name || "General Admission";
    const lastScan = t.scanLogs[0];
    const row = [
      escapeCsvField(t.id),
      escapeCsvField(t.order.orderNumber),
      escapeCsvField(t.attendeeName),
      escapeCsvField(t.attendeeEmail),
      escapeCsvField(t.order.user.name),
      escapeCsvField(t.order.user.email),
      escapeCsvField(t.order.user.phone || "N/A"),
      escapeCsvField(tierName),
      escapeCsvField(t.status),
      escapeCsvField(t.usedGate || (lastScan ? lastScan.gate : "N/A")),
      escapeCsvField(t.usedAt ? t.usedAt.toISOString() : (lastScan ? lastScan.scannedAt.toISOString() : "N/A")),
      escapeCsvField(t.createdAt.toISOString())
    ];
    rows.push(row.join(","));
  }

  return {
    slug: event.slug,
    csv: rows.join("\r\n")
  };
}

export async function issueComplimentaryTickets(userId, eventId, data) {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  const tier = await prisma.ticketType.findFirst({
    where: { id: data.ticketTypeId, eventId }
  });

  if (!tier) {
    throw new AppError("NOT_FOUND", 404, "Ticket tier not found for this event.");
  }

  // Atomically decrement tier inventory and increment sold count
  const updatedTier = await prisma.ticketType.updateMany({
    where: {
      id: data.ticketTypeId,
      eventId,
      available: { gte: data.quantity }
    },
    data: {
      available: { decrement: data.quantity },
      sold: { increment: data.quantity }
    }
  });

  if (updatedTier.count === 0) {
    throw new AppError("INSUFFICIENT_INVENTORY", 400, "Insufficient ticket availability for complimentary issue.");
  }

  const orderNumber = `COMP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      eventId,
      status: "PAID",
      ticketTotalCents: 0,
      buyerFeeCents: 0,
      totalCents: 0,
      currency: "AUD",
      items: {
        create: {
          ticketTypeId: data.ticketTypeId,
          quantity: data.quantity,
          unitPriceCents: 0
        }
      }
    }
  });

  const attendeesList = Array.from({ length: data.quantity }, () => ({
    name: data.attendeeName.trim(),
    email: data.attendeeEmail.toLowerCase().trim()
  }));

  const tickets = await generateTicketsForOrder(order.id, attendeesList);

  return {
    orderNumber: order.orderNumber,
    eventId: event.id,
    eventTitle: event.title,
    recipientName: data.attendeeName,
    recipientEmail: data.attendeeEmail,
    quantity: data.quantity,
    ticketTier: tier.name,
    tickets
  };
}

export async function createVenue(data) {
  const { name, city, state = "", address = "TBD", timezone = "Australia/Sydney", capacity = 1000 } = data;
  
  // Generate a random 4 letter slug suffix
  const suffix = Math.random().toString(36).substring(2, 6);
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix}`;

  const venue = await prisma.venue.create({
    data: {
      name,
      city,
      state,
      address,
      timezone,
      capacity,
      slug
    }
  });

  return venue;
}

export async function listOrganiserOrders(userId, query = {}) {
  const organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  const { limit, cursor } = parseCursorPagination(query);
  let where = {};

  if (organiser) {
    where.event = { organiserId: organiser.id };
  } else {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== "ADMIN") {
      throw new AppError("NOT_FOUND", 404, "Organiser profile not found.");
    }
  }

  if (query.status && query.status !== "ALL") {
    where.status = query.status;
  }

  if (query.eventId) {
    where.eventId = query.eventId;
  }

  if (query.query) {
    where.OR = [
      { orderNumber: { contains: query.query.trim(), mode: "insensitive" } },
      { user: { name: { contains: query.query.trim(), mode: "insensitive" } } },
      { user: { email: { contains: query.query.trim(), mode: "insensitive" } } },
      { event: { title: { contains: query.query.trim(), mode: "insensitive" } } }
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true }
      },
      event: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          venue: { select: { name: true, city: true } }
        }
      },
      payment: {
        select: { status: true, cardBrand: true, amountCents: true }
      },
      _count: {
        select: { tickets: true }
      }
    }
  });

  return formatPaginatedResponse(orders, limit);
}

