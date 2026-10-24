import { prisma } from "../../lib/prisma.js";
import { verifySignedQrToken } from "../tickets/qr.service.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../utils/errors.js";

/**
 * Validates organiser authorization for an event.
 */
async function verifyOrganiserEventAccess(userId, userRole, eventId, staffOrganiserId, staffEventId) {
  if (userRole === "ADMIN") return true;

  if (userRole === "STAFF") {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organiserId: true }
    });
    if (!event || event.organiserId !== staffOrganiserId) {
      throw new AppError("FORBIDDEN", 403, "You do not have permission to scan tickets for this organiser's event.");
    }
    if (staffEventId && eventId !== staffEventId) {
      throw new AppError("FORBIDDEN", 403, "This ticket is for a different event than your assigned gate.");
    }
    return true;
  }

  const organiser = await prisma.organiser.findUnique({
    where: { userId }
  });

  if (!organiser) {
    throw new AppError("FORBIDDEN", 403, "Organiser profile not found for this user account.");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organiserId: true }
  });

  if (!event || event.organiserId !== organiser.id) {
    throw new AppError("FORBIDDEN", 403, "You do not have permission to scan tickets for this event.");
  }

  return true;
}

/**
 * Online turnstile scan execution with atomic CAS status update and scan telemetry.
 */
export async function processOnlineScan({ qrToken, gate, deviceId, userId, userRole, staffId, staffOrganiserId, staffEventId }) {
  const now = new Date();

  // 1. Offline cryptographic verification (Spot fakes instantly)
  const cryptoResult = verifySignedQrToken(qrToken);
  if (!cryptoResult.valid) {
    logger.warn("Offline cryptographic check rejected QR barcode", {
      gate,
      deviceId,
      error: cryptoResult.error
    });
    return {
      result: "INVALID",
      granted: false,
      message: "Cryptographic signature invalid or forged barcode."
    };
  }

  // 2. Query ticket from database by hash
  const ticket = await prisma.ticket.findUnique({
    where: { qrTokenHash: cryptoResult.tokenHash },
    include: {
      order: {
        include: {
          event: {
            select: { id: true, title: true, organiserId: true, status: true }
          },
          items: {
            include: { ticketType: { select: { name: true } } }
          }
        }
      }
    }
  });

  if (!ticket) {
    return {
      result: "INVALID",
      granted: false,
      message: "Ticket not found in platform database."
    };
  }

  // Check event access
  await verifyOrganiserEventAccess(userId, userRole, ticket.order.event.id, staffOrganiserId, staffEventId);

  const event = ticket.order.event;
  if (event.status === "CANCELLED") {
    await prisma.scanLog.create({
      data: {
        ticketId: ticket.id,
        gate,
        deviceId,
        result: "CANCELLED",
        scannedAt: now
      }
    });
    return {
      result: "CANCELLED",
      granted: false,
      message: "This event has been cancelled. Entry prohibited."
    };
  }

  // 3. Check already used status
  if (ticket.status === "USED") {
    await prisma.scanLog.create({
      data: {
        ticketId: ticket.id,
        gate,
        deviceId,
        result: "ALREADY_USED",
        scannedAt: now
      }
    });

    const usedFormatted = ticket.usedAt
      ? new Intl.DateTimeFormat("en-AU", { timeStyle: "medium" }).format(ticket.usedAt)
      : "earlier";

    return {
      result: "ALREADY_USED",
      granted: false,
      ticketId: ticket.id,
      attendeeName: ticket.attendeeName,
      previouslyUsedAt: ticket.usedAt,
      previouslyUsedGate: ticket.usedGate,
      message: `Already scanned at ${ticket.usedGate || "another gate"} at ${usedFormatted}.`
    };
  }

  if (ticket.status !== "VALID") {
    return {
      result: "INVALID",
      granted: false,
      message: `Ticket status is ${ticket.status}. Entry prohibited.`
    };
  }

  // 4. Atomic Compare-And-Swap status transition (VALID -> USED)
  const updateResult = await prisma.ticket.updateMany({
    where: {
      id: ticket.id,
      status: "VALID"
    },
    data: {
      status: "USED",
      usedAt: now,
      usedGate: gate
    }
  });

  if (updateResult.count === 1) {
    await prisma.scanLog.create({
      data: {
        ticketId: ticket.id,
        gate,
        deviceId,
        staffId: staffId || null,
        result: "VALID",
        scannedAt: now
      }
    });

    const tierName = ticket.order.items[0]?.ticketType?.name || "General Admission";

    return {
      result: "VALID",
      granted: true,
      ticketId: ticket.id,
      attendeeName: ticket.attendeeName,
      ticketTypeName: tierName,
      eventTitle: event.title,
      gate,
      message: "Entry granted. Welcome!"
    };
  }

  // Concurrent collision (another scanner updated it at the exact same millisecond)
  await prisma.scanLog.create({
    data: {
      ticketId: ticket.id,
      gate,
      deviceId,
      result: "ALREADY_USED",
      scannedAt: now
    }
  });

  return {
    result: "ALREADY_USED",
    granted: false,
    message: "Ticket was scanned simultaneously at another gate."
  };
}

