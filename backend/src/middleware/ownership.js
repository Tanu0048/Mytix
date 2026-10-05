import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";

export async function checkEventOwnership(req, _res, next) {
  if (req.user?.role === "ADMIN") {
    return next();
  }

  const eventId = req.params.id || req.params.eventId;
  if (!eventId) {
    return next(new AppError("VALIDATION_ERROR", 400, "Event ID parameter is required."));
  }

  const organiser = await prisma.organiser.findUnique({
    where: { userId: req.user.id }
  });

  if (!organiser) {
    return next(new AppError("FORBIDDEN", 403, "Organiser profile not found for this user."));
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organiserId: true }
  });

  if (!event) {
    return next(new AppError("NOT_FOUND", 404, "Event not found."));
  }

  if (event.organiserId !== organiser.id) {
    return next(new AppError("FORBIDDEN", 403, "You do not own this event."));
  }

  req.organiser = organiser;
  next();
}
