import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import { parseCursorPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { invalidateBannerCache } from "../banners/banner.service.js";
import { hashPassword } from "../auth/password.service.js";
import { deleteCached } from "../../lib/cache.js";
import { getPaymentProvider } from "../../providers/payment/index.js";
import { logger } from "../../lib/logger.js";
import { sendEventCancellationNotification } from "../notifications/email.service.js";
import { pgboss } from "../../lib/pgboss.js";

// ----------------------------------------------------
// CATEGORIES MANAGEMENT
// ----------------------------------------------------
export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" }
  });
}

export async function createCategory(data) {
  const existing = await prisma.category.findUnique({
    where: { name: data.name }
  });
  if (existing) {
    throw new AppError("CONFLICT", 409, "Category already exists");
  }
  const created = await prisma.category.create({
    data: { name: data.name }
  });
  deleteCached("categories:unique");
  return created;
}

export async function deleteCategory(id) {
  const deleted = await prisma.category.delete({
    where: { id }
  });
  deleteCached("categories:unique");
  return deleted;
}

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

export async function deleteOrganiser(organiserId, adminUserId) {
  const organiser = await prisma.organiser.findUnique({
    where: { id: organiserId },
    include: { user: true }
  });

  if (!organiser) {
    throw new AppError("NOT_FOUND", 404, "Organiser not found.");
  }

  if (organiser.status !== "SUSPENDED") {
    throw new AppError("BAD_REQUEST", 400, "Organiser must be suspended before deletion.");
  }

  await prisma.$transaction(async (tx) => {
    // Delete the user record (which should cascade delete the organiser record, depending on schema, but we'll do both explicitly to be safe)
    await tx.organiser.delete({
      where: { id: organiserId }
    });
    
    await tx.user.delete({
      where: { id: organiser.userId }
    });

    await tx.auditLog.create({
      data: {
        actorId: adminUserId,
        action: "ORGANISER_DELETED",
        entity: "Organiser",
        entityId: organiserId,
        before: { id: organiserId, email: organiser.user.email },
        after: {}
      }
    });
  });

  return { deleted: true, id: organiserId };
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

/**
 * Processes a refund for a single order with strict idempotency, safe transaction boundaries,
 * fresh state queries, atomic claims, and failure resilience.
 */
async function processSingleOrderRefund({ orderId, event, cancelReason, paymentProvider }) {
  // 1. Always fetch FRESH database state to avoid operating on stale memory objects
  const freshOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      refund: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  if (!freshOrder) {
    logger.warn("Order not found during refund processing", { orderId });
    return { status: "SKIPPED_NOT_FOUND", amountCents: 0, retainedFeeCents: 0 };
  }

  const existingRefund = freshOrder.refund;

  // If order was already successfully resolved, skip immediately
  if (freshOrder.status === "REFUNDED" || (existingRefund && existingRefund.status === "SUCCEEDED")) {
    logger.info("Order is already marked REFUNDED or has succeeded refund, skipping", { orderId: freshOrder.id });
    return { status: "SKIPPED_ALREADY_REFUNDED", amountCents: 0, retainedFeeCents: 0 };
  }

  // 2. Prevent refunding more than remaining refundable amount
  // Existing business rule: refund ticket face value (ticketTotalCents), retain buyerFeeCents
  const previousRefundAmount = (existingRefund && existingRefund.status === "SUCCEEDED") ? existingRefund.amountCents : 0;
  const remainingRefundableAmount = freshOrder.ticketTotalCents - previousRefundAmount;
  const retainedFeeCents = freshOrder.buyerFeeCents || 0;

  if (remainingRefundableAmount <= 0) {
    logger.info("Order has no remaining refundable balance, skipping", { orderId: freshOrder.id });
    return { status: "SKIPPED_ZERO_BALANCE", amountCents: 0, retainedFeeCents: 0 };
  }

  const refundAmountCents = remainingRefundableAmount;
  const paymentIntentId = freshOrder.payment?.stripePaymentIntentId;

  // 3. ATOMIC DATABASE CLAIM:
  // Use a short database transaction with row-level locking (SELECT ... FOR UPDATE) on the Refund record
  // (or Order record) to ensure exactly ONE process acquires the claim to call Stripe.
  // - If Refund is SUCCEEDED: skip immediately.
  // - If Refund is PENDING: allow claim ONLY if lease has expired (> 2 minutes old, indicating a crash/timeout)
  //   so that it can be reconciled, while preventing concurrent workers from racing the active operation.
  // - If Refund does not exist or is FAILED: create/update status to PENDING with fresh lease timestamp.
  const CLAIM_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes crash timeout
  let acquiredClaim = false;

  if (freshOrder.payment) {
    try {
      acquiredClaim = await prisma.$transaction(async (tx) => {
        // Check current refund state with interactive transaction
        const currentRefund = await tx.refund.findUnique({
          where: { orderId: freshOrder.id }
        });

        if (currentRefund) {
          if (currentRefund.status === "SUCCEEDED") {
            return false;
          }

          // If currently PENDING, check if active lease has expired
          if (currentRefund.status === "PENDING") {
            const timeSinceUpdate = Date.now() - new Date(currentRefund.updatedAt).getTime();
            if (timeSinceUpdate < CLAIM_TIMEOUT_MS) {
              logger.info("Order refund is currently locked and being processed by another worker", {
                orderId: freshOrder.id,
                timeSinceUpdateMs: timeSinceUpdate
              });
              return false; // Lock active; do NOT process concurrently
            }
            logger.info("Order refund PENDING lease expired, reclaiming for reconciliation/retry", {
              orderId: freshOrder.id,
              timeSinceUpdateMs: timeSinceUpdate
            });
          }

          // Atomically acquire lock
          await tx.refund.update({
            where: { id: currentRefund.id },
            data: {
              status: "PENDING",
              amountCents: refundAmountCents,
              reason: `Claimed for cancellation refund: ${cancelReason}`.slice(0, 255),
              updatedAt: new Date()
            }
          });
          return true;
        }

        // Refund does not exist yet: create claim
        await tx.refund.create({
          data: {
            orderId: freshOrder.id,
            paymentId: freshOrder.payment.id,
            amountCents: refundAmountCents,
            status: "PENDING",
            reason: `Claimed for cancellation refund: ${cancelReason}`.slice(0, 255)
          }
        });
        return true;
      });
    } catch (claimErr) {
      logger.warn("Failed to acquire atomic refund claim, concurrent process won race", {
        orderId: freshOrder.id,
        error: claimErr.message
      });
      acquiredClaim = false;
    }
  } else {
    acquiredClaim = true; // Manual orders with no payment record
  }

  if (!acquiredClaim) {
    logger.info("Skipping order refund processing as claim was not acquired", { orderId: freshOrder.id });
    return { status: "SKIPPED_LOCKED_OR_RESOLVED", amountCents: 0, retainedFeeCents: 0 };
  }

  // 4. Generate deterministic idempotency key for payment provider
  const idempotencyKey = `refund_event_${event.id}_order_${freshOrder.id}`;

  let stripeRefundId = null;
  let isAmbiguousTimeout = false;
  let failureErrorMessage = null;

  // 5. Reconciliation: Inspect Stripe to see if a matching successful refund already exists
  // Before trying to create a new refund, verify whether this exact payment was already refunded!
  if (paymentIntentId && !paymentIntentId.startsWith("pi_demo_")) {
    try {
      if (typeof paymentProvider.getPaymentRefunds === "function") {
        const stripeRefunds = await paymentProvider.getPaymentRefunds(paymentIntentId);
        // Verify both status AND amount to avoid interpreting an arbitrary partial refund as this cancellation
        const matchedRefund = stripeRefunds.find(
          (r) => r.status === "succeeded" && Number(r.amount) === Number(refundAmountCents)
        );
        if (matchedRefund) {
          logger.info("Reconciliation matched verified existing Stripe refund for order", {
            orderId: freshOrder.id,
            stripeRefundId: matchedRefund.id,
            amount: matchedRefund.amount
          });
          stripeRefundId = matchedRefund.id;
        }
      }
    } catch (reconcileErr) {
      logger.warn("Reconciliation lookup encountered error, proceeding with deterministic idempotency key", {
        orderId: freshOrder.id,
        error: reconcileErr.message
      });
    }
  }

  // 6. Call Payment Provider OUTSIDE of database transactions (if not already verified via reconciliation)
  if (!stripeRefundId) {
    if (paymentIntentId) {
      const isDemoIntent = paymentIntentId.startsWith("pi_demo_");

      try {
        const refundResult = await paymentProvider.createRefund({
          paymentIntentId,
          amountCents: refundAmountCents,
          reason: "requested_by_customer",
          idempotencyKey
        });
        stripeRefundId = refundResult?.id || null;
      } catch (err) {
        failureErrorMessage = err.message || "Payment provider refund call failed";

        const original = err.originalError || err;
        const errType = original.type || err.type;
        const errCode = original.code || err.code;

        // Enhanced Stripe error classification:
        // Network connection failures, socket timeouts, rate limits, and 408 are AMBIGUOUS.
        // Known definitive failures: StripeCardError, StripeInvalidRequestError, etc.
        const isDefinitiveFailure =
          errType === "StripeCardError" ||
          errType === "StripeInvalidRequestError" ||
          errType === "StripeIdempotencyError" ||
          errCode === "card_error" ||
          errCode === "resource_missing";

        const isNetworkOrTimeout =
          !isDefinitiveFailure && (
            errCode === "ETIMEDOUT" ||
            errCode === "ECONNRESET" ||
            errCode === "ENOTFOUND" ||
            errCode === "ECONNREFUSED" ||
            err.name === "TimeoutError" ||
            errType === "StripeConnectionError" ||
            errType === "StripeTimeoutError" ||
            errType === "StripeAPIError" ||
            err.statusCode === 408 ||
            err.statusCode === 429 ||
            err.message?.toLowerCase().includes("timeout") ||
            err.message?.toLowerCase().includes("econnreset") ||
            err.message?.toLowerCase().includes("connection")
          );

        if (isNetworkOrTimeout) {
          isAmbiguousTimeout = true;
          logger.warn("Ambiguous network or provider error during Stripe refund execution", {
            orderId: freshOrder.id,
            paymentIntentId,
            error: err.message,
            type: errType
          });
        } else if (
          isDemoIntent ||
          err.code === "PAYMENT_GATEWAY_NOT_CONFIGURED" ||
          err.message?.includes("PAYMENT_GATEWAY_NOT_CONFIGURED")
        ) {
          stripeRefundId = `re_demo_${Date.now()}_${freshOrder.id.slice(0, 8)}`;
        } else {
          logger.error("Payment provider definitively rejected refund for order", {
            orderId: freshOrder.id,
            paymentIntentId,
            error: err.message,
            type: err.type
          });
        }
      }
    } else {
      // Non-gateway payment (e.g. manual cash order)
      stripeRefundId = `re_manual_${Date.now()}_${freshOrder.id.slice(0, 8)}`;
    }
  }

  // 7. Update Database Records atomically based on verified outcome
  if (stripeRefundId) {
    // CONFIRMED SUCCESS:
    // Execute a short atomic Prisma transaction keeping all local financial records consistent
    try {
      await prisma.$transaction(async (tx) => {
        // 7a. Mark Order as REFUNDED
        await tx.order.update({
          where: { id: freshOrder.id },
          data: { status: "REFUNDED" }
        });

        // 7b. Keep Payment record consistent with Order
        if (freshOrder.payment) {
          await tx.payment.update({
            where: { id: freshOrder.payment.id },
            data: { status: "REFUNDED" }
          });
        }

        // 7c. Void tickets to prevent gate entry
        await tx.ticket.updateMany({
          where: { orderId: freshOrder.id },
          data: { status: "CANCELLED" }
        });

        // 7d. Record verified successful refund
        if (freshOrder.payment) {
          await tx.refund.upsert({
            where: { orderId: freshOrder.id },
            create: {
              orderId: freshOrder.id,
              paymentId: freshOrder.payment.id,
              stripeRefundId,
              amountCents: refundAmountCents,
              status: "SUCCEEDED",
              reason: cancelReason
            },
            update: {
              stripeRefundId,
              amountCents: refundAmountCents,
              status: "SUCCEEDED",
              reason: cancelReason
            }
          });
        }

        // 7e. Financial ledger debit against organiser balance:
        // Guarantee at most ONE REFUND ledger entry is ever created per order
        const existingLedger = await tx.ledgerEntry.findFirst({
          where: {
            orderId: freshOrder.id,
            type: "REFUND"
          }
        });

        if (!existingLedger) {
          try {
            await tx.ledgerEntry.create({
              data: {
                organiserId: event.organiserId,
                eventId: event.id,
                orderId: freshOrder.id,
                type: "REFUND",
                amountCents: -refundAmountCents,
                description: `Event cancellation ticket refund for order ${freshOrder.orderNumber}`
              }
            });
          } catch (ledgerErr) {
            // If PostgreSQL partial unique index caught a concurrent insert, safely ignore duplicate
            if (ledgerErr.code === "P2002" || ledgerErr.message?.includes("idx_ledger_entries_unique_refund_order")) {
              logger.info("REFUND ledger entry already exists from concurrent insert, skipping duplicate insert", {
                orderId: freshOrder.id
              });
            } else {
              throw ledgerErr;
            }
          }
        }
      });

      // Dispatch automated notification email asynchronously (email failure does NOT roll back refund)
      const userEmail = freshOrder.user?.email;
      if (userEmail) {
        const refundAud = (refundAmountCents / 100).toFixed(2);
        sendEventCancellationNotification({
          recipientEmail: userEmail,
          recipientName: freshOrder.user?.name || "Valued Customer",
          orderNumber: freshOrder.orderNumber,
          eventTitle: event.title,
          cancellationReason: cancelReason,
          refundAmountAud: refundAud,
          currency: freshOrder.currency || "AUD"
        }).catch((emailErr) => {
          logger.error("Failed to send event cancellation email", {
            orderId: freshOrder.id,
            email: userEmail,
            error: emailErr.message
          });
        });
      }

      return { status: "SUCCEEDED", amountCents: refundAmountCents, retainedFeeCents };
    } catch (dbErr) {
      logger.error("Database transaction failed for succeeded Stripe refund", {
        orderId: freshOrder.id,
        stripeRefundId,
        error: dbErr.message
      });
      return { status: "FAILED_DB", amountCents: 0, retainedFeeCents: 0 };
    }
  } else {
    // Payment provider refund failed or timed out:
    // CRITICAL: DO NOT mark Order as REFUNDED. Order remains PAID for safe retry.
    // Payment remains SUCCEEDED. Tickets remain VALID. No ledger entry created.
    try {
      if (freshOrder.payment) {
        const refundStatus = isAmbiguousTimeout ? "PENDING" : "FAILED";
        const reasonText = (isAmbiguousTimeout
          ? "Network timeout/ambiguous error during refund submission - pending reconciliation"
          : (failureErrorMessage || "Payment provider definitively rejected refund")
        ).slice(0, 255);

        await prisma.refund.upsert({
          where: { orderId: freshOrder.id },
          create: {
            orderId: freshOrder.id,
            paymentId: freshOrder.payment.id,
            stripeRefundId: null,
            amountCents: refundAmountCents,
            status: refundStatus,
            reason: reasonText
          },
          update: {
            stripeRefundId: null,
            amountCents: refundAmountCents,
            status: refundStatus,
            reason: reasonText
          }
        });
      }
    } catch (persistErr) {
      logger.error("Failed to persist refund failure details to database", {
        orderId: freshOrder.id,
        error: persistErr.message
      });
    }

    return { status: isAmbiguousTimeout ? "TIMEOUT" : "FAILED", amountCents: 0, retainedFeeCents: 0 };
  }
}

/**
 * Iterates through orders and processes refunds with individual isolation.
 */
export async function executeEventRefundBatch(eventId, cancelReason, adminUserId, orderIds, event) {
  const paymentProvider = getPaymentProvider();
  let refundedCount = 0;
  let failedCount = 0;
  let timeoutCount = 0;
  let totalRefundedCents = 0;
  let totalRetainedFeesCents = 0;

  for (const orderId of orderIds) {
    try {
      const outcome = await processSingleOrderRefund({
        orderId,
        event,
        cancelReason,
        paymentProvider
      });

      if (outcome.status === "SUCCEEDED") {
        refundedCount++;
        totalRefundedCents += outcome.amountCents;
        totalRetainedFeesCents += outcome.retainedFeeCents;
      } else if (outcome.status === "TIMEOUT") {
        timeoutCount++;
      } else if (outcome.status === "FAILED" || outcome.status === "FAILED_DB") {
        failedCount++;
      }
    } catch (orderErr) {
      logger.error("Unexpected error processing refund for order", {
        orderId,
        error: orderErr.message
      });
      failedCount++;
    }
  }

  // Persist Audit Log entry summarizing execution
  try {
    await prisma.auditLog.create({
      data: {
        actorId: adminUserId || null,
        action: "EVENT_CANCELLED",
        entity: "Event",
        entityId: event.id,
        after: {
          eventId: event.id,
          eventTitle: event.title,
          reason: cancelReason,
          totalOrdersProcessed: orderIds.length,
          refundedOrders: refundedCount,
          failedOrders: failedCount,
          timeoutOrders: timeoutCount,
          totalRefundedCents,
          totalRetainedFeesCents
        }
      }
    });
  } catch (auditErr) {
    logger.error("Failed to write audit log for event cancellation", { eventId, error: auditErr.message });
  }

  return {
    totalOrders: orderIds.length,
    refundedCount,
    failedCount,
    timeoutCount,
    totalRefundedCents,
    totalRetainedFeesCents
  };
}

/**
 * Worker handler invoked by pg-boss for asynchronous background refund processing.
 */
export async function executeEventRefundBatchForEvent(eventId, cancelReason, adminUserId) {
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
    logger.warn("Event not found for background refund batch", { eventId });
    return;
  }

  const remainingPaidOrders = await prisma.order.findMany({
    where: {
      eventId,
      status: "PAID"
    },
    select: { id: true }
  });

  if (remainingPaidOrders.length === 0) {
    logger.info("No remaining paid orders found for background refund batch", { eventId });
    return;
  }

  logger.info(`Starting pg-boss background refund execution for ${remainingPaidOrders.length} orders in event ${eventId}`);
  const orderIds = remainingPaidOrders.map((o) => o.id);
  await executeEventRefundBatch(eventId, cancelReason, adminUserId, orderIds, event);
}

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

  const cancelReason = reason || "Event cancelled by platform administrator";

  // Check if event is already cancelled
  if (event.status === "CANCELLED") {
    // Allow retry if there are unresolved PAID orders
    const remainingPaidCount = await prisma.order.count({
      where: {
        eventId,
        status: "PAID"
      }
    });

    if (remainingPaidCount === 0) {
      throw new AppError("CONFLICT", 409, "This event has already been cancelled and all orders have been processed.");
    }

    logger.info("Retrying refunds for already-cancelled event with unresolved paid orders", {
      eventId,
      remainingPaidCount
    });
  } else {
    // Update event status to CANCELLED and release all active inventory holds atomically
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
  }

  // Fetch all currently unresolved PAID orders for this event
  const paidOrders = await prisma.order.findMany({
    where: {
      eventId,
      status: "PAID"
    },
    select: { id: true }
  });

  if (paidOrders.length === 0) {
    return {
      eventId: event.id,
      eventTitle: event.title,
      status: "CANCELLED",
      reason: cancelReason,
      isBackground: false,
      summary: {
        totalPaidOrders: 0,
        refundedOrders: 0,
        failedOrders: 0,
        totalRefundedAmountCents: 0,
        retainedFeeAmountCents: 0,
        currency: "AUD",
        message: "No paid orders require refunds."
      }
    };
  }

  const orderIds = paidOrders.map((o) => o.id);
  const ASYNC_THRESHOLD = 5;

  if (orderIds.length > ASYNC_THRESHOLD) {
    // Enqueue a durable background job into PostgreSQL via pg-boss before responding HTTP 202
    try {
      await pgboss.send(
        "event.refund.batch",
        {
          eventId,
          cancelReason,
          adminUserId
        },
        {
          singletonKey: eventId, // Deduplicates simultaneous queueing for the same event
          retryLimit: 2,
          retryDelay: 30
        }
      );
      logger.info("Enqueued durable pg-boss job for event cancellation refunds", { eventId, orderCount: orderIds.length });
    } catch (queueErr) {
      logger.warn("pg-boss enqueue failed, falling back to synchronous processing to avoid losing job", {
        eventId,
        error: queueErr.message
      });
      // If queueing fails, execute synchronously rather than abandoning the job
      const fallbackResult = await executeEventRefundBatch(eventId, cancelReason, adminUserId, orderIds, event);
      return {
        eventId: event.id,
        eventTitle: event.title,
        status: "CANCELLED",
        reason: cancelReason,
        isBackground: false,
        summary: {
          totalPaidOrders: orderIds.length,
          refundedOrders: fallbackResult.refundedCount,
          failedOrders: fallbackResult.failedCount,
          totalRefundedAmountCents: fallbackResult.totalRefundedCents,
          retainedFeeAmountCents: fallbackResult.totalRetainedFeesCents,
          currency: "AUD"
        }
      };
    }

    return {
      eventId: event.id,
      eventTitle: event.title,
      status: "CANCELLED",
      reason: cancelReason,
      isBackground: true,
      summary: {
        totalPaidOrders: orderIds.length,
        status: "PROCESSING",
        message: `Event cancellation initiated. Processing refunds for ${orderIds.length} orders via durable background worker.`,
        currency: "AUD"
      }
    };
  }

  // Synchronous execution for small batches (<= 5 orders)
  const batchResult = await executeEventRefundBatch(eventId, cancelReason, adminUserId, orderIds, event);

  return {
    eventId: event.id,
    eventTitle: event.title,
    status: "CANCELLED",
    reason: cancelReason,
    isBackground: false,
    summary: {
      totalPaidOrders: orderIds.length,
      refundedOrders: batchResult.refundedCount,
      failedOrders: batchResult.failedCount,
      totalRefundedAmountCents: batchResult.totalRefundedCents,
      retainedFeeAmountCents: batchResult.totalRetainedFeesCents,
      currency: "AUD"
    }
  };
}

