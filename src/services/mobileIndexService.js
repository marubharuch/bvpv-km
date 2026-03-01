/**
 * services/mobileIndexService.js
 * All mobileIndex reads/writes.
 */

import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { batchWrite } from "./rtdbService";
import { normalizeMobile } from "../utils/normalizePhone";

/** Check if a mobile is in the index; return index data or null. */
export async function checkMobileIndex(mobile) {
  const mob = normalizeMobile(mobile);
  if (!mob) return null;

  const snap = await get(ref(db, `mobileIndex/${mob}`));
  return snap.exists() ? snap.val() : null;
}

/** Register a user's mobile in the index. */
export async function registerMobileForUser(mobile, uid) {
  const mob = normalizeMobile(mobile);
  if (!mob) return;

  await batchWrite({
    [`mobileIndex/${mob}/isUser`]:  true,
    [`mobileIndex/${mob}/userUid`]: uid,
  });
}
