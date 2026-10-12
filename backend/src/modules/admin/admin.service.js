import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import { parseCursorPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { invalidateBannerCache } from "../banners/banner.service.js";
import { hashPassword } from "../auth/password.service.js";
import { getPaymentProvider } from "../../providers/payment/index.js";
import { logger } from "../../lib/logger.js";
import { sendEventCancellationNotification } from "../notifications/email.service.js";



// ----------------------------------------------------
// BANNERS MANAGEMENT
// ----------------------------------------------------

export async function listAllBanners() {
  return prisma.banner.findMany({
    orderBy: [
      { displayOrder: "asc" },
      { createdAt: "desc" }
    ],
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true
        }
      }
    }
  });
}

export async function createBanner(data) {
  if (data.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: data.eventId }
    });
    if (!event) {
      throw new AppError("NOT_FOUND", 404, "Referenced event does not exist.");
    }
  }

  const banner = await prisma.banner.create({
    data: {
      title: data.title,
      imageUrl: data.imageUrl,
      targetUrl: data.targetUrl,
      eventId: data.eventId,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true
    },
    include: {
      event: {
        select: { id: true, title: true, slug: true }
      }
    }
  });

  invalidateBannerCache();
  return banner;
}

export async function updateBanner(id, data) {
  const existing = await prisma.banner.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", 404, "Banner not found.");
  }

  if (data.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: data.eventId }
    });
    if (!event) {
      throw new AppError("NOT_FOUND", 404, "Referenced event does not exist.");
    }
  }

  const updated = await prisma.banner.update({
    where: { id },
    data,
    include: {
      event: {
        select: { id: true, title: true, slug: true }
      }
    }
  });

  invalidateBannerCache();
  return updated;
}

export async function deleteBanner(id) {
  const existing = await prisma.banner.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", 404, "Banner not found.");
  }

  await prisma.banner.delete({
    where: { id }
  });

  invalidateBannerCache();
  return { id };
}

// ----------------------------------------------------
// ORGANISER APPROVALS & MODERATION
// ----------------------------------------------------

export async function listOrganisers(query) {
  const { limit, cursor } = parseCursorPagination(query);
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  const organisers = await prisma.organiser.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true
        }
      },
      _count: {
        select: { events: true }
      }
    }
  });

  return formatPaginatedResponse(organisers, limit);
}

export async function updateOrganiserStatus(organiserId, newStatus, adminUserId) {
  const organiser = await prisma.organiser.findUnique({
    where: { id: organiserId },
    include: { user: true }
  });

  if (!organiser) {
    throw new AppError("NOT_FOUND", 404, "Organiser not found.");
  }

  const beforeState = {
    status: organiser.status,
    userRole: organiser.user.role
  };

  const updatedUserRole = newStatus === "APPROVED" ? "ORGANISER" : "USER";

  const result = await prisma.$transaction(async (tx) => {
    const updatedOrganiser = await tx.organiser.update({
      where: { id: organiserId },
      data: { status: newStatus }
    });

    await tx.user.update({
      where: { id: organiser.userId },
      data: { role: updatedUserRole }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminUserId,
        action: `ORGANISER_STATUS_${newStatus}`,
        entity: "Organiser",
        entityId: organiserId,
        before: beforeState,
        after: {
          status: newStatus,
          userRole: updatedUserRole
        }
      }
    });

    return updatedOrganiser;
  });

  return result;
}

export async function createOrganiserAccount(data, adminUserId) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    throw new AppError("CONFLICT", 409, "A user with this email address already exists.");
  }

  const passwordHash = await hashPassword(data.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: data.name.trim(),
        phone: data.contactPhone ? data.contactPhone.trim() : null,
        passwordHash,
        role: "ORGANISER"
      }
    });

    const organiser = await tx.organiser.create({
      data: {
        userId: user.id,
        businessName: data.businessName.trim(),
        contactEmail: normalizedEmail,
        contactPhone: data.contactPhone ? data.contactPhone.trim() : null,
        status: "APPROVED"
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "ORGANISER_CREATED",
        entity: "Organiser",
        entityId: organiser.id,
        after: {
          organiserId: organiser.id,
          userId: user.id,
          email: user.email,
          businessName: organiser.businessName
        }
      }
    });

    return {
      id: organiser.id,
      businessName: organiser.businessName,
      contactEmail: organiser.contactEmail,
      contactPhone: organiser.contactPhone,
      status: organiser.status,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  });

  return result;
}