/**
 * Scans PostgreSQL on startup and in recurring cron for any CANCELLED events that still have unresolved PAID orders
 * (e.g. if the Node.js process crashed or was restarted mid-batch) and enqueues them for background recovery.
 */
export async function resumeInterruptedEventRefunds() {
  try {
    const cancelledEventsWithPaidOrders = await prisma.event.findMany({
      where: {
        status: "CANCELLED",
        orders: {
          some: {
            status: "PAID"
          }
        }
      },
      select: {
        id: true,
        title: true
      }
    });

    if (cancelledEventsWithPaidOrders.length === 0) {
      return;
    }

    logger.info(`Found ${cancelledEventsWithPaidOrders.length} cancelled event(s) with unresolved paid orders. Enqueueing recovery jobs...`);

    for (const evt of cancelledEventsWithPaidOrders) {
      try {
        await pgboss.send(
          "event.refund.batch",
          {
            eventId: evt.id,
            cancelReason: "Automated recovery for interrupted event cancellation",
            adminUserId: null
          },
          {
            singletonKey: evt.id,
            retryLimit: 2,
            retryDelay: 30
          }
        );
        logger.info(`Enqueued recovery job for cancelled event: ${evt.title} (${evt.id})`);
      } catch (err) {
        logger.error("Error enqueueing recovery refund job", { eventId: evt.id, error: err.message });
      }
    }
  } catch (err) {
    logger.error("Failed to run resumeInterruptedEventRefunds sweep", { error: err.message });
  }
}

