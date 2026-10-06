import { prisma } from "../../lib/prisma.js";
import { verifySignedQrToken } from "../tickets/qr.service.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../utils/errors.js";

/**
 * Validates organiser authorization for an event.
 */
async function verifyOrganiserEventAccess(userId, userRole, eventId) {
  if (userRole === "ADMIN") return true;

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
export async function processOnlineScan({ qrToken, gate, deviceId, userId, userRole }) {
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
  await verifyOrganiserEventAccess(userId, userRole, ticket.order.event.id);

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
