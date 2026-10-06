import { z } from "zod";

export const createBannerSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  imageUrl: z.string().min(1, "Image URL is required"),
  targetUrl: z.string().max(512).optional().nullable(),
  eventId: z.string().uuid("Invalid event ID format").optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});

export const updateBannerSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  imageUrl: z.string().min(1).optional(),
  targetUrl: z.string().max(512).optional().nullable(),
  eventId: z.string().uuid("Invalid event ID format").optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

export const updateOrganiserStatusSchema = z.object({
  status: z.enum(["APPROVED", "SUSPENDED"], {
    errorMap: () => ({ message: "Status must be either APPROVED or SUSPENDED" })
  })
});

export const createOrganiserSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Valid email address is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  businessName: z.string().min(1, "Business name is required").max(255),
  contactPhone: z.string().max(32).optional().nullable()
});

export const resetOrganiserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
});

export const listOrganisersQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional()
});

export const listOrdersQuerySchema = z.object({
  query: z.string().optional(),
  email: z.string().optional(),
  eventId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "PAID", "FAILED", "EXPIRED", "CANCELLED", "REFUNDED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional()
});
