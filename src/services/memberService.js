/**
 * services/memberService.js
 * All member-related reads/writes.
 */

import { ref, get, push } from "firebase/database";
import { db } from "../firebase";
import { batchWrite, updatePath } from "./rtdbService";
import { memberSchema, honoraryIndexSchema } from "../schema/schema";
import { normalizeMobile } from "../utils/normalizePhone";

/** Partially update a member node. */
export async function updateMember(memberId, data) {
  await updatePath(`members/${memberId}`, data);
}

/**
 * Save (add or edit) a member with full mobile index + honorary index sync.
 * Returns the memberId.
 */
export async function saveMember({ memberId, familyId, payload, isAdding, existingMember = {} }) {
  const ts = Date.now();
  const writes = {};

  if (isAdding) {
    const newId = memberId || push(ref(db, "members")).key;
    writes[`members/${newId}`] = memberSchema({ ...payload, familyId, createdAt: ts });
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
  if (payload.mobile) {
    const mob = normalizeMobile(payload.mobile);
    if (mob) {
      writes[`mobileIndex/${mob}/memberIds/${memberId}`] = true;
      writes[`mobileIndex/${mob}/familyIds/${familyId}`] = true;
      writes[`mobileIndex/${mob}/sources/manualAdd`]     = true;
      writes[`mobileIndex/${mob}/createdAt`]             = ts;
    }
  }

  // Honorary index
  const ALL_ORG_IDS = ["kadavani", "seva", "suraksha", "sthanik", "other"];
  ALL_ORG_IDS.forEach(orgId => {
    writes[`honoraryIndex/${orgId}/${memberId}`] = null;
  });
  (payload.honoraryOrgs || []).forEach(entry => {
    if (!entry.orgId || !entry.post) return;
    writes[`honoraryIndex/${entry.orgId}/${memberId}`] = honoraryIndexSchema({
      memberId,
      familyId,
      memberName: payload.name,
      mobile:     payload.mobile,
      photoURL:   payload.photoURL || existingMember?.photoURL || "",
      post:       entry.post,
      orgName:    entry.name || "",
      updatedAt:  ts,
    });
  });

  await batchWrite(writes);
  return memberId;
}

/** Update photo URL for a member and sync to honoraryIndex. */
export async function updateMemberPhoto(memberId, photoURL) {
  const ts = Date.now();
  const writes = {};

  writes[`members/${memberId}/photoURL`]  = photoURL;
  writes[`members/${memberId}/updatedAt`] = ts;

  // Sync into honoraryIndex
  const snap = await get(ref(db, `members/${memberId}`));
  const data = snap.exists() ? snap.val() : {};
  (data.honoraryOrgs || []).forEach(entry => {
    if (!entry.orgId || !entry.post) return;
    writes[`honoraryIndex/${entry.orgId}/${memberId}/photoURL`]  = photoURL;
    writes[`honoraryIndex/${entry.orgId}/${memberId}/updatedAt`] = ts;
  });

  await batchWrite(writes);
}
