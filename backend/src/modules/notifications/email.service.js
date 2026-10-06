import { getEmailProvider } from "../../providers/email/index.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { renderWelcomeEmail } from "./templates/welcome.js";
import { renderOrderConfirmationEmail } from "./templates/orderConfirmation.js";
import { renderPasswordResetEmail } from "./templates/passwordReset.js";

/**
 * Checks if an email address is on the bounce/complaint suppression list.
 */
async function isEmailSuppressed(email) {
  try {
    const blocked = await prisma.emailBlocklist.findUnique({
      where: { email: email.toLowerCase() }
    });
    return !!blocked;
  } catch (err) {
    logger.warn("Could not check email suppression list", { email, error: err.message });
    return false;
  }
}

/**
 * Core dispatch function routing through the configured EmailProvider.
 */
export async function sendEmail({ to, subject, html, text }) {
  const normalizedEmail = Array.isArray(to) ? to[0].toLowerCase() : to.toLowerCase();

  const isBlocked = await isEmailSuppressed(normalizedEmail);
  if (isBlocked) {
    logger.info("Skipping email delivery to suppressed recipient", { email: normalizedEmail });
    return { id: "suppressed", success: false, reason: "SUPPRESSED" };
  }

  const emailProvider = getEmailProvider();
  return emailProvider.sendEmail({ to: normalizedEmail, subject, html, text });
}

export async function sendWelcomeNotification({ email, name, exploreUrl }) {
  const template = renderWelcomeEmail({ name, exploreUrl });
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendOrderConfirmationNotification(orderDetails) {
  const template = renderOrderConfirmationEmail(orderDetails);
  return sendEmail({
    to: orderDetails.recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

export async function sendPasswordResetNotification({ email, name, resetUrl, expirationMinutes }) {
  const template = renderPasswordResetEmail({ name, resetUrl, expirationMinutes });
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}
