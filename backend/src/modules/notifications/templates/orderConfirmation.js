import { wrapEmailLayout } from "./layout.js";

export function renderOrderConfirmationEmail({
  attendeeName,
  orderNumber,
  eventTitle,
  venueName,
  eventDate,
  ticketTypeName,
  quantity,
  totalAud,
  viewTicketsUrl
}) {
  const content = `
    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin-top: 0;">You're Going to ${eventTitle}!</h1>
    <p>Hi ${attendeeName},</p>
    <p>Thank you for your purchase. Your payment was confirmed and your tickets have been reserved.</p>
    
    <div style="background-color: #0f172a; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
      <h2 style="font-size: 16px; color: #818cf8; margin-top: 0; text-transform: uppercase; letter-spacing: 0.5px;">Order Details</h2>
      <p style="margin: 6px 0;"><strong>Order Reference:</strong> <span style="font-family: monospace; color: #a5f3fc;">${orderNumber}</span></p>
      <p style="margin: 6px 0;"><strong>Event:</strong> ${eventTitle}</p>
      <p style="margin: 6px 0;"><strong>Venue:</strong> ${venueName}</p>
      <p style="margin: 6px 0;"><strong>Date & Time:</strong> ${eventDate}</p>
      <p style="margin: 6px 0;"><strong>Tier:</strong> ${ticketTypeName} &times; ${quantity}</p>
      <p style="margin: 6px 0; font-size: 16px; color: #34d399;"><strong>Total Paid:</strong> A$${totalAud}</p>
    </div>

    <p style="text-align: center;">
      <a href="${viewTicketsUrl}" class="btn">View & Print My Tickets</a>
    </p>

    <p style="color: #94a3b8; font-size: 13px;">Please have your digital tickets or printed barcodes ready at the gate for scanning.</p>
  `;

  return {
    subject: `Your Tickets for ${eventTitle} (Order ${orderNumber})`,
    html: wrapEmailLayout({
      title: "Order Confirmation",
      content,
      preheader: `Your tickets for ${eventTitle} are confirmed! Order: ${orderNumber}`
    }),
    text: `Your tickets for ${eventTitle} are confirmed!\nOrder Reference: ${orderNumber}\nVenue: ${venueName}\nDate: ${eventDate}\nTier: ${ticketTypeName} x ${quantity}\nTotal Paid: A$${totalAud}\nView Tickets: ${viewTicketsUrl}`
  };
}
