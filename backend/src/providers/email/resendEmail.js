import { EmailProvider } from "./email.interface.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../utils/errors.js";

export class ResendEmailProvider extends EmailProvider {
  constructor() {
    super();
    this.apiKey = process.env.RESEND_API_KEY;
    this.defaultFrom = process.env.EMAIL_FROM || "tickets@mytix.example.com";
  }

  async sendEmail({ to, subject, html, text, from }) {
    const sender = from || this.defaultFrom;
    const apiKey = this.apiKey || process.env.RESEND_API_KEY;

    if (!apiKey || apiKey.includes("placeholder")) {
      logger.warn("Resend API key is not configured, skipping actual email delivery", {
        to,
        subject
      });
      return { id: `simulated-${Date.now()}`, success: true };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: sender,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text
        })
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error("Resend API returned error", {
          status: response.status,
          error: data
        });
        throw new AppError("EMAIL_DELIVERY_FAILED", 502, `Email sending failed: ${data.message || "Unknown error"}`);
      }

      logger.info("Email dispatched successfully via Resend", {
        to,
        subject,
        messageId: data.id
      });

      return { id: data.id, success: true };
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error("Network error delivering email via Resend", { error: err.message });
      throw new AppError("EMAIL_DELIVERY_ERROR", 502, `Failed to communicate with email service: ${err.message}`);
    }
  }
}
