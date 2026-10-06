import { z } from "zod";
import { ORDER_LIMITS } from "../../config/constants.js";

export const attendeeSchema = z.object({
  name: z.string().min(2, "Attendee name must be at least 2 characters long.").max(128),
  email: z.string().email("A valid attendee email is required.")
});

export const checkoutSchema = {
  body: z.object({
    holdId: z.string().uuid("Invalid hold ID format."),
    attendees: z
      .array(attendeeSchema)
      .min(ORDER_LIMITS.MIN_TICKETS, `At least ${ORDER_LIMITS.MIN_TICKETS} attendee must be specified.`)
      .max(ORDER_LIMITS.MAX_TICKETS, `Maximum of ${ORDER_LIMITS.MAX_TICKETS} attendees allowed.`)
  })
};
