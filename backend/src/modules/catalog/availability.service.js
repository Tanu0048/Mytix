import { prisma } from "../../lib/prisma.js";
import { getCached, setCached } from "../../lib/cache.js";
import { AppError } from "../../utils/errors.js";

export async function getEventAvailability(slug) {
  const cacheKey = `availability:${slug}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      ticketTypes: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          available: true,
          sold: true,
          saleStartsAt: true,
          saleEndsAt: true,
          minPerOrder: true,
          maxPerOrder: true
        },
        orderBy: { priceCents: "asc" }
      }
    }
  });

  if (!event) {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  const now = new Date();
  const tiers = event.ticketTypes.map((tier) => {
    const isSaleOpen = now >= tier.saleStartsAt && now <= tier.saleEndsAt;
    const isSoldOut = tier.available <= 0;

    return {
      id: tier.id,
      name: tier.name,
      priceCents: tier.priceCents,
      available: tier.available,
      isSoldOut,
      isSaleOpen,
      minPerOrder: tier.minPerOrder,
      maxPerOrder: tier.maxPerOrder
    };
  });

  const response = {
    eventId: event.id,
    eventStatus: event.status,
    allSoldOut: tiers.every((t) => t.isSoldOut),
    ticketTypes: tiers
  };

  setCached(cacheKey, response, 5000); // 5 seconds TTL
  return response;
}
