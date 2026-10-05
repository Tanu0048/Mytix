import { prisma } from "../../lib/prisma.js";
import { pgboss } from "../../lib/pgboss.js";
import { hashPassword, verifyPassword, generateSecureToken, hashToken } from "./password.service.js";
import { generateAccessToken, createRefreshToken, rotateRefreshToken, revokeAllUserTokens } from "./token.service.js";
import { authenticateWithGoogle } from "./googleAuth.service.js";
import { AppError } from "../../utils/errors.js";
import { PASSWORD_RESET_EXPIRATION_MINUTES } from "../../config/constants.js";

export async function registerUser({ email, name, password, phone }) {
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AppError("EMAIL_ALREADY_USED", 409, "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      phone,
      passwordHash,
      role: "USER"
    }
  });

  const accessToken = generateAccessToken(user);
  const { rawToken: refreshToken } = await createRefreshToken(user.id);

  // Enqueue welcome email job
  await pgboss.send("email.send", {
    type: "WELCOME",
    recipientEmail: user.email,
    recipientName: user.name
  }).catch(() => {});

  return { user, accessToken, refreshToken };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.passwordHash) {
    throw new AppError("INVALID_CREDENTIALS", 401, "Invalid email or password.");
  }

  const isValid = await verifyPassword(user.passwordHash, password);
  if (!isValid) {
    throw new AppError("INVALID_CREDENTIALS", 401, "Invalid email or password.");
  }

  const accessToken = generateAccessToken(user);
  const { rawToken: refreshToken } = await createRefreshToken(user.id);

  return { user, accessToken, refreshToken };
}

export async function loginWithGoogle({ idToken }) {
  const { user, isNewUser } = await authenticateWithGoogle(idToken);

  const accessToken = generateAccessToken(user);
  const { rawToken: refreshToken } = await createRefreshToken(user.id);

  if (isNewUser) {
    await pgboss.send("email.send", {
      type: "WELCOME",
      recipientEmail: user.email,
      recipientName: user.name
    }).catch(() => {});
  }

  return { user, accessToken, refreshToken };
}

export async function refreshSession(rawRefreshToken) {
  return rotateRefreshToken(rawRefreshToken);
}

export async function logoutSession(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  // Always return identical success message to prevent user enumeration
  if (!user) {
    return { message: "If an account with that email exists, a password reset link has been sent." };
  }

  // Invalidate any previously unused reset tokens
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() }
  });

  const rawResetToken = generateSecureToken(32);
  const tokenHash = hashToken(rawResetToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000);

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  // Enqueue reset email job
  await pgboss.send("email.send", {
    type: "PASSWORD_RESET",
    recipientEmail: user.email,
    recipientName: user.name,
    resetToken: rawResetToken
  }).catch(() => {});

  return { message: "If an account with that email exists, a password reset link has been sent." };
}

export async function executePasswordReset(rawToken, newPassword) {
  const tokenHash = hashToken(rawToken);

  const resetRecord = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw new AppError("INVALID_CREDENTIALS", 400, "Password reset token is invalid or has expired.");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    // 1. Update user password
    await tx.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash }
    });

    // 2. Mark reset token used
    await tx.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() }
    });

    // 3. Revoke all existing sessions across all devices
    await tx.refreshToken.updateMany({
      where: { userId: resetRecord.userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  });

  // Enqueue security notice email
  await pgboss.send("email.send", {
    type: "PASSWORD_CHANGED",
    recipientEmail: resetRecord.user.email,
    recipientName: resetRecord.user.name
  }).catch(() => {});

  return { message: "Password has been successfully reset. Please log in with your new password." };
}
