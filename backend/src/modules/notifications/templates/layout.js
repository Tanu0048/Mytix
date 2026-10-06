/**
 * Base email layout wrapper providing responsive typography, clean dark/light styling, and brand footer.
 */
export function wrapEmailLayout({ title, content, preheader = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0f172a;
      padding: 40px 10px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1e293b;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .header {
      padding: 28px 32px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      text-align: left;
    }
    .brand {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-decoration: none;
    }
    .body-content {
      padding: 32px;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background-color: #6366f1;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      padding: 24px 32px;
      background-color: #0f172a;
      border-top: 1px solid #334155;
      font-size: 13px;
      color: #94a3b8;
      text-align: center;
    }
    .footer a {
      color: #818cf8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preheader}
  </div>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="wrapper">
    <tr>
      <td align="center">
        <div class="container">
          <div class="header">
            <span class="brand">MYTIX</span>
          </div>
          <div class="body-content">
            ${content}
          </div>
          <div class="footer">
            <p>Sent by MYTIX Australia &bull; Secure Event Ticketing</p>
            <p>Need support? Contact us at <a href="mailto:support@mytix.com.au">support@mytix.com.au</a></p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