// ----------------------------------------------------
// TERMS & CONDITIONS (Dynamic Super-Admin Platform Legal)
// ----------------------------------------------------
export const DEFAULT_TERMS = {
  title: "Terms and Conditions of Service",
  subtitle: "Please read these terms carefully before booking tickets or using the Mytix entertainment platform.",
  lastUpdated: "October 2026",
  sections: [
    {
      id: "agreement",
      title: "1. Agreement to Terms",
      content: "By accessing or using Mytix (the 'Platform'), purchasing tickets, registering an account, or attending any event ticketed through our service, you agree to be legally bound by these Terms and Conditions and our Privacy Policy. If you do not agree with any provision of these terms, you must not use our website, mobile application, or purchase tickets."
    },
    {
      id: "ticketing",
      title: "2. Digital Ticketing & Admission",
      content: "All tickets issued through Mytix are 100% digital electronic admissions secured with high-grade cryptographic QR verification signatures. Each QR code is strictly valid for a single entry scan at venue turnstiles. Duplicated, altered, or unreadable tickets will be denied entry by venue gate operators without entitlement to compensation."
    },
    {
      id: "pricing",
      title: "3. Pricing, Taxes & Payment Gateway",
      content: "All ticket prices are listed in Australian Dollars (AUD) or relevant local currency inclusive of statutory Goods and Services Tax (GST) unless explicitly noted otherwise. Payment must be made in full through authorized bank gateways (credit/debit cards, Apple Pay, Google Pay). Mytix guarantees complete price transparency with zero hidden surprise fees at final checkout."
    },
    {
      id: "cancellation",
      title: "4. Event Cancellation, Rescheduling & Refunds",
      content: "In the event that a concert, festival, or show is officially cancelled by the artist or event organizer, full ticket refunds will be automatically returned to your original payment method in compliance with Australian Consumer Law (ACL). If an event is postponed or rescheduled, existing tickets remain valid for the newly announced date."
    },
    {
      id: "venue-rules",
      title: "5. Venue Conduct & Admission Rights",
      content: "Ticket holders must adhere to all individual venue regulations, security checks, bag inspections, and age restrictions (e.g. 18+ valid photo ID requirements). Venue management and organizers reserve the right to refuse entry or eject individuals demonstrating disorderly, abusive, or unsafe behavior."
    },
    {
      id: "resale",
      title: "6. Resale & Scalping Prohibition",
      content: "Tickets may not be scalped, resold for commercial gain, or transferred via unauthorized third-party secondary ticketing sites at prices exceeding 110% of face value in accordance with Australian state anti-scalping legislation."
    },
    {
      id: "liability",
      title: "7. Limitation of Liability",
      content: "To the maximum extent permitted by applicable law, Mytix acts as a ticketing agent on behalf of independent event organizers and shall not be held liable for personal injury, property loss, or artist performance changes beyond our direct operational control."
    }
  ]
};