/**
 * Exports encrypted offline manifest dataset for scanners before doors open.
 */
export async function exportEventManifest(eventId, userId, userRole) {
  await verifyOrganiserEventAccess(userId, userRole, eventId);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, startsAt: true }
  });

  if (!event) {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  const validTickets = await prisma.ticket.findMany({
    where: {
      order: { eventId },
      status: "VALID"
    },
    select: {
      id: true,
      qrTokenHash: true,
      attendeeName: true,
      status: true
    }
  });

  return {
    eventId: event.id,
    eventTitle: event.title,
    generatedAt: new Date().toISOString(),
    totalValidTickets: validTickets.length,
    manifest: validTickets
  };
}

/**
 * Resolves offline scans via first-scan-wins conflict resolution.
 */
export async function syncOfflineScans({ eventId, scans, userId, userRole }) {
  await verifyOrganiserEventAccess(userId, userRole, eventId);

  // Sort chronologically ascending so earlier scans win
  const sortedScans = [...scans].sort((a, b) => new Date(a.scannedAt) - new Date(b.scannedAt));

  let acceptedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const item of sortedScans) {
    const cryptoResult = verifySignedQrToken(item.qrToken);
    if (!cryptoResult.valid) {
      invalidCount++;
      continue;
    }

    const ticket = await prisma.ticket.findUnique({
      where: { qrTokenHash: cryptoResult.tokenHash }
    });

    if (!ticket) {
      invalidCount++;
      continue;
    }

    const scanTime = new Date(item.scannedAt);

    if (ticket.status === "VALID") {
      const updateResult = await prisma.ticket.updateMany({
        where: { id: ticket.id, status: "VALID" },
        data: {
          status: "USED",
          usedAt: scanTime,
          usedGate: item.gate
        }
      });

      if (updateResult.count === 1) {
        await prisma.scanLog.create({
          data: {
            ticketId: ticket.id,
            gate: item.gate,
            deviceId: item.deviceId,
            result: "VALID",
            scannedAt: scanTime
          }
        });
        acceptedCount++;
        continue;
      }
    }

    // Already used
    await prisma.scanLog.create({
      data: {
        ticketId: ticket.id,
        gate: item.gate,
        deviceId: item.deviceId,
        result: "ALREADY_USED",
        scannedAt: scanTime
      }
    });
    duplicateCount++;
  }

  return {
    totalScansSubmitted: scans.length,
    accepted: acceptedCount,
    duplicates: duplicateCount,
    invalid: invalidCount
  };
}

/**
 * Returns real-time gate entry stats for promoter dashboards.
 */
