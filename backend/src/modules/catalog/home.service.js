import { prisma } from "../../lib/prisma.js";
import { getCached, setCached } from "../../lib/cache.js";

export async function getHomePageData() {
  const cacheKey = "catalog:home";
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const now = new Date();

  const [featuredEvents, trendingEvents, upcomingArtists, venues] = await Promise.all([
    // Featured events for carousel
    prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { gte: now }
      },
      take: 5,
      orderBy: { startsAt: "asc" },
      include: {
        venue: { select: { name: true, city: true, state: true } },
        artists: { include: { artist: { select: { id: true, name: true, slug: true } } } },
        ticketTypes: { select: { priceCents: true, available: true } }
      }
    }),

    // Trending events
    prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { gte: now }
      },
      skip: 5,
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        venue: { select: { name: true, city: true } },
        ticketTypes: { select: { priceCents: true, available: true } }
      }
    }),

    // Artists with upcoming events
    prisma.artist.findMany({
      where: {
        events: {
          some: {
            event: {
              status: "PUBLISHED",
              startsAt: { gte: now }
            }
          }
        }
      },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        imagePath: true
      }
    }),

    // Active cities
    prisma.venue.findMany({
      where: {
        events: {
          some: {
            status: "PUBLISHED",
            startsAt: { gte: now }
          }
        }
      },
      select: { city: true },
      distinct: ["city"]
    })
  ]);

  const response = {
    featuredEvents,
    trendingEvents,
    upcomingArtists,
    cities: venues.map((v) => v.city)
  };

  setCached(cacheKey, response, 30000); // 30 seconds TTL
  return response;
}