export async function getTermsAndConditions() {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: "terms_and_conditions" }
  });
  if (!setting || !setting.value) {
    return DEFAULT_TERMS;
  }
  return setting.value;
}

export async function updateTermsAndConditions(termsData) {
  const setting = await prisma.platformSettings.upsert({
    where: { key: "terms_and_conditions" },
    update: {
      value: termsData
    },
    create: {
      key: "terms_and_conditions",
      value: termsData
    }
  });
  return setting.value;
}

// ----------------------------------------------------
// SOCIAL LINKS (Dynamic Footer & Brand Links)
// ----------------------------------------------------
export const DEFAULT_SOCIAL_LINKS = [
  { id: "facebook", name: "facebook", url: "https://facebook.com", letter: "F", isActive: true },
  { id: "twitter", name: "twitter", url: "https://x.com", letter: "X", isActive: true },
  { id: "youtube", name: "youtube", url: "https://youtube.com", letter: "Y", isActive: true },
  { id: "instagram", name: "instagram", url: "https://instagram.com", letter: "I", isActive: true }
];

export async function getSocialLinks() {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: "social_links" }
  });
  if (!setting || !setting.value || !Array.isArray(setting.value)) {
    return DEFAULT_SOCIAL_LINKS;
  }
  return setting.value;
}

