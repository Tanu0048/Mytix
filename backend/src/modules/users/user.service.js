import { prisma } from "../../lib/prisma.js";
import { pgboss } from "../../lib/pgboss.js";
import { hashPassword, verifyPassword } from "../auth/password.service.js";
import { createRefreshToken } from "../auth/token.service.js";
import { AppError } from "../../utils/errors.js";
import { parseCursorPagination, formatPaginatedResponse } from "../../utils/pagination.js";

export async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      organiser: {
        select: {
          id: true,
          businessName: true,
          status: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError("NOT_FOUND", 404, "User profile not found.");
  }

  return user;
}

export async function updateUserProfile(userId, data) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      phone: data.phone
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true
    }
  });

  return user;
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.passwordHash) {
    throw new AppError("INVALID_CREDENTIALS", 400, "Cannot change password for external OAuth accounts without a set password. Use forgot password instead.");
  }

  const isValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isValid) {
    throw new AppError("INVALID_CREDENTIALS", 401, "Current password is incorrect.");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    // Invalidate existing refresh tokens
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  });

  // Issue fresh refresh token for current device
  const { rawToken: newRefreshToken } = await createRefreshToken(userId);

  // Send security notification
  await pgboss.send("email.send", {
    type: "PASSWORD_CHANGED",
    recipientEmail: user.email,
    recipientName: user.name
  }).catch(() => {});

  return { message: "Password updated successfully.", newRefreshToken };
}

export async function getUserOrders(userId, query) {
  const { limit, cursor } = parseCursorPagination(query);

  const orders = await prisma.order.findMany({
    where: { userId },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
          posterPath: true,
          venue: {
            select: { name: true, city: true }
          }
        }
      },
      items: {
        include: {
          ticketType: { select: { name: true } }
        }
      }
    }
  });

  return formatPaginatedResponse(orders, limit);
}

export async function getUserTickets(userId, query) {
  const { limit, cursor } = parseCursorPagination(query);

  const tickets = await prisma.ticket.findMany({
    where: {
      order: { userId }
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      order: {
        select: {
          orderNumber: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startsAt: true,
              venue: {
                select: { name: true, city: true, timezone: true }
              }
            }
          }
        }
      }
    }
  });

  return formatPaginatedResponse(tickets, limit);
}

export async function followArtist(userId, artistId) {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId }
  });

  if (!artist) {
    throw new AppError("NOT_FOUND", 404, "Artist not found.");
  }

  await prisma.follow.upsert({
    where: {
      userId_artistId: { userId, artistId }
    },
    update: {},
    create: { userId, artistId }
  });

  return { message: "Successfully followed artist." };
}

export async function unfollowArtist(userId, artistId) {
  await prisma.follow.deleteMany({
    where: { userId, artistId }
  });

  return { message: "Successfully unfollowed artist." };
}

export async function getUserFollows(userId) {
  const follows = await prisma.follow.findMany({
    where: { userId },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
          slug: true,
          imagePath: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return follows.map((f) => f.artist);
}

export async function deleteUserAccount(userId) {
  // Anonymize personal identifying information (PII) while preserving financial orders/ledger
  await prisma.$transaction(async (tx) => {
    const anonymousEmail = `deleted_${userId}@mytix.local`;

    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonymousEmail,
        name: "Deleted User",
        phone: null,
        passwordHash: null
      }
    });

    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await tx.follow.deleteMany({
      where: { userId }
    });
  });

  return { message: "Account and personal data have been anonymized." };
}
