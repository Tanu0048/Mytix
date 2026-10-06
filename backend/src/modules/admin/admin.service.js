import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";
import { parseCursorPagination, formatPaginatedResponse } from "../../utils/pagination.js";
import { invalidateBannerCache } from "../banners/banner.service.js";
import { hashPassword } from "../auth/password.service.js";

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
