import { createClient } from "@supabase/supabase-js";
import { StorageProvider } from "./storage.interface.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { AppError } from "../../utils/errors.js";

export class SupabaseStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.client = null;

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      });
    }
  }

  ensureClient() {
    if (!this.client) {
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false }
        });
      } else {
        throw new AppError(
          "STORAGE_NOT_CONFIGURED",
          500,
          "Supabase storage credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are not configured."
        );
      }
    }
    return this.client;
  }

  async upload({ bucket, path, fileBuffer, mimeType, isPublic = false }) {
    const supabase = this.ensureClient();

    const { error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });

    if (error) {
      logger.error("Failed to upload file to Supabase storage", {
        bucket,
        path,
        error: error.message
      });
      throw new AppError("STORAGE_UPLOAD_ERROR", 500, `Storage upload failed: ${error.message}`);
    }

    let url = null;
    if (isPublic) {
      url = this.getPublicUrl({ bucket, path });
    }

    return { path, url };
  }

  getPublicUrl({ bucket, path }) {
    const supabase = this.ensureClient();
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async createSignedUrl({ bucket, path, expiresInSeconds = 3600 }) {
    const supabase = this.ensureClient();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);

    if (error) {
      logger.error("Failed to generate signed URL from Supabase storage", {
        bucket,
        path,
        error: error.message
      });
      throw new AppError("STORAGE_SIGN_ERROR", 500, `Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async delete({ bucket, path }) {
    const supabase = this.ensureClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      logger.error("Failed to delete file from Supabase storage", {
        bucket,
        path,
        error: error.message
      });
      throw new AppError("STORAGE_DELETE_ERROR", 500, `Failed to delete file: ${error.message}`);
    }

    return true;
  }
}
