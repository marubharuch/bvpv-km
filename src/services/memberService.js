/**
 * services/memberService.js
 * FIX BUG 9 (minor): Honorary orgs only cleared when honoraryOrgs is
 * explicitly present in payload — prevents wiping on name/photo-only edits.
 *
 * SCHEMA FIXES:
 *  - saveMember():        honoraryIndexSchema now receives city field
 *  - saveMember():        photoURL gets ?v=timestamp so Leaders page cache
 *                         auto-invalidates on photo change
 *  - updateMemberPhoto(): photoURL written to honoraryIndex now also gets
 *                         ?v=timestamp for immediate cache bust
 */
import { ref, get, push } from "firebase/database";
import { db } from  "../lib/firebase"
import { batchWrite, updatePath } from "./rtdbService";
import { memberSchema, honoraryIndexSchema } from "../schema/schema";
import { normalizeMobile } from "../utils/normalizePhone";

export async function updateMember(memberId, data) {
  await updatePath(`members/${memberId}`, data);
}

export async function saveMember({ memberId, familyId, payload, isAdding, existingMember = {} }) {
  const ts     = Date.now();
  const writes = {};

  if (isAdding) {
    const newId = memberId || push(ref(db, "members")).key;
    writes[`members/${newId}`]                      = memberSchema({ ...payload, familyId, createdAt: ts });
    writes[`families/${familyId}/members/${newId}`] = true;
    memberId = newId;
  } else {
    writes[`members/${memberId}`] = {
      ...existingMember,
      ...payload,
      photoURL:  existingMember.photoURL || payload.photoURL || "",
      updatedAt: ts,
    };
  }

  // Mobile index
  if (payload.mobileKey || payload.mobile) {
    const mob = payload.mobileKey || normalizeMobile(payload.mobile);
    if (mob) {
      writes[`mobileIndex/${mob}/memberIds/${memberId}`] = true;
      writes[`mobileIndex/${mob}/familyIds/${familyId}`] = true;
      writes[`mobileIndex/${mob}/sources/manualAdd`]     = true;
      writes[`mobileIndex/${mob}/createdAt`]             = ts;
    }
  }

  // FIX BUG 9: Only clear-and-rewrite if honoraryOrgs is explicitly in payload
  if (payload.honoraryOrgs !== undefined) {
    const ALL_ORG_IDS = ["kadavani", "seva", "suraksha", "sthanik", "other"];
    ALL_ORG_IDS.forEach(orgId => {
      writes[`honoraryIndex/${orgId}/${memberId}`] = null;
    });

    const rawPhoto = payload.photoURL || existingMember?.photoURL || "";

    (payload.honoraryOrgs || []).forEach(entry => {
      if (!entry.orgId || !entry.post) return;
      writes[`honoraryIndex/${entry.orgId}/${memberId}`] = honoraryIndexSchema({
        memberId,
        familyId,
        memberName: payload.name,
        mobile:     payload.mobile,
        city:       payload.city || existingMember?.city || "",  // FIX: city added
        photoURL:   rawPhoto ? `${rawPhoto}?v=${ts}` : "",       // FIX: ?v=ts for cache bust
        post:       entry.post,
        orgName:    entry.name || "",
        updatedAt:  ts,
      });
    });
  }

  await batchWrite(writes);
  return memberId;
}

export async function updateMemberPhoto(memberId, photoURL) {
  const ts     = Date.now();
  const writes = {};

  writes[`members/${memberId}/photoURL`]  = photoURL;
  writes[`members/${memberId}/updatedAt`] = ts;

  const snap = await get(ref(db, `members/${memberId}`));
  const data = snap.exists() ? snap.val() : {};

  (data.honoraryOrgs || []).forEach(entry => {
    if (!entry.orgId || !entry.post) return;
    // FIX: append ?v=timestamp so About/Leaders page cache auto-invalidates
    writes[`honoraryIndex/${entry.orgId}/${memberId}/photoURL`]  = `${photoURL}?v=${ts}`;
    writes[`honoraryIndex/${entry.orgId}/${memberId}/updatedAt`] = ts;
  });

  await batchWrite(writes);
}