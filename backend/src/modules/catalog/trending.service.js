import { prisma } from "../../lib/prisma.js";
import { getCached, setCached } from "../../lib/cache.js";

const TRENDING_WINDOW_HOURS = 48;
const CACHE_TTL_MS = 300 * 1000; // 5 minutes

// In-flight promise map to prevent cache stampedes on concurrent misses
const inFlightRequests = new Map();

/**
 * Calculates and returns trending events based on Option A: Recent Sales Velocity.
 * 
 * 3-Tier Ranking Strategy:
 * - Tier 1: Events with eligible ticket sales in preceding 48 hours, sorted by recentSalesCount DESC.
 * - Tier 2: Eligible upcoming events sorted by all-time verified ticket sales DESC.
 * - Tier 3: Chronological upcoming published events sorted by startsAt ASC.
 * Ties are broken deterministically by startsAt ASC, then id ASC.
 * 
 * @param {object} params
 * @param {string} [params.city] - Optional venue city filter (case-insensitive).
 * @param {number} [params.limit=8] - Maximum number of trending events to return (1-50).
 * @returns {Promise<Array<object>>} Ranked and hydrated trending events with trendingMetrics.
 */
export async function getTrendingEvents({ city = null, limit = 8 } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 8));
  const normalizedCity = city && typeof city === "string" && city.trim() && city.trim().toLowerCase() !== "all cities"
    ? city.trim().toLowerCase()
    : null;
  const cacheKey = `catalog:trending:${normalizedCity || "all"}:${safeLimit}`;

  // 1. Check process-local LRU cache
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Prevent cache stampedes: if an identical calculation is already running, await it
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const computePromise = (async () => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - TRENDING_WINDOW_HOURS * 60 * 60 * 1000);

      const cityFilter = normalizedCity
        ? { venue: { city: { equals: normalizedCity, mode: "insensitive" } } }
        : {};

      // -------------------------------------------------------------
      // TIER 1: Recent Sales Velocity (preceding 48 hours)
      // -------------------------------------------------------------
      const recentOrders = await prisma.order.findMany({
        where: {
          status: "PAID",
          createdAt: { gte: windowStart },
          event: {
            status: "PUBLISHED",
            startsAt: { gte: now },
            ...cityFilter
          }
        },
        select: {
          eventId: true,
          _count: {
            select: {
              tickets: {
                where: { status: { in: ["VALID", "USED"] } }
              }
            }
          },
          items: {
            select: { quantity: true }
          }
        }
      });

      // Strict double-counting prevention:
      // If order._count.tickets > 0, tickets have been generated; use that count.
      // Otherwise fallback to order.items quantity (for orders in queue before worker processes).
      // Never add both.
      const recentSalesMap = new Map();
      for (const order of recentOrders) {
        const ticketCount = (order._count && order._count.tickets > 0)
          ? order._count.tickets
          : (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

        if (ticketCount > 0) {
          recentSalesMap.set(order.eventId, (recentSalesMap.get(order.eventId) || 0) + ticketCount);
        }
      }

      const rankedItems = [];
      const selectedEventIds = new Set();

      if (recentSalesMap.size > 0) {
        const tier1EventsMeta = await prisma.event.findMany({
          where: {
            id: { in: Array.from(recentSalesMap.keys()) },
            status: "PUBLISHED",
            startsAt: { gte: now }
          },
          select: { id: true, startsAt: true }
        });

        const tier1MetaMap = new Map(tier1EventsMeta.map((e) => [e.id, e]));

        // Deterministic sorting: recentSalesCount DESC, startsAt ASC, id ASC
        const sortedTier1Ids = Array.from(recentSalesMap.keys())
          .filter((id) => tier1MetaMap.has(id))
          .sort((a, b) => {
            const salesDiff = recentSalesMap.get(b) - recentSalesMap.get(a);
            if (salesDiff !== 0) return salesDiff;

            const dateA = new Date(tier1MetaMap.get(a).startsAt).getTime();
            const dateB = new Date(tier1MetaMap.get(b).startsAt).getTime();
            if (dateA !== dateB) return dateA - dateB;

            return a.localeCompare(b);
          });

        for (const eventId of sortedTier1Ids.slice(0, safeLimit)) {
          rankedItems.push({
            eventId,
            recentSalesCount: recentSalesMap.get(eventId),
            rankingSource: "RECENT_SALES"
          });
          selectedEventIds.add(eventId);
        }
      }

      // -------------------------------------------------------------
      // TIER 2: All-Time Sales Volume Fallback
      // (Uses verified paid orders/tickets, not ticketTypes.sold which isn't decremented on refund)
      // -------------------------------------------------------------
      if (rankedItems.length < safeLimit) {
        const allTimeOrders = await prisma.order.findMany({
          where: {
            status: "PAID",
            eventId: { notIn: Array.from(selectedEventIds) },
            event: {
              status: "PUBLISHED",
              startsAt: { gte: now },
              ...cityFilter
            }
          },
          select: {
            eventId: true,
            _count: {
              select: {
                tickets: {
                  where: { status: { in: ["VALID", "USED"] } }
                }
              }
            },
            items: {
              select: { quantity: true }
            }
          }
        });

        const allTimeSalesMap = new Map();
        for (const order of allTimeOrders) {
          const ticketCount = (order._count && order._count.tickets > 0)
            ? order._count.tickets
            : (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

          if (ticketCount > 0) {
            allTimeSalesMap.set(order.eventId, (allTimeSalesMap.get(order.eventId) || 0) + ticketCount);
          }
        }

        if (allTimeSalesMap.size > 0) {
          const tier2EventsMeta = await prisma.event.findMany({
            where: {
              id: { in: Array.from(allTimeSalesMap.keys()) },
              status: "PUBLISHED",
              startsAt: { gte: now }
            },
            select: { id: true, startsAt: true }
          });

          const tier2MetaMap = new Map(tier2EventsMeta.map((e) => [e.id, e]));

          const sortedTier2Ids = Array.from(allTimeSalesMap.keys())
            .filter((id) => tier2MetaMap.has(id))
            .sort((a, b) => {
              const salesDiff = allTimeSalesMap.get(b) - allTimeSalesMap.get(a);
              if (salesDiff !== 0) return salesDiff;

              const dateA = new Date(tier2MetaMap.get(a).startsAt).getTime();
              const dateB = new Date(tier2MetaMap.get(b).startsAt).getTime();
              if (dateA !== dateB) return dateA - dateB;

              return a.localeCompare(b);
            });

          const remainingSlots = safeLimit - rankedItems.length;
          for (const eventId of sortedTier2Ids.slice(0, remainingSlots)) {
            rankedItems.push({
              eventId,
              recentSalesCount: recentSalesMap.get(eventId) || 0,
              rankingSource: "ALL_TIME_SALES"
            });
            selectedEventIds.add(eventId);
          }
        }
      }

      // -------------------------------------------------------------
      // TIER 3: Chronological Upcoming Fallback
      // -------------------------------------------------------------
      if (rankedItems.length < safeLimit) {
        const remainingSlots = safeLimit - rankedItems.length;

        const upcomingEvents = await prisma.event.findMany({
          where: {
            status: "PUBLISHED",
            startsAt: { gte: now },
            id: { notIn: Array.from(selectedEventIds) },
            ...cityFilter
          },
          take: remainingSlots,
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          select: { id: true }
        });

        for (const event of upcomingEvents) {
          rankedItems.push({
            eventId: event.id,
            recentSalesCount: 0,
            rankingSource: "UPCOMING"
          });
          selectedEventIds.add(event.id);
        }
      }

      // If no eligible events exist, cache empty result and return
      if (rankedItems.length === 0) {
        setCached(cacheKey, [], CACHE_TTL_MS);
        return [];
      }

      // -------------------------------------------------------------
      // Single Event Hydration Query (Zero N+1)
      // -------------------------------------------------------------
      const hydratedEvents = await prisma.event.findMany({
        where: {
          id: { in: rankedItems.map((item) => item.eventId) }
        },
        include: {
          venue: { select: { id: true, name: true, city: true, state: true } },
          artists: {
            include: {
              artist: { select: { id: true, name: true, slug: true, imagePath: true } }
            }
          },
          ticketTypes: {
            select: { priceCents: true, available: true, quantity: true, sold: true }
          }
        }
      });

      const hydratedMap = new Map(hydratedEvents.map((e) => [e.id, e]));

      const result = rankedItems
        .map((item, index) => {
          const event = hydratedMap.get(item.eventId);
          if (!event) return null;

          const minPriceCents = event.ticketTypes && event.ticketTypes.length > 0
            ? Math.min(...event.ticketTypes.map((t) => t.priceCents))
            : null;

          return {
            ...event,
            minPriceCents,
            trendingMetrics: {
              rank: index + 1,
              recentSalesCount: item.recentSalesCount,
              rankingSource: item.rankingSource
            }
          };
        })
        .filter(Boolean);

      setCached(cacheKey, result, CACHE_TTL_MS);
      return result;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, computePromise);
  return computePromise;
}

