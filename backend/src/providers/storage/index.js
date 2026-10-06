import { SupabaseStorageProvider } from "./supabaseStorage.js";

// Currently active storage provider adapter
const storageInstance = new SupabaseStorageProvider();

/**
 * Returns the currently active storage provider instance.
 * @returns {import("./storage.interface.js").StorageProvider}
 */
export function getStorageProvider() {
  return storageInstance;
}

export { StorageProvider } from "./storage.interface.js";
