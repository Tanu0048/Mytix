import { LRUCache } from "lru-cache";

export const memoryCache = new LRUCache({
  max: 2000,
  ttl: 1000 * 15, // 15 seconds default TTL
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false
});

export function getCached(key) {
  return memoryCache.get(key);
}

export function setCached(key, value, ttlMs) {
  memoryCache.set(key, value, { ttl: ttlMs });
}

export function deleteCached(key) {
  memoryCache.delete(key);
}

export function clearCache() {
  memoryCache.clear();
}
