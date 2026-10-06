import { z } from "zod";

export const getEventsQuerySchema = {
  query: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    category: z.string().optional(),
    artistId: z.string().uuid().optional(),
    venueId: z.string().uuid().optional(),
    organiserId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    sort: z.enum(["date_asc", "date_desc", "newest"]).default("date_asc"),
    upcoming: z.coerce.boolean().optional(),
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().min(1).max(50).default(20)
  })
};

export const slugParamSchema = {
  params: z.object({
    slug: z.string().min(1, "Slug parameter is required.")
  })
};
