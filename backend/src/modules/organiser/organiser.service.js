import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { generateSlug } from "../../utils/slug.js";
import { AppError } from "../../utils/errors.js";
import { parseCursorPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { generateTicketsForOrder } from "../tickets/ticket.service.js";
import { deleteCached } from "../../lib/cache.js";
import { hashPassword } from "../auth/password.service.js";
import {
  normalizeSeatingConfig,
  capacityByTier,
  assertTiersExist
} from "./seating.js";

function assertUniqueTierNames(names) {
  const seen = new Set();
  for (const n of names) {
    const key = String(n).trim().toLowerCase();
    if (seen.has(key)) {
      throw new AppError("VALIDATION_ERROR", 400, `Two ticket categories are both called "${n}". Please give each category a unique name.`);
    }
    seen.add(key);
  }
}

/**
 * Comparable fingerprint of a seat map, with sections pointing at ticket type IDs
 * instead of names (so renaming a category is not treated as a layout change).
 */
function seatingFingerprint(seatingType, config, nameToId) {
  if (seatingType !== "RESERVED" || !config) return "GENERAL";
  const sections = (config.sections || []).map((s) => ({
    name: s.name,
    kind: s.kind || "ROWS",
    rows: s.rows || [],
    seatsPerRow: s.seatsPerRow || 0,
    capacity: s.capacity || 0,
    blocked: [...(s.blocked || [])].sort(),
    tier: nameToId(String(s.tierName || "").trim().toLowerCase()) || s.tierName
  }));
  return JSON.stringify(sections);
}

/** Sum of seats currently held (ACTIVE holds) per ticket type ID. */
async function activeHeldByTier(ticketTypeIds) {
  if (ticketTypeIds.length === 0) return new Map();
  const rows = await prisma.inventoryHold.groupBy({
    by: ["ticketTypeId"],
    where: { ticketTypeId: { in: ticketTypeIds }, status: "ACTIVE" },
    _sum: { quantity: true }
  });
  return new Map(rows.map((r) => [r.ticketTypeId, r._sum.quantity || 0]));
}

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
  let organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  if (!organiser || organiser.status !== "APPROVED") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "ADMIN") {
      // Find an existing approved organiser or auto-create an admin organiser profile
      organiser = await prisma.organiser.findFirst({ where: { status: "APPROVED" } });
      if (!organiser) {
        organiser = await prisma.organiser.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            businessName: "Platform Administration",
            contactEmail: user.email,
            status: "APPROVED"
          },
          update: {
            status: "APPROVED"
          }
        });
      }
    } else {
      throw new AppError("FORBIDDEN", 403, "Approved organiser account is required to create events.");
    }
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

  // Ensure category exists in Master list
  if (data.category) {
    const trimmedCat = data.category.trim();
    if (trimmedCat) {
      await prisma.category.upsert({
        where: { name: trimmedCat },
        update: {},
        create: { name: trimmedCat }
      });
      data.category = trimmedCat;
    }
  }

  // Seat map: validate it and derive seated/standing category quantities from it
  const seatingType = data.seatingType === "RESERVED" ? "RESERVED" : "GENERAL";
  const seatingConfig = normalizeSeatingConfig(seatingType, data.seatingConfig);
  if (seatingConfig) {
    assertUniqueTierNames(data.ticketTypes.map((t) => t.name));
    assertTiersExist(seatingConfig, data.ticketTypes.map((t) => t.name));
  }
  const mapCapacity = capacityByTier(seatingConfig);
  const quantityFor = (t) => mapCapacity.get(String(t.name).trim().toLowerCase()) ?? t.quantity;

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
      seatingType,
      seatingConfig,
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
          quantity: quantityFor(t),
          available: quantityFor(t),
          saleStartsAt: t.saleStartsAt && new Date(t.saleStartsAt) < new Date(data.startsAt) ? new Date(t.saleStartsAt) : new Date(),
          saleEndsAt: t.saleEndsAt && new Date(t.saleEndsAt) > new Date() ? new Date(t.saleEndsAt) : new Date(data.startsAt),
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
  let organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = user?.role === "ADMIN";

  if (!isAdmin && (!organiser || organiser.status !== "APPROVED")) {
    throw new AppError("FORBIDDEN", 403, "Approved organiser account is required to update events.");
  }

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!existingEvent || (!isAdmin && existingEvent.organiserId !== organiser?.id)) {
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

  // ---- Seat map changes ----
  const existingTiers = await prisma.ticketType.findMany({ where: { eventId } });
  const submittedTiers = Array.isArray(data.ticketTypes) ? data.ticketTypes : [];
  // Ticket category names after this update (renames applied, new categories added)
  const finalTierNames = existingTiers.map((t) => submittedTiers.find((x) => x.id === t.id)?.name ?? t.name);
  for (const t of submittedTiers) if (!t.id) finalTierNames.push(t.name);

  const wantsSeatingChange = data.seatingType !== undefined || data.seatingConfig !== undefined;
  let finalSeatingConfig = null;
  if (wantsSeatingChange) {
    const finalType = (data.seatingType ?? existingEvent.seatingType) === "RESERVED" ? "RESERVED" : "GENERAL";
    finalSeatingConfig = normalizeSeatingConfig(
      finalType,
      data.seatingConfig !== undefined ? data.seatingConfig : existingEvent.seatingConfig
    );
    if (finalSeatingConfig) {
      assertUniqueTierNames(finalTierNames);
      assertTiersExist(finalSeatingConfig, finalTierNames);
    }

    const totalSold = existingTiers.reduce((sum, t) => sum + (t.sold || 0), 0);
    const held = await activeHeldByTier(existingTiers.map((t) => t.id));
    const totalHeld = Array.from(held.values()).reduce((a, b) => a + b, 0);
    if (totalSold > 0 || totalHeld > 0) {
      const oldIds = new Map(existingTiers.map((t) => [t.name.trim().toLowerCase(), t.id]));
      const newIds = new Map();
      existingTiers.forEach((t, i) => newIds.set(String(finalTierNames[i]).trim().toLowerCase(), t.id));
      const before = seatingFingerprint(existingEvent.seatingType, existingEvent.seatingConfig, (n) => oldIds.get(n));
      const after = seatingFingerprint(finalType, finalSeatingConfig, (n) => newIds.get(n));
      if (before !== after) {
        throw new AppError(
          "SEATING_LOCKED",
          409,
          "The seat layout cannot be changed after tickets have been sold or reserved. You can still edit names, prices and other details."
        );
      }
    }
    updateData.seatingType = finalType;
    updateData.seatingConfig = finalSeatingConfig;
  } else if (existingEvent.seatingType === "RESERVED" && existingEvent.seatingConfig?.sections) {
    // Keep seat map category references in sync when categories are renamed
    let changed = false;
    const config = JSON.parse(JSON.stringify(existingEvent.seatingConfig));
    existingTiers.forEach((t, i) => {
      const newName = finalTierNames[i];
      if (newName === t.name) return;
      for (const sec of config.sections) {
        if (String(sec.tierName || "").trim().toLowerCase() === t.name.trim().toLowerCase()) {
          sec.tierName = newName;
          changed = true;
        }
      }
    });
    if (changed) {
      updateData.seatingConfig = config;
      if (config.version === 2) finalSeatingConfig = config;
    }
  }
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

          const eventStartsAt = updateData.startsAt || existingEvent.startsAt;
          await prisma.ticketType.update({
            where: { id: t.id },
            data: {
              name: t.name,
              priceCents: t.priceCents,
              quantity: newQty,
              available: newAvailable,
              saleStartsAt: t.saleStartsAt && eventStartsAt && new Date(t.saleStartsAt) < new Date(eventStartsAt)
                ? new Date(t.saleStartsAt)
                : new Date(),
              saleEndsAt: t.saleEndsAt && new Date(t.saleEndsAt) > new Date()
                ? new Date(t.saleEndsAt)
                : (eventStartsAt ? new Date(eventStartsAt) : undefined),
              minPerOrder: t.minPerOrder || 1,
              maxPerOrder: t.maxPerOrder || 10,
            }
          });
        }
      } else {
        const eventStartsAt = updateData.startsAt || existingEvent.startsAt;
        await prisma.ticketType.create({
          data: {
            eventId,
            name: t.name,
            priceCents: t.priceCents,
            quantity: t.quantity,
            available: t.quantity,
            sold: 0,
            saleStartsAt: t.saleStartsAt && eventStartsAt && new Date(t.saleStartsAt) < new Date(eventStartsAt)
              ? new Date(t.saleStartsAt)
              : new Date(),
            saleEndsAt: t.saleEndsAt && new Date(t.saleEndsAt) > new Date()
              ? new Date(t.saleEndsAt)
              : (eventStartsAt ? new Date(eventStartsAt) : new Date()),
            minPerOrder: t.minPerOrder || 1,
            maxPerOrder: t.maxPerOrder || 10,
          }
        });
      }
    }
  }

  // Seated / standing categories take their quantity from the seat map
  if (finalSeatingConfig) {
    const caps = capacityByTier(finalSeatingConfig);
    const tiers = await prisma.ticketType.findMany({ where: { eventId } });
    const held = await activeHeldByTier(tiers.map((t) => t.id));
    for (const t of tiers) {
      const cap = caps.get(t.name.trim().toLowerCase());
      if (cap === undefined) continue;
      const sold = t.sold || 0;
      const quantity = Math.max(cap, sold);
      const available = Math.max(0, quantity - sold - (held.get(t.id) || 0));
      if (quantity !== t.quantity || available !== t.available) {
        await prisma.ticketType.update({ where: { id: t.id }, data: { quantity, available } });
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

export async function deleteEvent(userId, eventId, userRole) {
  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!existingEvent) {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  // 1. Role / Ownership Verification
  let isAdmin = userRole === "ADMIN";
  if (!isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    if (user?.role === "ADMIN") {
      isAdmin = true;
    }
  }

  if (!isAdmin) {
    const organiser = await prisma.organiser.findUnique({
      where: { userId }
    });

    if (!organiser || organiser.status !== "APPROVED") {
      throw new AppError("FORBIDDEN", 403, "Approved organiser account is required to delete events.");
    }

    if (existingEvent.organiserId !== organiser.id) {
      throw new AppError("FORBIDDEN", 403, "You do not own this event.");
    }
  }

  // 2. Safe Dependency Cleanup before deleting Event
  // Unlink Banners referencing this event
  await prisma.banner.updateMany({
    where: { eventId },
    data: { eventId: null }
  });

  // Delete Artist associations
  await prisma.eventArtist.deleteMany({
    where: { eventId }
  });

  // Find ticket types for this event
  const ticketTypes = await prisma.ticketType.findMany({
    where: { eventId },
    select: { id: true }
  });
  const ticketTypeIds = ticketTypes.map((t) => t.id);

  if (ticketTypeIds.length > 0) {
    // Delete inventory holds on these tickets
    await prisma.inventoryHold.deleteMany({
      where: { ticketTypeId: { in: ticketTypeIds } }
    });
  }

  // Clean up any orders/tickets on this event
  const orders = await prisma.order.findMany({
    where: { eventId },
    select: { id: true }
  });
  const orderIds = orders.map((o) => o.id);

  if (orderIds.length > 0) {
    await prisma.ticket.deleteMany({
      where: { orderId: { in: orderIds } }
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } }
    });
    await prisma.ledgerEntry.deleteMany({
      where: { orderId: { in: orderIds } }
    });
    await prisma.payment.deleteMany({
      where: { orderId: { in: orderIds } }
    });
    await prisma.order.deleteMany({
      where: { id: { in: orderIds } }
    });
  }

  // Delete any direct ledger entries referencing the event
  await prisma.ledgerEntry.deleteMany({
    where: { eventId }
  });

  // Delete ticket types
  await prisma.ticketType.deleteMany({
    where: { eventId }
  });

  // Finally delete the event
  await prisma.event.delete({
    where: { id: eventId }
  });

  return true;
}

export async function listOrganiserEvents(userId, query = {}) {
  const organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = user?.role === "ADMIN";

  if (!organiser && !isAdmin) {
    throw new AppError("FORBIDDEN", 403, "Organiser profile not found.");
  }

  const { limit, cursor } = parseCursorPagination(query);

  const where = organiser ? { organiserId: organiser.id } : {};

  const events = await prisma.event.findMany({
    where,
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = user?.role === "ADMIN";

  if (!organiser && !isAdmin) {
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

  const [paidSales, validTicketsCount] = await Promise.all([
    prisma.order.aggregate({
      where: { eventId, status: "PAID" },
      _sum: { ticketTotalCents: true }
    }),
    prisma.ticket.count({
      where: {
        order: { eventId, status: "PAID" },
        status: { not: "CANCELLED" }
      }
    })
  ]);

  let totalCapacity = 0;
  for (const tier of event.ticketTypes) {
    totalCapacity += tier.quantity;
  }

  return {
    eventId: event.id,
    eventTitle: event.title,
    eventStatus: event.status,
    totalCapacity,
    totalSold: validTicketsCount,
    totalRevenueCents: paidSales._sum.ticketTotalCents || 0,
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

  deleteCached("catalog:home");
  return venue;
}

export async function updateVenue(venueId, data) {
  const { name, city, state, address, timezone, capacity } = data;
  const venue = await prisma.venue.update({
    where: { id: venueId },
    data: {
      ...(name && { name }),
      ...(city && { city }),
      ...(state !== undefined && { state }),
      ...(address && { address }),
      ...(timezone && { timezone }),
      ...(capacity !== undefined && { capacity: Number(capacity) })
    }
  });
  deleteCached("catalog:home");
  return venue;
}

export async function deleteVenue(venueId) {
  const eventCount = await prisma.event.count({
    where: { venueId }
  });
  if (eventCount > 0) {
    throw new AppError("CANNOT_DELETE_VENUE", 400, `Cannot delete venue because ${eventCount} event(s) are associated with it.`);
  }
  await prisma.venue.delete({
    where: { id: venueId }
  });
  deleteCached("catalog:home");
  return { success: true, message: "Venue deleted successfully." };
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

// ----------------------------------------------------
// STAFF MANAGEMENT (Organiser Isolated)
// ----------------------------------------------------

async function resolveOrganiser(userId, userRole) {
  let organiser = await prisma.organiser.findUnique({
    where: { userId }
  });
  if (!organiser && userRole === "ADMIN") {
    organiser = await prisma.organiser.findFirst({ where: { status: "APPROVED" } });
  }
  if (!organiser) {
    throw new AppError("FORBIDDEN", 403, "Organiser account not found.");
  }
  return organiser;
}

export async function listOrganiserStaff(userId, userRole) {
  const organiser = await resolveOrganiser(userId, userRole);
  const staffList = await prisma.staff.findMany({
    where: { organiserId: organiser.id },
    include: {
      event: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return staffList.map(s => ({
    id: s.id,
    staffId: s.staffId,
    name: s.name,
    assignedGate: s.assignedGate,
    assignedEvent: s.event ? { id: s.event.id, title: s.event.title } : null,
    isActive: s.isActive,
    createdAt: s.createdAt
  }));
}

export async function createOrganiserStaff(userId, userRole, data) {
  const organiser = await resolveOrganiser(userId, userRole);

  const cleanStaffId = (data.staffId || "").trim();
  if (!cleanStaffId) {
    throw new AppError("VALIDATION_ERROR", 400, "Staff ID is required.");
  }
  if (!data.password || data.password.length < 6) {
    throw new AppError("VALIDATION_ERROR", 400, "Password must be at least 6 characters.");
  }

  // Check unique Staff ID
  const existing = await prisma.staff.findUnique({
    where: { staffId: cleanStaffId }
  });
  if (existing) {
    throw new AppError("CONFLICT", 409, `Staff ID '${cleanStaffId}' is already taken. Please choose another.`);
  }

  // If eventId provided, verify event ownership by this organiser
  if (data.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: data.eventId, organiserId: organiser.id }
    });
    if (!event) {
      throw new AppError("FORBIDDEN", 403, "Assigned event does not belong to your organiser profile.");
    }
  }

  const passwordHash = await hashPassword(data.password);

  const created = await prisma.staff.create({
    data: {
      staffId: cleanStaffId,
      name: data.name || cleanStaffId,
      passwordHash,
      organiserId: organiser.id,
      assignedGate: data.assignedGate || "Main Gate",
      eventId: data.eventId || null,
      isActive: true
    },
    include: {
      event: { select: { id: true, title: true } }
    }
  });

  return {
    id: created.id,
    staffId: created.staffId,
    name: created.name,
    assignedGate: created.assignedGate,
    assignedEvent: created.event ? { id: created.event.id, title: created.event.title } : null,
    isActive: created.isActive,
    createdAt: created.createdAt
  };
}

export async function updateStaffPassword(userId, userRole, id, newPassword) {
  const organiser = await resolveOrganiser(userId, userRole);

  if (!newPassword || newPassword.length < 6) {
    throw new AppError("VALIDATION_ERROR", 400, "Password must be at least 6 characters.");
  }

  // Strict isolation check: must match id AND organiserId
  const staff = await prisma.staff.findFirst({
    where: { id, organiserId: organiser.id }
  });
  if (!staff) {
    throw new AppError("NOT_FOUND", 404, "Staff member not found or access denied.");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.staff.update({
    where: { id: staff.id },
    data: { passwordHash }
  });

  return { success: true, message: "Staff password successfully updated." };
}

export async function toggleStaffStatus(userId, userRole, id, isActive) {
  const organiser = await resolveOrganiser(userId, userRole);

  // Strict isolation check
  const staff = await prisma.staff.findFirst({
    where: { id, organiserId: organiser.id }
  });
  if (!staff) {
    throw new AppError("NOT_FOUND", 404, "Staff member not found or access denied.");
  }

  const updated = await prisma.staff.update({
    where: { id: staff.id },
    data: { isActive: Boolean(isActive) }
  });

  return {
    id: updated.id,
    staffId: updated.staffId,
    isActive: updated.isActive,
    message: updated.isActive ? "Staff access enabled." : "Staff access revoked."
  };
}

export async function deleteOrganiserStaff(userId, userRole, id) {
  const organiser = await resolveOrganiser(userId, userRole);

  // Strict isolation check
  const staff = await prisma.staff.findFirst({
    where: { id, organiserId: organiser.id }
  });
  if (!staff) {
    throw new AppError("NOT_FOUND", 404, "Staff member not found or access denied.");
  }

  await prisma.staff.delete({
    where: { id: staff.id }
  });

  return { success: true, message: "Staff member deleted." };
}



export async function getOrganiserStats(userId) {
  const organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = user?.role === "ADMIN";

  if (!organiser && !isAdmin) {
    throw new AppError("FORBIDDEN", 403, "Organiser profile not found.");
  }

  const orderWhere = organiser
    ? { event: { organiserId: organiser.id }, status: "PAID" }
    : { status: "PAID" };

  const eventWhere = organiser
    ? { organiserId: organiser.id, status: "PUBLISHED" }
    : { status: "PUBLISHED" };

  const [salesAgg, ticketsCount, activeEventsCount] = await Promise.all([
    prisma.order.aggregate({
      where: orderWhere,
      _sum: {
        ticketTotalCents: true,
        totalCents: true
      },
      _count: { id: true }
    }),
    prisma.ticket.count({
      where: {
        order: orderWhere,
        status: { not: "CANCELLED" }
      }
    }),
    prisma.event.count({
      where: eventWhere
    })
  ]);

  return {
    totalSalesCents: salesAgg._sum.ticketTotalCents || 0,
    totalGrossCents: salesAgg._sum.totalCents || 0,
    totalTicketsSold: ticketsCount || 0,
    paidOrdersCount: salesAgg._count.id || 0,
    activeEventsCount: activeEventsCount || 0
  };
}