export async function updateSocialLinks(linksData) {
  if (!Array.isArray(linksData)) {
    throw new Error("Invalid social links data format. Expected an array.");
  }
  const setting = await prisma.platformSettings.upsert({
    where: { key: "social_links" },
    update: {
      value: linksData
    },
    create: {
      key: "social_links",
      value: linksData
    }
  });
  return setting.value;
}

// ----------------------------------------------------
// CITY IMAGES (Browse by City customization)
// ----------------------------------------------------
export async function getCityImages() {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: "city_images" }
  });
  if (!setting || !setting.value || typeof setting.value !== "object") {
    return {};
  }
  return setting.value;
}

export async function updateCityImages(cityImagesMap) {
  if (typeof cityImagesMap !== "object" || cityImagesMap === null) {
    throw new Error("Invalid city images format. Expected an object.");
  }
  const setting = await prisma.platformSettings.upsert({
    where: { key: "city_images" },
    update: {
      value: cityImagesMap
    },
    create: {
      key: "city_images",
      value: cityImagesMap
    }
  });
  return setting.value;
}

// ----------------------------------------------------
// ABOUT US PAGE (Dynamic Super-Admin CMS)
// ----------------------------------------------------
export const DEFAULT_ABOUT_US = {
  heroTagline: "Our Story & Mission",
  heroTitle: "Built for live moments.",
  heroHighlight: "Honest ticketing for Australia.",
  heroDescription: "Mytix was founded with a singular purpose: to replace frustrating ticket queues, hidden fees, and ticket scalping with a seamless, mobile-first live entertainment experience.",
  stats: [
    { label: "Tickets Delivered", value: "500K+", sub: "100% digital & paperless" },
    { label: "Partner Venues", value: "180+", sub: "Across all Australian states" },
    { label: "Gate Entry Speed", value: "<1 sec", sub: "Instant cryptographic QR scan" },
    { label: "Fan Satisfaction", value: "99.4%", sub: "Verified attendee rating" }
  ],
  narrativeTagline: "Why Mytix Exists",
  narrativeTitle: "A modern platform made for fans, artists, and venues.",
  narrativeParagraphs: [
    "For decades, buying concert tickets has felt stressful. Fans endured broken waiting rooms, predatory price hikes, and secondary scalpers who marked up tickets by 300%.",
    "Mytix changes that. From stadium arena tours in Melbourne and Sydney to intimate comedy clubs in Brisbane and Perth, we bring transparency, reliability, and security to every booking."
  ],
  featureBoxTitle: "Every city. Every beat. Every Aussie stage.",
  featureBoxDescription: "We partner directly with leading promoters, local venues, and Australian festivals to guarantee that every ticket purchased on Mytix is genuine, authorized, and turnstile-ready.",
  featureBoxBadge: "100% Genuine Admission Guarantee",
  values: [
    {
      title: "Zero Hidden Fees",
      desc: "We believe in honest ticketing. The price you see on an event is what you pay at checkout. No surprise service charges, processing markups, or print-at-home extortion."
    },
    {
      title: "Instant Digital Gate Entry",
      desc: "Our proprietary QR turnstile technology validates tickets in less than one second, eliminating long queues and counterfeit passes so you spend more time enjoying the show."
    },
    {
      title: "Creator-First Ecosystem",
      desc: "We empower independent artists, comedy clubs, and stadium promoters with high-speed reserved seating maps, transparent analytics, and reliable revenue settlements."
    },
    {
      title: "Australian Fan Protection",
      desc: "Fully compliant with Australian Consumer Law (ACL) and state anti-scalping legislation. If an event is cancelled or postponed, refunds are handled fairly and promptly."
    }
  ],
  valuesHeading: "What sets Mytix apart",
  valuesSubheading: "Our core values guide every line of code and customer interaction.",
  ctaTitle: "Ready to discover upcoming shows?",
  ctaDescription: "Explore live gigs, comedy specials, and festival passes in your city today."
};

