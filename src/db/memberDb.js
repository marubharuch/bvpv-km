// db/memberDb.js
// members node mobile = ALWAYS fullMobile "+91XXXXXXXXXX"

import { rtdb }                    from "./rtdb";
import { memberDoc, honoraryIndexDoc } from "./schema";
import { toFullMobile, toMobileKey }   from "../lib/phone";
import { checkDuplicateMobile, buildMobileIndexWrites } from "./mobileIndexDb";
import { HONORARY_ORGS }           from "../constants/app";

const ALL_ORG_IDS = HONORARY_ORGS.map(o => o.id);

export async function saveMember({ memberId, familyId, payload, isAdding, existingMember = {} }) {
  const ts  = Date.now();
  const cc  = payload.countryCode || "+91";

  // payload.mobile may be 10-digit input from form — normalize to fullMobile
  const full = payload.mobile
    ? toFullMobile(cc, payload.mobile)   // always "+91XXXXXXXXXX"
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
  const clean = {
    ...payload,
    mobile:      full,        // "+91XXXXXXXXXX" — no more 10-digit on member node
    countryCode: cc,
  };
  delete clean.fullMobile;    // no separate field needed — mobile IS full

  // ── Write member node ─────────────────────────────────────────
  // Writing to members/$memberId uses a cross-node security rule that checks
  // root.child('users').child(auth.uid).child('familyId') == members/$memberId/familyId.
  // Root-level batch writes break this rule evaluation, so we:
  //   1. Write the member node directly (path-scoped → rule evaluates cleanly)
  //   2. Batch everything else (families, mobileIndex, honoraryIndex — simpler rules)
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
  return memberId;
}

export async function updateMemberPhoto(memberId, photoURL, honoraryOrgs = []) {
  const ts = Date.now();

  await rtdb.update(`members/${memberId}`, { photoURL, updatedAt: ts });

  // honoraryIndex has simple auth != null rules — batch is safe
  const honoraryWrites = {};
  (honoraryOrgs || []).forEach(entry => {
    if (!entry.orgId || !entry.post) return;
    honoraryWrites[`honoraryIndex/${entry.orgId}/${memberId}/photoURL`]  = `${photoURL}?v=${ts}`;
    honoraryWrites[`honoraryIndex/${entry.orgId}/${memberId}/updatedAt`] = ts;
  });
  if (Object.keys(honoraryWrites).length) await rtdb.batch(honoraryWrites);
}