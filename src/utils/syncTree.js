// utils/syncTree.js
// Handles all Firestore sync logic.
// Reads from localForage, writes to Firestore, updates metadata.
//
// KEY: uses treeId (not uid) as the Firestore document key
//      Firestore collection: trees/{treeId}
//      localForage key:      vanshTree_{treeId}

import { doc, setDoc, getDoc } from "firebase/firestore";
import { firestore }           from "../lib/firebase";
import {
  getLocalTree, getMeta, markSynced,
  cacheFromFirestore,
} from "./localTree";

// ── Firestore ref — trees/{treeId} ───────────────────────────────────────────
const treeRef = (treeId) => doc(firestore, "trees", treeId);

// ── Push local → Firestore ────────────────────────────────────────────────────
export async function pushToFirestore(treeId) {
  const tree = await getLocalTree(treeId);
  if (!tree) throw new Error("No local tree to push");

  await setDoc(treeRef(treeId), {
    ...tree,
    updatedAt: Date.now(),
  });

  await markSynced(treeId);
  return true;
}

// ── Pull Firestore → local ────────────────────────────────────────────────────
export async function pullFromFirestore(treeId) {
  const snap = await getDoc(treeRef(treeId));
  if (!snap.exists()) return null;

  const data = snap.data();
  await cacheFromFirestore(treeId, data);
  return data;
}

// ── Smart load on app start ───────────────────────────────────────────────────
// Decision logic:
//   1. No local data      → pull from Firestore
//   2. isDirty = true     → use local (unsaved changes), schedule sync
//   3. isDirty = false    → compare timestamps, use newer
export async function smartLoad(treeId) {
  const [localTree, meta] = await Promise.all([
    getLocalTree(treeId),
    getMeta(treeId),
  ]);

  // No local data — fetch from Firestore
  if (!localTree) {
    const remote = await pullFromFirestore(treeId);
    return { tree: remote, source: "firestore" };
  }

  // Dirty local changes — use local, sync later
  if (meta.isDirty) {
    return { tree: localTree, source: "local_dirty" };
  }

  // Compare timestamps
  try {
    const snap = await getDoc(treeRef(treeId));
    if (!snap.exists()) return { tree: localTree, source: "local" };

    const remote     = snap.data();
    const remoteTime = remote.updatedAt  || 0;
    const localTime  = meta.lastSyncedAt || 0;

    if (remoteTime > localTime) {
      await cacheFromFirestore(treeId, remote);
      return { tree: remote, source: "firestore_newer" };
    }

    return { tree: localTree, source: "local_fresh" };
  } catch (e) {
    console.warn("syncTree: offline, using local data", e.message);
    return { tree: localTree, source: "local_offline" };
  }
}

// ── Auto sync with debounce ───────────────────────────────────────────────────
let syncTimer = null;

export function scheduleSyncDebounced(treeId, delayMs = 30_000) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    if (!navigator.onLine) return;
    try {
      await pushToFirestore(treeId);
      console.log("✅ Auto-synced to Firestore");
    } catch (e) {
      console.warn("⚠️ Auto-sync failed:", e.message);
    }
  }, delayMs);
}

// ── Online event sync ─────────────────────────────────────────────────────────
export function registerOnlineSync(treeId, onSynced) {
  const handler = async () => {
    const meta = await getMeta(treeId);
    if (!meta.isDirty) return;
    try {
      await pushToFirestore(treeId);
      console.log("✅ Online sync complete");
      onSynced?.();
    } catch (e) {
      console.warn("⚠️ Online sync failed:", e.message);
    }
  };
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}

// ── Visibility sync ───────────────────────────────────────────────────────────
export function registerVisibilitySync(treeId, onSynced) {
  const handler = async () => {
    if (document.visibilityState !== "visible") return;
    if (!navigator.onLine) return;
    const meta = await getMeta(treeId);
    if (!meta.isDirty) return;
    try {
      await pushToFirestore(treeId);
      onSynced?.();
    } catch (e) {
      console.warn("⚠️ Visibility sync failed:", e.message);
    }
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}