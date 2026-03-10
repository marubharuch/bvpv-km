// utils/migration.js
// ─────────────────────────────────────────────────────────────────────────────
// One-shot migration from old vanshTrees/{uid} to families/{familyId}.
// Call migrateIfNeeded(uid) on app startup — it's idempotent.
// ─────────────────────────────────────────────────────────────────────────────

import { doc, getDoc } from "firebase/firestore";
import { firestore }   from "../lib/firebase";
import {
  migrateOldTree,
  getUserFamilyPointer,
} from "../db/familyTreeDb";

/** Returns the user's { familyId, memberId } pointer, migrating if needed. */
export async function migrateIfNeeded(uid) {
  if (!uid) return null;

  // 1. Already migrated?
  const existing = await getUserFamilyPointer(uid);
  if (existing?.familyId) {
    return existing;
  }

  // 2. Check for legacy vanshTrees/{uid} doc
  const legacySnap = await getDoc(doc(firestore, "vanshTrees", uid));
  if (!legacySnap.exists()) {
    return null; // new user — no migration needed
  }

  // 3. Migrate
  console.log("🔄 Migrating legacy tree for", uid);
  const oldData = legacySnap.data();
  const result  = await migrateOldTree(uid, oldData);
  console.log("✅ Migrated to familyId:", result.familyId);
  return result;
}
