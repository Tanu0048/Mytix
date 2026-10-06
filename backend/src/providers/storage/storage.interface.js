/**
 * Abstract storage provider contract.
 * Any storage implementation (Supabase, S3, Cloudflare R2, GCS) must implement these methods.
 */
export class StorageProvider {
  /**
   * Upload a file buffer into a specified bucket.
   * @param {object} params
   * @param {string} params.bucket - Bucket name (e.g. "event-images" or "tickets")
   * @param {string} params.path - Destination key/path in bucket
   * @param {Buffer} params.fileBuffer - Raw file data
   * @param {string} params.mimeType - MIME content type
   * @param {boolean} [params.isPublic] - Whether file is publicly readable
   * @returns {Promise<{ path: string, url?: string }>}
   */
  async upload(_params) {
    throw new Error("Method upload() must be implemented.");
  }

  /**
   * Retrieve the public CDN URL for an item in a public bucket.
   * @param {object} params
   * @param {string} params.bucket
   * @param {string} params.path
   * @returns {string} Publicly accessible URL
   */
  getPublicUrl(_params) {
    throw new Error("Method getPublicUrl() must be implemented.");
  }

  /**
   * Generate an expiring signed URL for an item in a private bucket.
   * @param {object} params
   * @param {string} params.bucket
   * @param {string} params.path
   * @param {number} [params.expiresInSeconds] - Expiration duration in seconds
   * @returns {Promise<string>} Temporary signed URL
   */
  async createSignedUrl(_params) {
    throw new Error("Method createSignedUrl() must be implemented.");
  }

  /**
   * Delete a file from a specified bucket.
   * @param {object} params
   * @param {string} params.bucket
   * @param {string} params.path
   * @returns {Promise<boolean>}
   */
  async delete(_params) {
    throw new Error("Method delete() must be implemented.");
  }
}
