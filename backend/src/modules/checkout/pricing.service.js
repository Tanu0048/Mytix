import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

/**
 * Default Australian domestic card pricing parameters.
 * Domestic card surcharge: 1.7% + 30c AUD.
 */
const DEFAULT_RATES = {
  buyerPaysStripeFee: true,
  percent: 0.017,
  fixedCents: 30
};

/**
 * Fetch platform fee configuration from the database or fall back to defaults.
 */
export async function getPricingSettings() {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: "pricing_settings" }
    });
    if (setting && setting.value) {
      return {
        ...DEFAULT_RATES,
        ...setting.value
      };
    }
  } catch (err) {
    logger.warn("Could not retrieve pricing settings from database, using defaults", {
      error: err.message
    });
  }
  return DEFAULT_RATES;
}

/**
 * Calculate pricing breakdowns for a given ticket face value total in AUD cents.
 * Formula:
 * grossTotal = Math.ceil((ticketTotal + fixedCents) / (1 - percent))
 * buyerFee = grossTotal - ticketTotal
 *
 * This ensures the organiser nets 100% of the ticket face value after gateway processing.
 *
 * @param {number} ticketTotalCents - Face value of tickets in cents
 * @returns {Promise<{ ticketTotalCents: number, buyerFeeCents: number, totalCents: number }>}
 */
export async function calculateOrderPricing(ticketTotalCents) {
  if (ticketTotalCents <= 0) {
    return {
      ticketTotalCents: 0,
      buyerFeeCents: 0,
      totalCents: 0
    };
  }

  const { buyerPaysStripeFee, percent, fixedCents } = await getPricingSettings();

  if (!buyerPaysStripeFee) {
    return {
      ticketTotalCents,
      buyerFeeCents: 0,
      totalCents: ticketTotalCents
    };
  }

  // Exact whole-cents rounding for Australian domestic surcharge
  const totalCents = Math.ceil((ticketTotalCents + fixedCents) / (1 - percent));
  const buyerFeeCents = totalCents - ticketTotalCents;

  return {
    ticketTotalCents,
    buyerFeeCents,
    totalCents
  };
}