/**
 * Returns administrative trending diagnostics and metrics for Super-Admin.
 * 
 * @param {object} params
 * @param {number} [params.limit=20]
 * @returns {Promise<object>}
 */
export async function getTrendingDiagnostics({ limit = 20 } = {}) {
  const events = await getTrendingEvents({ limit });
  const now = new Date();
  const windowStart = new Date(now.getTime() - TRENDING_WINDOW_HOURS * 60 * 60 * 1000);

  // Platform-wide 48h total sales volume
  const paidOrders48h = await prisma.order.findMany({
    where: {
      status: "PAID",
      createdAt: { gte: windowStart }
    },
    select: {
      _count: {
        select: {
          tickets: {
            where: { status: { in: ["VALID", "USED"] } }
          }
        }
      },
      items: {
        select: { quantity: true }
      }
    }
  });

  const totalTicketsSold48h = paidOrders48h.reduce((sum, order) => {
    const count = (order._count && order._count.tickets > 0)
      ? order._count.tickets
      : (order.items || []).reduce((s, item) => s + (item.quantity || 0), 0);
    return sum + count;
  }, 0);

  return {
    snapshotAt: now.toISOString(),
    windowHours: TRENDING_WINDOW_HOURS,
    totalTicketsSold48h,
    trendingCount: events.length,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      status: e.status,
      startsAt: e.startsAt,
      venue: e.venue ? { name: e.venue.name, city: e.venue.city } : null,
      rank: e.trendingMetrics.rank,
      recentSalesCount: e.trendingMetrics.recentSalesCount,
      rankingSource: e.trendingMetrics.rankingSource
    }))
  };
}
