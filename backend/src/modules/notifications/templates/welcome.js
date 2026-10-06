import { wrapEmailLayout } from "./layout.js";

export function renderWelcomeEmail({ name, exploreUrl }) {
  const content = `
    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin-top: 0;">Welcome to MYTIX, ${name}!</h1>
    <p>Your account has been created successfully. You can now explore Australia's premier live events, concerts, and festivals.</p>
    <p>Enjoy instant ticketing, guaranteed authentic entries, and transparent AUD pricing with zero surprise booking fees.</p>
    <p style="text-align: center;">
      <a href="${exploreUrl}" class="btn">Explore Upcoming Events</a>
    </p>
    <p style="color: #94a3b8; font-size: 14px;">If you did not sign up for this account, you can safely ignore this email.</p>
  `;

  return {
    subject: "Welcome to MYTIX Australia",
    html: wrapEmailLayout({
      title: "Welcome to MYTIX",
      content,
      preheader: `Welcome to MYTIX, ${name}! Your account is ready.`
    }),
    text: `Welcome to MYTIX, ${name}!\n\nYour account has been created successfully. Explore upcoming events at: ${exploreUrl}`
  };
}
