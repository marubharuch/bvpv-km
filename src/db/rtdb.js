// db/rtdb.js — Firebase Realtime Database wrapper
// Provides a simple get/set/update/remove API used throughout the tree system.

import { getDatabase, ref, get, set, update, remove, push } from 'firebase/database';

/**
 * Thin wrapper around Firebase RTDB.
 * Usage:
 *   await rtdb.get('users/abc123')         → data or null
 *   await rtdb.set('users/abc123', data)
 *   await rtdb.update('trees/XYZ', patch)
 *   await rtdb.remove('trees/XYZ/nodes/n1')
 *   const key = await rtdb.push('trees/XYZ/nodes', data)
 */
export const rtdb = {
  /** Read a path. Returns data or null. */
  async get(path) {
    const db       = getDatabase();
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : null;
  },

  /** Write (overwrite) a path. */
  async set(path, data) {
    const db = getDatabase();
    await set(ref(db, path), data);
  },

  /** Merge-update a path (shallow patch). */
  async update(path, data) {
    const db = getDatabase();
    await update(ref(db, path), data);
  },

  /** Delete a path. */
  async remove(path) {
    const db = getDatabase();
    await remove(ref(db, path));
  },

  /**
   * Push a new child under path (auto-generated key).
   * Returns the new key string.
   */
  async push(path, data) {
    const db      = getDatabase();
    const newRef  = push(ref(db, path));
    await set(newRef, data);
    return newRef.key;
  },
};
