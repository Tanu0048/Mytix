import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import { parseCursorPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { invalidateBannerCache } from "../banners/banner.service.js";
import { hashPassword } from "../auth/password.service.js";
import { deleteCached } from "../../lib/cache.js";
import { getPaymentProvider } from "../../providers/payment/index.js";
import { logger } from "../../lib/logger.js";
import { sendEventCancellationNotification } from "../notifications/email.service.js";

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


