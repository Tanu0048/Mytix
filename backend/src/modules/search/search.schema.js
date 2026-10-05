import { z } from "zod";

export const searchSchema = {
  query: z.object({
    q: z.string().min(1, "Search query is required.").max(100)
  })
};