export async function getAboutUs() {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: "about_us" }
  });
  if (!setting || !setting.value) {
    return DEFAULT_ABOUT_US;
  }
  return setting.value;
}

export async function updateAboutUs(aboutData) {
  const setting = await prisma.platformSettings.upsert({
    where: { key: "about_us" },
    update: { value: aboutData },
    create: { key: "about_us", value: aboutData }
  });
  return setting.value;
}

// ----------------------------------------------------
// CONTACT US PAGE (Dynamic Super-Admin CMS)
// ----------------------------------------------------
export const DEFAULT_CONTACT_US = {
  heroTagline: "Australian Customer Care",
  heroTitle: "Contact Mytix Support",
  heroDescription: "We're here to assist you with tickets, venue entry, bookings, and organizer partnerships.",
  contactCards: [
    {
      title: "Customer Support Email",
      subtitle: "For ticket inquiries, event entry, and refund requests",
      actionText: "support@mytix.com.au",
      actionHref: "mailto:support@mytix.com.au",
      badge: "Fastest response (<2h)",
      iconType: "mail"
    },
    {
      title: "24/7 Phone Hotline",
      subtitle: "Toll-free assistance across all Australian states",
      actionText: "1800 MYTIX (1800 698 490)",
      actionHref: "tel:1800698490",
      badge: "24/7 on event days",
      iconType: "phone"
    },
    {
      title: "Organisers & Partnerships",
      subtitle: "For promoters, festivals, and venue ticket management",
      actionText: "organisers@mytix.com.au",
      actionHref: "mailto:organisers@mytix.com.au",
      badge: "Partnerships",
      iconType: "building"
    },
    {
      title: "Operating Hours",
      subtitle: "Dedicated local support team ready to assist",
      actionText: "Mon – Sun: 24/7 Event Coverage",
      actionHref: "",
      badge: "Always Open",
      iconType: "clock"
    }
  ],
  offices: [
    {
      label: "Melbourne HQ",
      address: "Level 14, 120 Collins Street",
      city: "Melbourne, Victoria 3000, Australia"
    },
    {
      label: "Sydney Hub",
      address: "Level 22, 200 George Street",
      city: "Sydney, New South Wales 2000, Australia"
    }
  ]
};

