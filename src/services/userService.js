/**
 * services/userService.js
 * All user-related reads/writes.
 */

import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { batchWrite, writePath, updatePath } from "./rtdbService";
import { userSchema } from "../schema/schema";
import { emailToKey } from "../utils/emailKey";
import { normalizeMobile } from "../utils/normalizePhone";

/** Create a new user node if it doesn't already exist. */
export async function ensureUserRecord(firebaseUser, extraFields = {}) {
  if (!firebaseUser?.uid) return;

  const userRef = ref(db, `users/${firebaseUser.uid}`);
  const snap = await get(userRef);

  if (!snap.exists()) {
    const mob = extraFields.mobile
      ? normalizeMobile(extraFields.mobile)
      : null;

    const updates = {};

    // Full user node
    updates[`users/${firebaseUser.uid}`] = userSchema({
      email: firebaseUser.email || null,
      mobile: extraFields.mobile || null,
    });

    // Email index
    if (firebaseUser.email) {
      updates[`usersByEmail/${emailToKey(firebaseUser.email)}`] = firebaseUser.uid;
    }

    // Mobile index
    if (mob) {
      updates[`mobileIndex/${mob}/isUser`] = true;
      updates[`mobileIndex/${mob}/userUid`] = firebaseUser.uid;
    }

    await batchWrite(updates);

  } else if (extraFields.mobile && !snap.val()?.mobile) {
    // Existing user — mobile not yet saved
    const mob = normalizeMobile(extraFields.mobile);
    const updates = {};
    updates[`users/${firebaseUser.uid}/mobile`] = extraFields.mobile;
    if (mob) {
      updates[`mobileIndex/${mob}/isUser`] = true;
      updates[`mobileIndex/${mob}/userUid`] = firebaseUser.uid;
    }
    await batchWrite(updates);
  }
}

/** Write or overwrite the full user node. */
export async function writeUser(uid, data) {
  await writePath(`users/${uid}`, data);
}

/** Partially update a user node. */
export async function updateUser(uid, data) {
  await updatePath(`users/${uid}`, data);
}

/** Write the usersByEmail index. */
export async function writeUserEmailIndex(email, uid) {
  await writePath(`usersByEmail/${emailToKey(email)}`, uid);
}

/** Get user data by UID with emailKey fallback for migrating old records. */
export async function getUserData(uid, email = null) {
  let userData = {};

  const snap = await get(ref(db, `users/${uid}`));
  if (snap.exists()) {
    userData = snap.val();
  } else if (email) {
    // Fallback for old data stored by emailKey
    const emailSnap = await get(ref(db, `users/${emailToKey(email)}`));
    if (emailSnap.exists()) {
      userData = emailSnap.val();
      // Auto-migrate: write under UID for future use
      await writeUser(uid, { ...userData, email });
    }
  }

  return userData;
}

/** Link a user to a family after PIN verification. */
export async function linkUserToFamily({ uid, familyId, memberId, mobile, email, ts = Date.now() }) {
  const updates = {};

  updates[`users/${uid}/familyId`] = familyId;
  updates[`users/${uid}/role`]     = "member";
  updates[`users/${uid}/status`]   = "active";
  if (memberId) updates[`users/${uid}/memberId`] = memberId;

  if (memberId) {
    updates[`families/${familyId}/members/${memberId}`] = true;
    updates[`members/${memberId}/linkedUid`] = uid;
    if (email) updates[`members/${memberId}/email`] = email;
    updates[`members/${memberId}/updatedAt`] = ts;
  }

  if (email) {
    updates[`usersByEmail/${emailToKey(email)}`] = uid;
  }

  if (mobile) {
    const mob = normalizeMobile(mobile);
    if (mob) {
      updates[`mobileIndex/${mob}/isUser`]  = true;
      updates[`mobileIndex/${mob}/userUid`] = uid;
    }
  }

  await batchWrite(updates);
}