export async function getLiveScanStats(eventId, userId, userRole) {
  await verifyOrganiserEventAccess(userId, userRole, eventId);

  const [totalTickets, usedTickets, scanLogs] = await Promise.all([
    prisma.ticket.count({
      where: { order: { eventId }, status: { in: ["VALID", "USED"] } }
    }),
    prisma.ticket.count({
      where: { order: { eventId }, status: "USED" }
    }),
    prisma.scanLog.groupBy({
      by: ["gate", "result"],
      where: { ticket: { order: { eventId } } },
      _count: { id: true }
    })
  ]);

  const gateBreakdown = {};
  for (const log of scanLogs) {
    if (!gateBreakdown[log.gate]) {
      gateBreakdown[log.gate] = { valid: 0, duplicate: 0 };
    }
    if (log.result === "VALID") gateBreakdown[log.gate].valid += log._count.id;
    if (log.result === "ALREADY_USED") gateBreakdown[log.gate].duplicate += log._count.id;
  }

  const checkInRatePercent = totalTickets > 0 ? ((usedTickets / totalTickets) * 100).toFixed(1) : "0.0";

  return {
    eventId,
    totalIssuedTickets: totalTickets,
    checkedInCount: usedTickets,
    remainingCount: totalTickets - usedTickets,
    checkInRatePercent: `${checkInRatePercent}%`,
    gateBreakdown
  };
}

export async function searchEventAttendees({ eventId, query, userId, userRole, staffOrganiserId }) {
  await verifyOrganiserEventAccess(userId, userRole, eventId, staffOrganiserId);
  const clean = (query || "").trim();
  if (!clean || clean.length < 2) return [];

  const tickets = await prisma.ticket.findMany({
    where: {
      order: {
        eventId,
        status: "PAID"
      },
      OR: [
        { attendeeName: { contains: clean, mode: "insensitive" } },
        { order: { user: { name: { contains: clean, mode: "insensitive" } } } },
        { order: { user: { email: { contains: clean, mode: "insensitive" } } } }
      ]
    },
    take: 25,
    include: {
      order: {
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { ticketType: { select: { name: true } } } }
        }
      }
    }
  });

  return tickets.map(t => ({
    id: t.id,
    attendeeName: t.attendeeName || t.order.user.name,
    orderId: t.orderId,
    ticketTypeName: t.order.items[0]?.ticketType?.name || "General Admission",
    status: t.status,
    usedAt: t.usedAt,
    usedGate: t.usedGate,
    seat: t.seat
  }));
}

export async function manualCheckInTicket({ ticketId, gate, userId, userRole, staffOrganiserId, staffId }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      order: {
        include: {
          event: { select: { id: true, title: true, organiserId: true, status: true } },
          items: { include: { ticketType: { select: { name: true } } } }
        }
      }
    }
  });

  if (!ticket) {
    throw new AppError("NOT_FOUND", 404, "Ticket not found.");
  }

  await verifyOrganiserEventAccess(userId, userRole, ticket.order.event.id, staffOrganiserId);

  if (ticket.status === "USED") {
    return {
      success: false,
      alreadyUsed: true,
      message: `Already checked in at ${ticket.usedGate || "gate"} on ${ticket.usedAt?.toLocaleTimeString()}`
    };
  }

  const now = new Date();
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "USED",
      usedAt: now,
      usedGate: gate || "Manual Desk"
    }
  });

  await prisma.scanLog.create({
    data: {
      ticketId: ticket.id,
      gate: gate || "Manual Desk",
      deviceId: "manual-checkin",
      staffId: staffId || null,
      result: "VALID",
      scannedAt: now
    }
  });

  return {
    success: true,
    attendeeName: ticket.attendeeName,
    ticketTypeName: ticket.order.items[0]?.ticketType?.name || "General Admission",
    message: "Manually checked in successfully."
  };
}

export async function getStaffAccessibleEvents(userId, userRole, staffOrganiserId, staffEventId) {
  if (userRole === "STAFF") {
    const where = {
      organiserId: staffOrganiserId,
      status: "PUBLISHED"
    };
    if (staffEventId) {
      where.id = staffEventId;
    }
    return prisma.event.findMany({
      where,
      select: {
        id: true,
        title: true,
        startsAt: true,
        venue: { select: { name: true, city: true } }
      },
      orderBy: { startsAt: "asc" }
    });
  }

  if (userRole === "ORGANISER") {
    const organiser = await prisma.organiser.findUnique({ where: { userId } });
    if (!organiser) return [];
    return prisma.event.findMany({
      where: { organiserId: organiser.id, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        venue: { select: { name: true, city: true } }
      },
      orderBy: { startsAt: "asc" }
    });
  }

  // Admin
  return prisma.event.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      venue: { select: { name: true, city: true } }
    },
    orderBy: { startsAt: "asc" }
  });
}

