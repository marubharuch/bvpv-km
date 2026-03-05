/**
 * services/rtdbService.js
 * ─────────────────────────────────────────────────────────────────
 * ✅ SINGLE WRITE SOURCE — All RTDB writes go through this file only.
 *
 * Rules:
 *  • No other file should import { set, update, push, remove } from firebase/database
 *  • All other files call functions from THIS file to write data
 *  • Reads (get, onValue) are fine to keep wherever they are
 * ─────────────────────────────────────────────────────────────────
 */

import { ref, set, update, push, remove } from "firebase/database";
import { db } from  "../lib/firebase"

// ─────────────────────────────────────────────
// 🔧 PRIMITIVE WRITE HELPERS
// ─────────────────────────────────────────────

/** Atomic multi-path write. Pass a flat { "path/key": value } object. */
export async function batchWrite(updates) {
  await update(ref(db), updates);
}

/** Set a value at a specific path (overwrites). */
export async function writePath(path, data) {
  await set(ref(db, path), data);
}

/** Update (merge) a value at a specific path. */
export async function updatePath(path, data) {
  await update(ref(db, path), data);
}

/** Push a new child to a list path. Returns the new key. */
export async function pushToPath(path, data) {
  const newRef = push(ref(db, path));
  if (data !== undefined) await set(newRef, data);
  return newRef.key;
}

/** Remove a node at a specific path. */
export async function deletePath(path) {
  await remove(ref(db, path));
}
