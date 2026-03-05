// db/rtdb.js — ONLY file that imports Firebase write methods.
// All other files call these functions. Never import set/update/push elsewhere.

import { ref, get, set, update, push, remove } from "firebase/database";
import { db } from "../lib/firebase";

export const rtdb = {
  /** Atomic multi-path write. */
  batch:  (updates) => update(ref(db), updates),
  /** Set (overwrite) a path. */
  set:    (path, data) => set(ref(db, path), data),
  /** Partial update (merge) at path. */
  update: (path, data) => update(ref(db, path), data),
  /** Push new child, return key. */
  push:   async (path, data) => {
    const r = push(ref(db, path));
    if (data !== undefined) await set(r, data);
    return r.key;
  },
  /** Remove a node. */
  remove: (path) => remove(ref(db, path)),
  /** One-time read. */
  get:    async (path) => {
    const snap = await get(ref(db, path));
    return snap.exists() ? snap.val() : null;
  },
  /** One-time read returning { key, val } pairs for a list. */
  getList: async (path) => {
    const snap = await get(ref(db, path));
    if (!snap.exists()) return [];
    const items = [];
    snap.forEach(child => items.push({ id: child.key, ...child.val() }));
    return items;
  },
};