export async function resetOrganiserPassword(organiserId, newPassword, adminUserId) {
  const organiser = await prisma.organiser.findUnique({
    where: { id: organiserId },
    include: { user: true }
  });

  if (!organiser) {
    throw new AppError("NOT_FOUND", 404, "Organiser not found.");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: organiser.userId },
      data: { passwordHash }
    });

    // Invalidate all active sessions for this organiser
    await tx.refreshToken.deleteMany({
      where: { userId: organiser.userId }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "ORGANISER_PASSWORD_RESET",
        entity: "Organiser",
        entityId: organiserId,
        after: {
          organiserId,
          userId: organiser.userId,
          resetAt: new Date().toISOString()
        }
      }
    });
  });

  return { message: "Organiser password has been successfully reset." };
}

// ----------------------------------------------------
// GLOBAL ORDER SEARCH & MANAGEMENT
// ----------------------------------------------------

export async function listGlobalOrders(query) {
  const { limit, cursor } = parseCursorPagination(query);
  const where = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.eventId) {
    where.eventId = query.eventId;
  }

  if (query.query) {
    where.orderNumber = {
      contains: query.query.trim(),
      mode: "insensitive"
    };
  }

  if (query.email) {
    where.user = {
      email: {
        contains: query.email.trim(),
        mode: "insensitive"
      }
    };
  }

  const orders = await prisma.order.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true
        }
      },
      event: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          venue: {
            select: { name: true, city: true }
          }
        }
      },
      payment: {
        select: {
          status: true,
          cardBrand: true,
          amountCents: true
        }
      },
      _count: {
        select: { tickets: true }
      }
    }
  });

  return formatPaginatedResponse(orders, limit);
}

export async function getGlobalOrderDetails(orderId) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: orderId },
        { orderNumber: orderId }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          createdAt: true
        }
      },
      event: {
        include: {
          venue: true,
          organiser: {
            select: {
              id: true,
              businessName: true,
              contactEmail: true
            }
          }
        }
      },
      items: {
        include: {
          ticketType: true
        }
      },
      tickets: {
        include: {
          scanLogs: {
            orderBy: { scannedAt: "desc" }
          }
        }
      },
      payment: true,
      refund: true,
      ledgerEntries: true
    }
  });

  if (!order) {
    throw new AppError("NOT_FOUND", 404, "Order not found.");
  }

  return order;
}

// ----------------------------------------------------
// EVENT CANCELLATION & BULK REFUNDS
// ----------------------------------------------------

