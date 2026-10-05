import { z } from "zod";

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters long.").max(128)
  })
};

export const updateProfileSchema = {
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().max(32).optional()
  })
};

export const followArtistSchema = {
  body: z.object({
    artistId: z.string().uuid("A valid artist UUID is required.")
  })
};

export const paginationQuerySchema = {
  query: z.object({
    cursor: z.string().uuid("Cursor must be a valid UUID.").optional(),
    limit: z.coerce.number().min(1).max(100).default(20)
  })
};
