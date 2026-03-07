// db/memberDb.js — All reads/writes for `members` node.
// mobile = ALWAYS fullMobile "+91XXXXXXXXXX"

import { rtdb }                          from "./rtdb";
import { memberDoc, honoraryIndexDoc }   from "./schema";
import { toFullMobile, toMobileKey }     from "../lib/phone";
import { checkDuplicateMobile, buildMobileIndexWrites } from "./mobileIndexDb";
import { invalidateFamilyCache }         from "./familyDb";
import { HONORARY_ORGS }                 from "../constants/app";

const ALL_ORG_IDS = HONORARY_ORGS.map(o => o.id);

/** Fetch a single member. */
export async function getMember(memberId) {
  if (!memberId) return null;
  return rtdb.get(`members/${memberId}`);
}

/**
 * Save (create or update) a member.
 * Used by useMemberForm — handles mobile normalization, duplicate check,
 * mobileIndex writes, and honoraryIndex updates in one place.
 */
export async function saveMember({ memberId, familyId, payload, isAdding, existingMember = {} }) {
  const ts  = Date.now();
  const cc  = payload.countryCode || "+91";

  // payload.mobile may be 10-digit input from form — normalize to fullMobile
  const full = payload.mobile
    ? toFullMobile(cc, payload.mobile)
    : "";

  // ── Duplicate check ───────────────────────────────────────────
  if (full) {
    const dup    = await checkDuplicateMobile(full, familyId);
    const isSelf = !isAdding && dup.memberId === memberId;
    if (dup.duplicate && !isSelf) {
      throw new Error(`Mobile ${full} is already registered in another family.`);
    }
  }

  // ── Clean payload — mobile is always fullMobile ───────────────
  const clean = { ...payload, mobile: full, countryCode: cc };
  delete clean.fullMobile;

  // ── Write member node ─────────────────────────────────────────
  // Writing to members/$memberId uses a cross-node security rule that checks
  // root.child('users').child(auth.uid).child('familyId') == members/$memberId/familyId.
  // Root-level batch writes break this rule, so member node is written directly,
  // everything else (families, mobileIndex, honoraryIndex) goes in a batch.
  const sideWrites = {};

  if (isAdding) {
    memberId = memberId || `MEM_${ts}`;
    await rtdb.set(`members/${memberId}`, memberDoc({ ...clean, familyId, createdAt: ts }));
    sideWrites[`families/${familyId}/members/${memberId}`] = true;
  } else {
    const photoURL = payload.photoURL || existingMember.photoURL || "";
    await rtdb.update(`members/${memberId}`, { ...clean, photoURL, updatedAt: ts });
  }

  // ── mobileIndex ───────────────────────────────────────────────
  if (full) {
    Object.assign(sideWrites, buildMobileIndexWrites(full, cc, {
      memberId, familyId, source: "manualAdd",
    }));
  }

  // ── Honorary orgs ─────────────────────────────────────────────
  if (payload.honoraryOrgs !== undefined) {
    ALL_ORG_IDS.forEach(orgId => { sideWrites[`honoraryIndex/${orgId}/${memberId}`] = null; });
    const photo = payload.photoURL || existingMember?.photoURL || "";
    (payload.honoraryOrgs || []).forEach(entry => {
      if (!entry.orgId || !entry.post) return;
      sideWrites[`honoraryIndex/${entry.orgId}/${memberId}`] = honoraryIndexDoc({
        memberId, familyId,
        memberName: payload.name,
        mobile:     full,
        city:       payload.city || existingMember?.city || "",
        photoURL:   photo ? `${photo}?v=${ts}` : "",
        post:       entry.post,
        orgName:    entry.name || "",
        updatedAt:  ts,
      });
    });
  }

  if (Object.keys(sideWrites).length) await rtdb.batch(sideWrites);

  // Invalidate family cache so dashboard re-fetches fresh data
  if (familyId) await invalidateFamilyCache(familyId);

  return memberId;
}

/**
 * Update member photo URL + honoraryIndex entries.
 * Called from PhotoUpload component.
 */
export async function updateMemberPhoto(memberId, photoURL, honoraryOrgs = []) {
  const ts = Date.now();

  await rtdb.update(`members/${memberId}`, { photoURL, updatedAt: ts });

  const honoraryWrites = {};
  (honoraryOrgs || []).forEach(entry => {
    if (!entry.orgId || !entry.post) return;
    honoraryWrites[`honoraryIndex/${entry.orgId}/${memberId}/photoURL`]  = `${photoURL}?v=${ts}`;
    honoraryWrites[`honoraryIndex/${entry.orgId}/${memberId}/updatedAt`] = ts;
  });
  if (Object.keys(honoraryWrites).length) await rtdb.batch(honoraryWrites);
}
