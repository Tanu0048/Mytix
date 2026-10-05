import { verifyGoogleToken } from "../../lib/google.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";

export async function authenticateWithGoogle(idToken) {
  const googlePayload = await verifyGoogleToken(idToken);
  if (!googlePayload) {
    throw new AppError("INVALID_CREDENTIALS", 401, "Google token verification failed.");
  }

  const { sub: googleUserId, email, name } = googlePayload;

  // Check if provider record exists
  const existingProvider = await prisma.authProvider.findUnique({
    where: {
      provider_providerUserId: {
        provider: "google",
        providerUserId: googleUserId
      }
    },
    include: { user: true }
  });

  if (existingProvider) {
    return { user: existingProvider.user, isNewUser: false };
  }

  // Check if user exists by email
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    await prisma.authProvider.create({
      data: {
        userId: existingUser.id,
        provider: "google",
        providerUserId: googleUserId
      }
    });
    return { user: existingUser, isNewUser: false };
  }

  // Provision new user
  const newUser = await prisma.user.create({
    data: {
      email,
      name,
      role: "USER",
      authProviders: {
        create: {
          provider: "google",
          providerUserId: googleUserId
        }
      }
    }
  });

  return { user: newUser, isNewUser: true };
}
