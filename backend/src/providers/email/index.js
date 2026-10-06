import { ResendEmailProvider } from "./resendEmail.js";

// Currently active email provider adapter
const emailInstance = new ResendEmailProvider();

/**
 * Returns the currently active email provider instance.
 * @returns {import("./email.interface.js").EmailProvider}
 */
export function getEmailProvider() {
  return emailInstance;
}

export { EmailProvider } from "./email.interface.js";
