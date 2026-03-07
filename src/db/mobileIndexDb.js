// db/mobileIndexDb.js
// KEY = toMobileKey(fullMobile) = "+919974021397" — full number as key

import { rtdb }        from "./rtdb";
import { toMobileKey } from "../lib/phone";

/** Return index entry or null. */
export async function getMobileIndex(mobile) {
  const key = toMobileKey(mobile);
  if (!key) return null;
  return rtdb.get(`mobileIndex/${key}`);
}

/**
 * Check if mobile belongs to a DIFFERENT family.
 * Returns { duplicate: false } or { duplicate: true, familyId, memberId }
 */
export async function checkDuplicateMobile(mobile, ownFamilyId = null) {
  const key  = toMobileKey(mobile);
  if (!key) return { duplicate: false };

  const data = await rtdb.get(`mobileIndex/${key}`);
  if (!data)  return { duplicate: false };

  const familyIds = Object.keys(data.familyIds || {});
  const other     = familyIds.find(fid => fid !== ownFamilyId);
  if (other) {
    const memberIds = Object.keys(data.memberIds || {});
    return { duplicate: true, familyId: other, memberId: memberIds[0] || null };
  }
  return { duplicate: false };
}

/**
 * Build mobileIndex writes for a batch.
 * @param {string} fullMobile   "+919974021397"
 * @param {string} countryCode  "+91"
 * @param {object} extra        { memberId, familyId, isUser, userUid, source }
 */
export function buildMobileIndexWrites(fullMobile, countryCode, extra = {}) {
  const key = toMobileKey(fullMobile);
  if (!key) return {};

  const writes = {};
  writes[`mobileIndex/${key}/countryCode`] = countryCode || "+91";

  if (extra.memberId) writes[`mobileIndex/${key}/memberIds/${extra.memberId}`] = true;
  if (extra.familyId) writes[`mobileIndex/${key}/familyIds/${extra.familyId}`] = true;
  if (extra.source)   writes[`mobileIndex/${key}/sources/${extra.source}`]     = true;
  if (extra.isUser)   writes[`mobileIndex/${key}/isUser`]                      = true;
  if (extra.userUid)  writes[`mobileIndex/${key}/userUid`]                     = extra.userUid;

  return writes;
}
