/**
 * Abstract Email Provider contract.
 * Any email delivery system (Resend, AWS SES, Postmark, SendGrid) must implement this.
 */
export class EmailProvider {
  /**
   * Send a transactional email.
   * @param {object} params
   * @param {string|string[]} params.to - Recipient email address(es)
   * @param {string} params.subject - Email subject line
   * @param {string} params.html - Rendered HTML email body
   * @param {string} [params.text] - Plaintext alternative body
   * @param {string} [params.from] - Sender email address
   * @returns {Promise<{ id: string, success: boolean }>}
   */
  async sendEmail(_params) {
    throw new Error("Method sendEmail() must be implemented.");
  }
}