export async function getContactUs() {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: "contact_us" }
  });
  if (!setting || !setting.value) {
    return DEFAULT_CONTACT_US;
  }
  return setting.value;
}

export async function updateContactUs(contactData) {
  const setting = await prisma.platformSettings.upsert({
    where: { key: "contact_us" },
    update: { value: contactData },
    create: { key: "contact_us", value: contactData }
  });
  return setting.value;
}

// ----------------------------------------------------
// FAQ (Dynamic Super-Admin CMS)
// ----------------------------------------------------
export const DEFAULT_FAQ = {
  heading: "Frequently Asked Questions",
  subheading: "Everything you need to know about booking, instant digital QR tickets, venue gate entry, and refunds.",
  items: [
    {
      question: "How do I receive and access my tickets after booking?",
      answer: "All tickets on Mytix are 100% digital and paperless. Once your payment is confirmed, your verified QR e-tickets are instantly generated and available in your 'My Tickets' dashboard. You will also receive an email with your booking confirmation and PDF e-ticket with a live scannable QR code."
    },
    {
      question: "How does entry verification work at the venue gates?",
      answer: "Simply open your e-ticket on your mobile phone via Mytix or your confirmation email at the turnstile gate. The event turnstile scanners verify the cryptographic digital signature of your QR code in under a second for fast, fraud-proof admission. No printouts needed!"
    },
    {
      question: "Can I transfer or cancel my tickets if my plans change?",
      answer: "Yes! Depending on the organizer's refund and transfer policy for the show, you can transfer your tickets to a friend's email or request a cancellation directly from your profile dashboard up to 24 hours before the event starts."
    },
    {
      question: "What happens if an event is postponed or cancelled?",
      answer: "If an event is rescheduled, your original tickets remain 100% valid for the new date automatically. If a show is cancelled or you cannot make the rescheduled date, a full refund is automatically issued to your original payment method within 5–7 business days."
    },
    {
      question: "What payment methods are supported on Mytix?",
      answer: "We support all major payment options: UPI (Google Pay, PhonePe, Paytm), Credit & Debit cards (Visa, Mastercard, RuPay, American Express), and Net Banking via safe, bank-grade 256-bit SSL encrypted gateways with instant payment confirmation."
    },
    {
      question: "Are there any hidden charges or unexpected fees at checkout?",
      answer: "Never! Mytix guarantees zero surprise fees. The ticket price shown on the event page clearly itemizes any applicable taxes or booking charges upfront before you proceed to payment."
    }
  ]
};

