import { prisma } from "../../lib/prisma.js";
import { getCached, setCached } from "../../lib/cache.js";
import { AppError } from "../../utils/errors.js";
import { formatPaginatedResponse } from "../../utils/pagination.js";

export async function listEvents(filters) {
  const {
    city,
    state,
    category,
    artistId,
    venueId,
    organiserId,
    startDate,
    endDate,
    sort,
    cursor,
    limit
  } = filters;

  const where = {
    status: "PUBLISHED"
  };

  if (city || state) {
    where.venue = {};
    if (city) where.venue.city = { equals: city, mode: "insensitive" };
    if (state) where.venue.state = { equals: state, mode: "insensitive" };
  }

  if (category) {
    where.category = { equals: category, mode: "insensitive" };
  }

  if (artistId) {
    where.artists = { some: { artistId } };
  }

  if (venueId) {
    where.venueId = venueId;
  }

  if (organiserId) {
    where.organiserId = organiserId;
  }

  const now = new Date();
  if (filters.upcoming === true || filters.upcoming === "true") {
    where.startsAt = { ...(where.startsAt || {}), gte: now };
  } else if (startDate || endDate) {
    where.startsAt = {};
    if (startDate) where.startsAt.gte = new Date(startDate);
    if (endDate) where.startsAt.lte = new Date(endDate);
  }

  let orderBy = [{ startsAt: "asc" }, { id: "asc" }];
  if (sort === "date_desc") orderBy = [{ startsAt: "desc" }, { id: "desc" }];
  if (sort === "newest") orderBy = [{ createdAt: "desc" }, { id: "desc" }];

  const events = await prisma.event.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy,
    include: {
      venue: { select: { id: true, name: true, city: true, state: true } },
      artists: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        }
      },
      ticketTypes: {
        select: { priceCents: true, available: true }
      }
    }
  });

  return formatPaginatedResponse(events, limit);
}

export async function listUpcomingEvents(filters) {
  const now = new Date();
  const effectiveStartDate = filters.startDate && new Date(filters.startDate) > now
    ? filters.startDate
    : now.toISOString();

  return listEvents({
    ...filters,
    startDate: effectiveStartDate,
    sort: filters.sort || "date_asc"
  });
}

export async function getEventDetails(slug) {
  const cacheKey = `event:${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      venue: true,
      organiser: {
        select: { id: true, businessName: true }
      },
      artists: {
        include: {
          artist: true
        }
      },
      ticketTypes: {
        orderBy: { priceCents: "asc" }
      }
    }
  });

  if (!event || event.status === "DRAFT") {
    throw new AppError("NOT_FOUND", 404, "Event not found.");
  }

  setCached(cacheKey, event, 15000); // 15 seconds TTL
  return event;
}

export async function getArtistDetails(slug) {
  const cacheKey = `artist:${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const now = new Date();

  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      events: {
        where: {
          event: { status: "PUBLISHED" }
        },
        include: {
          event: {
            include: {
              venue: { select: { name: true, city: true, state: true } },
              ticketTypes: { select: { priceCents: true, available: true } }
            }
          }
        },
        orderBy: { event: { startsAt: "asc" } }
      }
    }
  });

  if (!artist) {
    throw new AppError("NOT_FOUND", 404, "Artist not found.");
  }

  const upcomingEvents = [];
  const pastEvents = [];

  for (const item of artist.events) {
    if (item.event.startsAt >= now) {
      upcomingEvents.push(item.event);
    } else {
      pastEvents.push(item.event);
    }
  }

  const response = {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    bio: artist.bio,
    imagePath: artist.imagePath,
    upcomingEvents,
    pastEvents
  };

  setCached(cacheKey, response, 30000);
  return response;
}

export async function getVenueDetails(slug) {
  const cacheKey = `venue:${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const now = new Date();

  const venue = await prisma.venue.findUnique({
    where: { slug },
    include: {
      events: {
        where: {
          status: "PUBLISHED",
          startsAt: { gte: now }
        },
        orderBy: { startsAt: "asc" },
        include: {
          ticketTypes: { select: { priceCents: true, available: true } }
        }
      }
    }
  });

  if (!venue) {
    throw new AppError("NOT_FOUND", 404, "Venue not found.");
  }

  setCached(cacheKey, venue, 30000);
  return venue;
}

export async function getOrganiserDetails(idOrSlug) {
  const organiser = await prisma.organiser.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { businessName: { equals: idOrSlug, mode: "insensitive" } }],
      status: "APPROVED"
    },
    include: {
      events: {
        where: { status: "PUBLISHED" },
        orderBy: { startsAt: "asc" },
        include: {
          venue: { select: { name: true, city: true } }
        }
      }
    }
  });

  if (!organiser) {
    throw new AppError("NOT_FOUND", 404, "Organiser not found.");
  }

  return {
    id: organiser.id,
    businessName: organiser.businessName,
    events: organiser.events
  };
}

export async function listVenues() {
  const venues = await prisma.venue.findMany({
    orderBy: { name: 'asc' }
  });
  return venues;
}

export async function listArtists() {
  const artists = await prisma.artist.findMany({
    orderBy: { name: 'asc' }
  });
  return artists;
}
