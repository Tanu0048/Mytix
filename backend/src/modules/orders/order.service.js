import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/errors.js";

export async function getOrderByNumber(orderNumber, userId, userRole) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startsAt: true,
          venue: {
            select: {
              name: true,
              address: true,
              city: true,
              state: true
            }
          }
        }
      },
      items: {
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
              priceCents: true
            }
          }
        }
      },
      tickets: {
        select: {
          id: true,
          attendeeName: true,
          attendeeEmail: true,
          status: true
        }
      },
      payment: {
        select: {
          status: true,
          amountCents: true,
          createdAt: true
        }
      }
    }
  });

  if (!order) {
    throw new AppError("NOT_FOUND", 404, "Order not found.");
  }

  if (userRole !== "ADMIN" && order.userId !== userId) {
    throw new AppError("FORBIDDEN", 403, "You do not have permission to view this order.");
  }

  return order;
}