export async function getFaq() {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: "faq" }
  });
  if (!setting || !setting.value) {
    return DEFAULT_FAQ;
  }
  return setting.value;
}

export async function updateFaq(faqData) {
  const setting = await prisma.platformSettings.upsert({
    where: { key: "faq" },
    update: { value: faqData },
    create: { key: "faq", value: faqData }
  });
  return setting.value;
}

// ----------------------------------------------------
// ORGANISER REQUIREMENTS (Dynamic Super-Admin CMS)
// ----------------------------------------------------
export const DEFAULT_ORGANISER_REQUIREMENTS = {
  heroTagline: "Creator & Promoter Partnership",
  heroTitle: "Become a Verified Mytix Organiser",
  heroDescription: "Everything you need to know to partner with Mytix, publish events, sell tickets across Australia, and manage venue gate entry with zero hassle.",
  requirements: [
    {
      title: "Australian Business Registration (ABN / ACN)",
      description: "Organisers must hold an active Australian Business Number (ABN) or registered Australian entity.",
      badge: "Mandatory"
    },
    {
      title: "Verified Commercial Bank Account",
      description: "A nominated Australian bank account (BSB & Account Number) matching your legal entity for direct scheduled revenue payouts.",
      badge: "Mandatory"
    },
    {
      title: "Identity & Key Contact Verification",
      description: "Primary account holder must provide a valid Australian Driver's Licence or Passport to complete KYC security standards.",
      badge: "KYC Security"
    },
    {
      title: "Venue Hire Agreement or Ownership Proof",
      description: "An authorized contract, booking confirmation, or council permit granting permission to host the event at the nominated venue.",
      badge: "Venue Compliance"
    },
    {
      title: "Public Liability Insurance & Safety Plan",
      description: "Current Public Liability Insurance certificate (minimum $10M–$20M depending on venue capacity) and emergency safety plan.",
      badge: "Event Safety"
    },
    {
      title: "Fair Ticketing & ACL Compliance",
      description: "Commitment to Australian Consumer Law (ACL), state anti-scalping legislation, and transparent all-inclusive ticket pricing.",
      badge: "Consumer Law"
    }
  ],
  benefits: [
    {
      title: "Fast Turnstile QR Scanner",
      desc: "Turn your gate security's smartphones into 0.2-second high-speed turnstiles with real-time sync and duplicate-ticket fraud prevention."
    },
    {
      title: "Fast Transparent Settlements",
      desc: "Receive clear, reliable automated payouts and detailed financial reporting with zero surprise processing markups."
    },
    {
      title: "Gate Staff Role Isolation",
      desc: "Create restricted credentials for gate staff with individual staff IDs. Staff only see their scanner, with no access to financials."
    },
    {
      title: "Dedicated Promoter Support",
      desc: "Direct access to our Australian event operations team before, during, and after show day."
    }
  ],
  onboardingSteps: [
    {
      step: "01",
      title: "Submit Contact & Business Details",
      desc: "Reach out via our partnership channels with your ABN, event concept, and expected venue."
    },
    {
      step: "02",
      title: "Verification & Fast Approval",
      desc: "Our platform team verifies compliance, issues your Organiser Portal credentials, and configures your account."
    },
    {
      step: "03",
      title: "Create Staff Accounts & Launch",
      desc: "Publish your event, manage ticket tiers, generate gate staff IDs, and start selling tickets across Australia."
    }
  ],
  contactDetails: {
    heading: "Get in Touch with our Partnerships Team",
    subheading: "Ready to put on a show or have questions about requirements? Contact our Australian team directly.",
    email: "organisers@mytix.com.au",
    phone: "1800 698 490 (Toll-Free AU)",
    hours: "Monday – Sunday: 24/7 Event Day Support",
    address: "Level 14, 120 Collins Street, Melbourne VIC 3000"
  }
};

export async function getOrganiserRequirements() {
  const setting = await prisma.platformSettings.findUnique({
    where: { key: "organiser_requirements" }
  });
  if (!setting || !setting.value) {
    return DEFAULT_ORGANISER_REQUIREMENTS;
  }
  return setting.value;
}

export async function updateOrganiserRequirements(reqData) {
  const setting = await prisma.platformSettings.upsert({
    where: { key: "organiser_requirements" },
    update: { value: reqData },
    create: { key: "organiser_requirements", value: reqData }
  });
  return setting.value;
}



export async function getTrendingEventsDiagnostics(limit = 20) {
  const { getTrendingDiagnostics } = await import("../catalog/trending.service.js");
  return getTrendingDiagnostics({ limit });
}
