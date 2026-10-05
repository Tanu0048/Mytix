import { z } from "zod";
import { ORDER_LIMITS } from "../../config/constants.js";

export const createHoldSchema = z.object({
  ticketTypeId: z.string().uuid({ message: "Invalid ticket type ID format" }),
  quantity: z
    .coerce
    .number()
    .int({ message: "Quantity must be an integer" })
    .min(ORDER_LIMITS.MIN_TICKETS, { message: `Minimum quantity is ${ORDER_LIMITS.MIN_TICKETS}` })
    .max(ORDER_LIMITS.MAX_TICKETS, { message: `Maximum quantity is ${ORDER_LIMITS.MAX_TICKETS}` })
});

export const holdIdParamSchema = z.object({
  id: z.string().uuid({ message: "Invalid hold ID format" })
});
