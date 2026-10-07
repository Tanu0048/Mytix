import { z } from "zod";

export const applyOrganiserSchema = {
  body: z.object({
    businessName: z.string().min(2).max(255),
    abn: z.string().max(32).optional(),
    contactEmail: z.string().email(),
    contactPhone: z.string().max(32).optional(),
    payoutDetails: z.object({
      accountName: z.string(),
      bsb: z.string(),
      accountNumber: z.string()
    }).optional()
  })
};

export const createEventSchema = {
  body: z.object({
    title: z.string().min(3).max(255),
    description: z.string().min(10),
    venueId: z.string().uuid("A valid venue UUID is required."),
    category: z.string().default("Concert"),
    posterPath: z.string().max(512).optional(),
    startsAt: z.string().datetime(),
    doorsOpenAt: z.string().datetime().optional(),
    artists: z.array(z.object({
      artistId: z.string().uuid(),
      isHeadline: z.boolean().default(true)
    })).optional(),
    ticketTypes: z.array(z.object({
      name: z.string().min(1).max(128),
      priceCents: z.number().int().min(0),
      quantity: z.number().int().min(1),
      saleStartsAt: z.string().datetime(),
      saleEndsAt: z.string().datetime(),
      minPerOrder: z.number().int().min(1).default(1),
      maxPerOrder: z.number().int().min(1).default(10)
    })).min(1, "At least one ticket type must be defined.")
  })
};

export const updateEventSchema = {
  body: z.object({
    title: z.string().min(3).max(255).optional(),
    description: z.string().min(10).optional(),
    venueId: z.string().uuid().optional(),
    category: z.string().optional(),
    posterPath: z.string().max(512).optional(),
    status: z.string().optional(),
    startsAt: z.string().datetime().optional(),
    doorsOpenAt: z.string().datetime().optional()
  })
};

export const listOrganiserEventsQuerySchema = {
  query: z.object({
    cursor: z.string().uuid("Cursor must be a valid UUID.").optional(),
    limit: z.coerce.number().min(1).max(100).default(20)
  })
};

export const issueComplimentaryTicketsSchema = {
  body: z.object({
    ticketTypeId: z.string().uuid("A valid ticket tier UUID is required."),
    attendeeName: z.string().min(1, "Attendee name is required.").max(255),
    attendeeEmail: z.string().email("Valid attendee email is required."),
    quantity: z.number().int().min(1).max(50).default(1),
    notes: z.string().max(255).optional()
  })
};
