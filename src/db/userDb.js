// db/userDb.js
// mobile on users node = ALWAYS fullMobile "+91XXXXXXXXXX"

import { rtdb }                  from "./rtdb";
import { userDoc }               from "./schema";
import { emailToKey }            from "../lib/text";
import { toMobileKey, toFullMobile } from "../lib/phone";
import { buildMobileIndexWrites } from "./mobileIndexDb";

/** Create user node if it doesn't exist yet. */
export async function ensureUser(firebaseUser, extra = {}) {
  if (!firebaseUser?.uid) return;

  const cc          = extra.countryCode || "+91";
  const full        = extra.mobile      || null;   // must be fullMobile if provided
  const displayName = extra.displayName || firebaseUser.displayName || null;

  const existing = await rtdb.get(`users/${firebaseUser.uid}`);
  if (!existing) {
    const writes = {};
    writes[`users/${firebaseUser.uid}`] = userDoc({
      displayName,
      email:       firebaseUser.email || null,
      mobile:      full,
      countryCode: cc,
    });
    if (firebaseUser.email) {
      writes[`usersByEmail/${emailToKey(firebaseUser.email)}`] = firebaseUser.uid;
    }
    if (full) {
      Object.assign(writes, buildMobileIndexWrites(full, cc, {
        isUser: true, userUid: firebaseUser.uid,
      }));
    }
    await rtdb.batch(writes);

  } else if (full && !existing.mobile) {
    const writes = {};
    writes[`users/${firebaseUser.uid}/mobile`]      = full;
    writes[`users/${firebaseUser.uid}/countryCode`] = cc;
    Object.assign(writes, buildMobileIndexWrites(full, cc, {
      isUser: true, userUid: firebaseUser.uid,
    }));
    await rtdb.batch(writes);
  }
}

/** Fetch user data. Falls back to email-key for old records. */
export async function getUser(uid, email = null) {
  const data = await rtdb.get(`users/${uid}`);
  if (data) return data;
  if (email) {
    const old = await rtdb.get(`users/${emailToKey(email)}`);
    if (old) { await rtdb.set(`users/${uid}`, { ...old, email }); return { ...old, email }; }
  }
  return {};
}

/**
 * Link a user to a family after PIN verification.
 * fullMobile must be "+91XXXXXXXXXX" format.
 */
export async function linkUserToFamily({ uid, familyId, memberId, fullMobile, countryCode, email, ts = Date.now() }) {
  const cc = countryCode || "+91";
  const writes = {};

  writes[`users/${uid}/familyId`]    = familyId;
  writes[`users/${uid}/role`]        = "member";
  writes[`users/${uid}/status`]      = "active";
  if (memberId)   writes[`users/${uid}/memberId`]    = memberId;
  if (fullMobile) writes[`users/${uid}/mobile`]      = fullMobile;  // fullMobile always
  if (cc)         writes[`users/${uid}/countryCode`] = cc;

  if (memberId) {
    writes[`families/${familyId}/members/${memberId}`] = true;
    writes[`members/${memberId}/linkedUid`]            = uid;
    if (email) writes[`members/${memberId}/email`]     = email;
    writes[`members/${memberId}/updatedAt`]            = ts;
  }
  if (email) writes[`usersByEmail/${emailToKey(email)}`] = uid;

  if (fullMobile) {
    Object.assign(writes, buildMobileIndexWrites(fullMobile, cc, {
      isUser: true, userUid: uid,
      memberId, familyId,
    }));
    // Mark connector as joined
    const connKey = toMobileKey(fullMobile);  // still full number
    const conn  = await rtdb.get(`connectors/${connKey}`);
    if (conn) {
      writes[`connectors/${connKey}/joinedUserId`] = uid;
      writes[`connectors/${connKey}/joinedAt`]   = ts;
    }
  }

  await rtdb.batch(writes);
}