export async function cancelEventAndRefundOrders(eventId, reason, adminUserId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organiser: {
        select: {
          id: true,
          businessName: true,
          contactEmail: true
        }
      }
    }
  });

  if (!event) {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  if (event.status === "CANCELLED") {
    throw new AppError("CONFLICT", 409, "This event has already been cancelled.");
  }

  const cancelReason = reason || "Event cancelled by platform administrator";

  // 1. Update event status to CANCELLED and release all active holds
  await prisma.$transaction([
    prisma.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED" }
    }),
    prisma.inventoryHold.updateMany({
      where: {
        ticketType: { eventId },
        status: "ACTIVE"
      },
      data: { status: "RELEASED" }
    })
  ]);

  // 2. Fetch all PAID orders for this event
  const paidOrders = await prisma.order.findMany({
    where: {
      eventId,
      status: "PAID"
    },
    include: {
      payment: true,
      tickets: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  let refundedCount = 0;
  let failedCount = 0;
  let totalRefundedCents = 0;
  let totalRetainedFeesCents = 0;

  const paymentProvider = getPaymentProvider();

  // 3. Process each order refund: refund ONLY ticketTotalCents (retain gateway & buyer fees)
  for (const order of paidOrders) {
    const refundAmountCents = order.ticketTotalCents;
    const retainedFeeCents = order.buyerFeeCents || 0;
    const paymentIntentId = order.payment?.stripePaymentIntentId;

    let stripeRefundId = null;

    if (paymentIntentId) {
      try {
        const refundResult = await paymentProvider.createRefund({
          paymentIntentId,
          amountCents: refundAmountCents,
          reason: "requested_by_customer"
        });
        stripeRefundId = refundResult.id;
      } catch (err) {
        if (
          err.code === "PAYMENT_GATEWAY_NOT_CONFIGURED" ||
          err.message?.includes("PAYMENT_GATEWAY_NOT_CONFIGURED") ||
          paymentIntentId.startsWith("pi_demo_")
        ) {
          stripeRefundId = `re_demo_${Date.now()}_${order.id.slice(0, 8)}`;
        } else {
          logger.error("Failed to execute Stripe refund for order", {
            orderId: order.id,
            paymentIntentId,
            error: err.message
          });
        }
      }
    } else {
      stripeRefundId = `re_manual_${Date.now()}_${order.id.slice(0, 8)}`;
    }

    try {
      const updates = [
        prisma.order.update({
          where: { id: order.id },
          data: { status: "REFUNDED" }
        }),
        prisma.ticket.updateMany({
          where: { orderId: order.id },
          data: { status: "CANCELLED" }
        }),
        prisma.ledgerEntry.create({
          data: {
            organiserId: event.organiserId,
            eventId: event.id,
            orderId: order.id,
            type: "REFUND",
            amountCents: -refundAmountCents,
            description: `Event cancellation ticket refund for order ${order.orderNumber}`
          }
        })
      ];

      if (order.payment) {
        updates.push(
          prisma.refund.upsert({
            where: { orderId: order.id },
            create: {
              orderId: order.id,
              paymentId: order.payment.id,
              stripeRefundId,
              amountCents: refundAmountCents,
              status: stripeRefundId ? "SUCCEEDED" : "PENDING",
              reason: cancelReason
            },
            update: {
              stripeRefundId,
              amountCents: refundAmountCents,
              status: stripeRefundId ? "SUCCEEDED" : "PENDING",
              reason: cancelReason
            }
          })
        );
      }

      await prisma.$transaction(updates);

      refundedCount++;
      totalRefundedCents += refundAmountCents;
      totalRetainedFeesCents += retainedFeeCents;

      // Dispatch automated event cancellation & refund notification email
      const userEmail = order.user?.email;
      if (userEmail) {
        const refundAud = (refundAmountCents / 100).toFixed(2);
        sendEventCancellationNotification({
          recipientEmail: userEmail,
          recipientName: order.user?.name || "Valued Customer",
          orderNumber: order.orderNumber,
          eventTitle: event.title,
          cancellationReason: cancelReason,
          refundAmountAud: refundAud,
          currency: order.currency || "AUD"
        }).catch((emailErr) => {
          logger.error("Failed to send event cancellation email", {
            orderId: order.id,
            email: userEmail,
            error: emailErr.message
          });
        });
      }
    } catch (dbErr) {

      logger.error("Failed to update database for refunded order", {
        orderId: order.id,
        error: dbErr.message
      });
      failedCount++;
    }


  }

  // 4. Audit Log entry for event cancellation
  await prisma.auditLog.create({
    data: {
      actorId: adminUserId,
      action: "EVENT_CANCELLED",
      entity: "Event",
      entityId: event.id,
      after: {
        eventId: event.id,
        eventTitle: event.title,
        reason: cancelReason,
        totalPaidOrders: paidOrders.length,
        refundedOrders: refundedCount,
        failedOrders: failedCount,
        totalRefundedCents,
        totalRetainedFeesCents
      }
    }
  });

  return {
    eventId: event.id,
    eventTitle: event.title,
    status: "CANCELLED",
    reason: cancelReason,
    summary: {
      totalPaidOrders: paidOrders.length,
      refundedOrders: refundedCount,
      failedOrders: failedCount,
      totalRefundedAmountCents: totalRefundedCents,
      retainedFeeAmountCents: totalRetainedFeesCents,
      currency: "AUD"
    }
  };
}

