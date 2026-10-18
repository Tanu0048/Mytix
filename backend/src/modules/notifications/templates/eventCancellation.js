import { wrapEmailLayout } from "./layout.js";

export function renderEventCancellationEmail({
  recipientName,
  orderNumber,
  eventTitle,
  cancellationReason,
  refundAmountAud,
  currency = "AUD"
}) {
  const content = `
    <h1 style="color: #ef4444; font-size: 22px; font-weight: 700; margin-top: 0;">Event Cancelled: ${eventTitle}</h1>
    <p>Hi ${recipientName || "Valued Customer"},</p>
    <p>We regret to inform you that <strong>${eventTitle}</strong> has been cancelled.</p>
    
    <div style="background-color: #0f172a; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
      <h2 style="font-size: 16px; color: #f87171; margin-top: 0; text-transform: uppercase; letter-spacing: 0.5px;">Cancellation & Refund Notice</h2>
      <p style="margin: 6px 0;"><strong>Order Reference:</strong> <span style="font-family: monospace; color: #a5f3fc;">${orderNumber}</span></p>
      <p style="margin: 6px 0;"><strong>Event:</strong> ${eventTitle}</p>
      <p style="margin: 6px 0;"><strong>Cancellation Reason:</strong> ${cancellationReason}</p>
      <p style="margin: 6px 0; font-size: 16px; color: #34d399;"><strong>Refund Amount:</strong> ${currency} $${refundAmountAud}</p>
    </div>

    <div style="background-color: #1e293b; border-left: 4px solid #38bdf8; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; font-size: 14px; color: #e2e8f0;">
        <strong>Refund Timeline:</strong> A refund of $${refundAmountAud} ${currency} has been initiated to your original payment method. The funds will appear on your card statement within <strong>5–10 business days</strong>.
      </p>
    </div>

    <div style="background-color: #1e293b; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0;">
      <p style="margin: 0; font-size: 14px; color: #fca5a5;">
        <strong>Important Notice:</strong> All digital tickets and QR barcodes associated with Order ${orderNumber} have been deactivated and will no longer grant entry.
      </p>
    </div>

    <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If you have any questions or have not received your refund after 10 business days, please contact our support team with your order reference.</p>
  `;

  return {
    subject: `Event Cancelled: ${eventTitle} (Refund Initiated for Order ${orderNumber})`,
    html: wrapEmailLayout({
      title: "Event Cancelled & Refund Initiated",
      content,
      preheader: `Important: ${eventTitle} has been cancelled. A refund of $${refundAmountAud} has been initiated.`
    }),
    text: `Important Notice: ${eventTitle} has been cancelled.\n\nReason: ${cancellationReason}\nOrder Reference: ${orderNumber}\nRefund Amount: ${currency} $${refundAmountAud}\n\nThe refund has been initiated to your original payment method and will appear on your card statement within 5–10 business days.\n\nAll digital tickets and QR codes for this order have been deactivated.\n\nIf you have any questions, please contact support.`
  };
}
