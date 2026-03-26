// db/userDb.js
// v3.0 — mobileIndexDb dependency removed (zero data, not needed)
// mobile = ALWAYS fullMobile "+91XXXXXXXXXX"

import { rtdb }                      from "./rtdb";
import { userDoc }                   from "./schema";
import { emailToKey }                from "../lib/text";
import { toFullMobile }              from "../lib/phone";

/** Create user node if it doesn't exist yet. */
export async function ensureUser(firebaseUser, extra = {}) {
  if (!firebaseUser?.uid) return;

  const cc          = extra.countryCode || "+91";
  const full        = extra.mobile      || null;
  const displayName = extra.displayName || firebaseUser.displayName || null;

  const existing = await rtdb.get(`users/${firebaseUser.uid}`);

  if (!existing) {
    const writes = {};
    writes[`users/${firebaseUser.uid}`] = userDoc({
      displayName,
      email:       firebaseUser.email || null,
      phone:       full,
      countryCode: cc,
    });
    if (firebaseUser.email) {
      writes[`usersByEmail/${emailToKey(firebaseUser.email)}`] = firebaseUser.uid;
    }
    await rtdb.batch(writes);
  } else {
    // Patch missing fields only
    const writes = {};
    if (displayName && !existing.displayName)
      writes[`users/${firebaseUser.uid}/displayName`] = displayName;
    if (full && !existing.phone) {
      writes[`users/${firebaseUser.uid}/phone`]       = full;
      writes[`users/${firebaseUser.uid}/countryCode`] = cc;
    }
    if (Object.keys(writes).length) await rtdb.batch(writes);
  }
}

/** Save phone to existing user node. */
export async function saveUserMobile(uid, fullMobile, countryCode = "+91") {
  if (!uid || !fullMobile) return;
  await rtdb.update(`users/${uid}`, {
    phone:       fullMobile,
    countryCode: countryCode,
    updatedAt:   Date.now(),
  });
}

/** Fetch user data. */
export async function getUser(uid, email = null) {
  const data = await rtdb.get(`users/${uid}`);
  if (data) return data;

  // Fallback for old email-key records
  if (email) {
    const old = await rtdb.get(`users/${emailToKey(email)}`);
    if (old) {
      await rtdb.set(`users/${uid}`, { ...old, email });
      return { ...old, email };
    }
  }
  return {};
}

/**
 * Link a user to a family.
 * Called after invite accepted + registration.
 */
export async function linkUserToFamily({ uid, familyId, memberId, fullMobile, countryCode, email, ts = Date.now() }) {
  const cc = countryCode || "+91";
  const writes = {};

  writes[`users/${uid}/familyId`]  = familyId;
  writes[`users/${uid}/role`]      = "member";
  writes[`users/${uid}/status`]    = "active";
  writes[`users/${uid}/updatedAt`] = ts;

  if (memberId)   writes[`users/${uid}/memberId`]    = memberId;
  if (fullMobile) writes[`users/${uid}/phone`]       = fullMobile;
  if (cc)         writes[`users/${uid}/countryCode`] = cc;
  if (email)      writes[`usersByEmail/${emailToKey(email)}`] = uid;

  // Add familyId to familyIds array
  const existing = await rtdb.get(`users/${uid}`);
  const existingFamilyIds = existing?.familyIds || [];
  if (!existingFamilyIds.includes(familyId)) {
    writes[`users/${uid}/familyIds`] = [...existingFamilyIds, familyId];
  }

  await rtdb.batch(writes);
}