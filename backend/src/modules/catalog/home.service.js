import { prisma } from "../../lib/prisma.js";
import { getCached, setCached } from "../../lib/cache.js";
import { CACHE_TTL } from "../../config/constants.js";
import { getTrendingEvents } from "./trending.service.js";

export async function getHomePageData() {
  const cacheKey = "catalog:home";
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const now = new Date();

  const [featuredEvents, trendingEvents, upcomingArtists, venues, cityImagesSetting] = await Promise.all([
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
        ticketTypes: { select: { priceCents: true, available: true, quantity: true, sold: true } }
      }
    }),

    // Dynamic Trending Events (Option A: 48h Sales Velocity with 3-tier fallback)
    getTrendingEvents({ limit: 8 }),

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

    // Configured cities from venues
    prisma.venue.findMany({
      where: {
        city: { not: "" }
      },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" }
    }),

    // Configured custom city photos
    prisma.platformSettings.findUnique({
      where: { key: "city_images" }
    })
  ]);

  const uniqueCities = Array.from(
    new Set(
      venues
        .map((v) => v.city?.trim())
        .filter(Boolean)
    )
  );

  const cityImages = (cityImagesSetting && typeof cityImagesSetting.value === "object") 
    ? cityImagesSetting.value 
    : {};

  const response = {
    featuredEvents,
    trendingEvents,
    upcomingArtists,
    cities: uniqueCities,
    cityImages
  };

  setCached(cacheKey, response, CACHE_TTL.STATIC_PAGES_SECONDS * 1000);
  return response;
}
