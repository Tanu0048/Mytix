import { prisma } from "../../lib/prisma.js";
import { getCached, setCached, deleteCached } from "../../lib/cache.js";

const BANNER_CACHE_KEY = "banners:active";

export async function getActiveBanners() {
  const cached = getCached(BANNER_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: [
      { displayOrder: "asc" },
      { createdAt: "desc" }
    ],
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
          venue: {
            select: { name: true, city: true }
          }
        }
      }
    }
  });

  setCached(BANNER_CACHE_KEY, banners, 60000); // 60 seconds TTL
  return banners;
}

export function invalidateBannerCache() {
  deleteCached(BANNER_CACHE_KEY);
}
