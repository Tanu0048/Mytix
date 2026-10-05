import { prisma } from "../../lib/prisma.js";

function formatTsQuery(input) {
  const tokens = input
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((token) => `${token}:*`).join(" & ");
}

export async function searchAll(rawQuery) {
  const q = rawQuery.trim();
  const tsQuery = formatTsQuery(q);
  const now = new Date();

  const eventOr = [
    { title: { contains: q, mode: "insensitive" } },
    { description: { contains: q, mode: "insensitive" } },
    { category: { contains: q, mode: "insensitive" } }
  ];

  const artistOr = [
    { name: { contains: q, mode: "insensitive" } },
    { bio: { contains: q, mode: "insensitive" } }
  ];

  const venueOr = [
    { name: { contains: q, mode: "insensitive" } },
    { city: { contains: q, mode: "insensitive" } },
    { state: { contains: q, mode: "insensitive" } }
  ];

  if (tsQuery) {
    eventOr.push(
      { title: { search: tsQuery } },
      { description: { search: tsQuery } }
    );
    artistOr.push(
      { name: { search: tsQuery } },
      { bio: { search: tsQuery } }
    );
    venueOr.push(
      { name: { search: tsQuery } }
    );
  }

  const [events, artists, venues] = await Promise.all([
    prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { gte: now },
        OR: eventOr
      },
      take: 10,
      include: {
        venue: { select: { name: true, city: true } },
        ticketTypes: { select: { priceCents: true } }
      }
    }),

    prisma.artist.findMany({
      where: {
        OR: artistOr
      },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        imagePath: true
      }
    }),

    prisma.venue.findMany({
      where: {
        OR: venueOr
      },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true
      }
    })
  ]);

  return {
    query: q,
    results: {
      events,
      artists,
      venues
    }
  };
}
