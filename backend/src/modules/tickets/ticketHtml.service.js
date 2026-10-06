/**
 * Renders a standalone, responsive dynamic HTML E-Ticket with embedded QR Code.
 * Designed with @media print CSS for pixel-perfect browser Print-to-PDF with ZERO external libraries.
 */
export function renderTicketHtml({
  ticketId,
  orderNumber,
  eventTitle,
  eventCategory,
  venueName,
  venueAddress,
  eventDate,
  ticketTypeName,
  unitPriceAud,
  attendeeName,
  attendeeEmail,
  qrCodeDataUri,
  status = "VALID"
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket - ${eventTitle} - ${attendeeName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #0b0f19;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 30px 15px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }

    .action-bar {
      width: 100%;
      max-width: 650px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .back-link {
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }

    .print-button {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #ffffff;
      border: none;
      padding: 10px 22px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
      transition: all 0.2s ease;
    }

    .print-button:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }

    .ticket-container {
      width: 100%;
      max-width: 650px;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      position: relative;
    }

    .ticket-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #ffffff;
      padding: 28px 32px;
      position: relative;
    }

    .header-badge {
      display: inline-block;
      background: rgba(99, 102, 241, 0.25);
      border: 1px solid rgba(129, 140, 248, 0.4);
      color: #a5b4fc;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 12px;
    }

    .event-title {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 6px;
      color: #ffffff;
    }

    .ticket-body {
      padding: 32px;
      background: #ffffff;
    }

    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px 24px;
      margin-bottom: 28px;
    }

    .info-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .info-value {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    .perforation {
      position: relative;
      border-top: 2px dashed #cbd5e1;
      margin: 24px -32px;
    }

    .perforation::before, .perforation::after {
      content: '';
      position: absolute;
      top: -12px;
      width: 24px;
      height: 24px;
      background-color: #0b0f19;
      border-radius: 50%;
    }

    .perforation::before {
      left: -12px;
    }

    .perforation::after {
      right: -12px;
    }

    .qr-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding-top: 8px;
    }

    .qr-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 10px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .qr-box img {
      width: 160px;
      height: 160px;
      display: block;
    }

    .qr-meta {
      flex: 1;
    }

    .security-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #15803d;
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 5px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .ticket-id {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #64748b;
      word-break: break-all;
    }

    .status-stamp {
      display: inline-block;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      background-color: ${status === "VALID" ? "#dcfce7" : "#fee2e2"};
      color: ${status === "VALID" ? "#166534" : "#991b1b"};
      margin-top: 8px;
    }

    /* Print Specific Media Rules */
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm;
      }

      body {
        background: none !important;
        padding: 0 !important;
        min-height: auto !important;
      }

      .no-print {
        display: none !important;
      }

      .ticket-container {
        box-shadow: none !important;
        border: 1px solid #94a3b8 !important;
        page-break-inside: avoid;
        width: 100% !important;
        max-width: 100% !important;
      }

      .perforation::before, .perforation::after {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <span class="back-link">&larr; MYTIX Secure Ticket</span>
    <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="ticket-container">
    <div class="ticket-header">
      <span class="header-badge">${eventCategory || "LIVE EVENT"}</span>
      <h1 class="event-title">${eventTitle}</h1>
      <p style="color: #94a3b8; font-size: 14px;">Order Ref: <strong>${orderNumber}</strong></p>
    </div>

    <div class="ticket-body">
      <div class="grid-info">
        <div>
          <div class="info-label">Venue</div>
          <div class="info-value">${venueName}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${venueAddress}</div>
        </div>

        <div>
          <div class="info-label">Date & Time</div>
          <div class="info-value">${eventDate}</div>
        </div>

        <div>
          <div class="info-label">Attendee</div>
          <div class="info-value">${attendeeName}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${attendeeEmail}</div>
        </div>

        <div>
          <div class="info-label">Ticket Tier</div>
          <div class="info-value" style="color: #4f46e5;">${ticketTypeName}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Paid: A$${unitPriceAud}</div>
        </div>
      </div>

      <div class="perforation"></div>

      <div class="qr-section">
        <div class="qr-box">
          <img src="${qrCodeDataUri}" alt="Ticket Entry QR Code">
        </div>

        <div class="qr-meta">
          <div class="security-badge">
            &check; Ed25519 Cryptographically Signed
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">
            Scan at Turnstile Gate
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin-bottom: 8px;">
            Present this barcode on mobile or printout. Duplicate scans will be blocked automatically at the gate.
          </p>
          <div class="ticket-id">Ticket ID: ${ticketId}</div>
          <div class="status-stamp">${status}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
