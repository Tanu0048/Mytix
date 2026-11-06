import { z } from "zod";
import { ORDER_LIMITS } from "../../config/constants.js";

const holdItemSchema = z.object({
  ticketTypeId: z.string().uuid({ message: "Invalid ticket type ID format" }),
  quantity: z
    .coerce
    .number()
    .int({ message: "Quantity must be an integer" })
    .min(ORDER_LIMITS.MIN_TICKETS, { message: `Minimum quantity is ${ORDER_LIMITS.MIN_TICKETS}` })
    .max(ORDER_LIMITS.MAX_TICKETS, { message: `Maximum quantity is ${ORDER_LIMITS.MAX_TICKETS}` }),
  selectedSeats: z.array(z.string()).optional()
});

/**
 * Either one ticket category ({ ticketTypeId, quantity, selectedSeats }) or several in one
 * booking ({ items: [...] }, e.g. 2 VIP + 2 Standard seats).
 */
export const createHoldSchema = z.union([
  holdItemSchema,
  z
    .object({ items: z.array(holdItemSchema).min(1).max(10) })
    .refine((b) => b.items.reduce((sum, i) => sum + i.quantity, 0) <= ORDER_LIMITS.MAX_TICKETS, {
      message: `Maximum ${ORDER_LIMITS.MAX_TICKETS} tickets per booking`
    })
]);

export const holdIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid hold ID format" })
});
