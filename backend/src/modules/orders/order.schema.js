import { z } from "zod";

export const getOrderParamsSchema = {
  params: z.object({
    orderNumber: z.string().min(5, "A valid order number is required.")
  })
};
