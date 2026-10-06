import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { hashToken, generateSecureToken } from "./password.service.js";
import { AppError } from "../../utils/errors.js";
import { signAccessToken } from "../../utils/jwt.js";
import { env } from "../../config/env.js";

export function generateAccessToken(user) {
  return signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role
  });
}

export async function createRefreshToken(userId, existingFamilyId = null) {
  const rawToken = generateSecureToken(40);
  const tokenHash = hashToken(rawToken);
  const familyId = existingFamilyId || crypto.randomUUID();
  const days = parseInt(env.JWT_REFRESH_EXPIRATION_DAYS || "30", 10);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      familyId,
      expiresAt
    }
  });

  return { rawToken, familyId };
}

export async function rotateRefreshToken(rawToken) {
  if (!rawToken) {
    throw new AppError("LOGIN_REQUIRED", 401, "Refresh token is missing.");
  }

  const tokenHash = hashToken(rawToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!storedToken) {
    throw new AppError("LOGIN_REQUIRED", 401, "Invalid refresh token.");
  }

  // Token reuse detection: if revoked token is re-presented, revoke entire family
  if (storedToken.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: storedToken.familyId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    throw new AppError("LOGIN_REQUIRED", 401, "Compromised session detected. Please log in again.");
  }

  if (storedToken.expiresAt < new Date()) {
    throw new AppError("LOGIN_REQUIRED", 401, "Refresh token has expired. Please log in again.");
  }

  // Revoke current token and generate new one in the same family
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() }
  });

  const { rawToken: newRefreshToken } = await createRefreshToken(storedToken.userId, storedToken.familyId);
  const newAccessToken = generateAccessToken(storedToken.user);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: storedToken.user
  };
}

export async function revokeAllUserTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}
