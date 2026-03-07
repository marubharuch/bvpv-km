// lib/cache.js — localForage wrapper with TTL support.
// TTL prevents stale data and reduces unnecessary Firebase reads.

import localForage from "localforage";

localForage.config({ name: "OswalApp", storeName: "app_cache" });

export const cache = {
  /** Get value. Returns null if missing or expired. */
  async get(key) {
    const entry = await localForage.getItem(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await localForage.removeItem(key);
      return null;
    }
    return entry.value;
  },

  /** Set value with optional TTL in milliseconds. */
  async set(key, value, ttlMs = null) {
    const entry = { value, expiresAt: ttlMs ? Date.now() + ttlMs : null };
    return localForage.setItem(key, entry);
  },

  /** Remove a key. */
  remove: (key) => localForage.removeItem(key),

  /** Clear all cache. */
  clear: () => localForage.clear(),
};

// Common TTLs
export const TTL = {
  AUTH:    10 * 60 * 1000,  // 10 min — user session
  FAMILY:   5 * 60 * 1000,  // 5 min  — family + members
  STATIC:  30 * 60 * 1000,  // 30 min — leaderboard, register list
};
