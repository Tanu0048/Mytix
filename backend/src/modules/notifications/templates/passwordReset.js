import { wrapEmailLayout } from "./layout.js";

export function renderPasswordResetEmail({ name, resetUrl, expirationMinutes = 30 }) {
  const content = `
    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin-top: 0;">Password Reset Request</h1>
    <p>Hi ${name || "there"},</p>
    <p>We received a request to reset your MYTIX account password. Tap the button below to choose a new password.</p>
    
    <p style="text-align: center;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </p>

    <p style="color: #cbd5e1; font-size: 14px;">This link will expire in <strong>${expirationMinutes} minutes</strong> and can only be used once.</p>
    <p style="color: #94a3b8; font-size: 13px;">If you did not request a password reset, no action is needed; your account remains secure.</p>
  `;

  return {
    subject: "Reset Your MYTIX Password",
    html: wrapEmailLayout({
      title: "Password Reset",
      content,
      preheader: "Reset your MYTIX account password."
    }),
    text: `Password reset request for MYTIX.\n\nReset your password within ${expirationMinutes} minutes using this link:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`
  };
}
