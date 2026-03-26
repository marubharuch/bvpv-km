// db/memberDb.js
// ─────────────────────────────────────────────────────────────────────────────
// RTDB CRUD for member detail data.
//
// RTDB path: /members/{familyId}/{memberId}
//
// What lives here:
//   phone, email, dob, address, occupation, native,
//   registeredUid, isAnonymous, invitedBy, coupleId, status, createdAt
//
// What does NOT live here (→ Firestore familyTreeDb.js):
//   name, photoURL, gender, coupleId (tree display copy)
//
// NOTE: name + photoURL are written to BOTH:
//   1. Firestore /families/{fid}.members.{mid} → for tree display (1 read)
//   2. RTDB /members/{fid}/{mid} → for profile view
//
// PHONE RULE: Always E.164 format → "+919974021397"
// ─────────────────────────────────────────────────────────────────────────────

import { rtdb }        from "./rtdb";
import { memberDoc }   from "./schema";
import { toFullMobile } from "../lib/phone";
import { updateMemberDisplay } from "./familyTreeDb";
import {
  logAudit, logMemberUpdate,
  AUDIT_ACTIONS, ACTOR_TYPES,
} from "../utils/auditLogger";

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a single member's detail from RTDB.
 * Returns null if not found.
 */
export async function getMember(familyId, memberId) {
  if (!familyId || !memberId) return null;
  return rtdb.get(`members/${familyId}/${memberId}`);
}

/**
 * Fetch all members of a family from RTDB.
 * Returns array of { id, ...memberData }
 */
export async function getFamilyMembers(familyId) {
  if (!familyId) return [];
  return rtdb.getList(`members/${familyId}`);
}

/**
 * Find member by registeredUid (for login lookup).
 * Returns { id, ...memberData } or null.
 */
export async function getMemberByUid(familyId, uid) {
  if (!familyId || !uid) return null;
  const members = await getFamilyMembers(familyId);
  return members.find(m => m.registeredUid === uid) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new member in RTDB.
 * Also syncs name + photoURL to Firestore tree display.
 *
 * @param {string} familyId
 * @param {string} memberId   - same ID as used in Firestore /families/{fid}.members
 * @param {object} payload    - member fields
 * @param {object} actor      - { uid, name } of person adding this member
 * @returns {string} memberId
 */
export async function createMember(familyId, memberId, payload, actor = {}) {
  if (!familyId || !memberId) throw new Error("familyId and memberId required");

  const ts = Date.now();
  const cc = payload.countryCode || "+91";
  const phone = payload.phone
    ? toFullMobile(cc, payload.phone)
    : "";

  const data = memberDoc({
    ...payload,
    phone,
    countryCode: cc,
    familyId,
    status:    "active",
    createdAt: ts,
    updatedAt: ts,
  });

  await rtdb.set(`members/${familyId}/${memberId}`, data);

  // Sync name + photoURL to Firestore tree display
  if (payload.name || payload.photoURL) {
    await updateMemberDisplay(familyId, memberId, {
      name:     payload.name     || "",
      photoURL: payload.photoURL || "",
    }).catch(console.warn);
  }

  // Audit log
  logAudit(familyId, {
    action:     AUDIT_ACTIONS.MEMBER_CREATED,
    doneBy:     actor.uid   || null,
    doneByName: actor.name  || null,
    doneByType: ACTOR_TYPES.REGISTERED,
    targetId:   memberId,
    targetName: payload.name || "",
  }).catch(console.warn);

  return memberId;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update member detail fields in RTDB.
 * Also syncs name + photoURL to Firestore if changed.
 * Logs each changed field to editHistory.
 *
 * @param {string} familyId
 * @param {string} memberId
 * @param {object} payload        - fields to update
 * @param {object} existingMember - current member data (for diff)
 * @param {object} actor          - { uid, name } of person editing
 */
export async function updateMember(familyId, memberId, payload, existingMember = {}, actor = {}) {
  if (!familyId || !memberId) throw new Error("familyId and memberId required");

  const ts = Date.now();
  const cc = payload.countryCode || existingMember.countryCode || "+91";

  // Normalize phone if provided
  const phone = payload.phone
    ? toFullMobile(cc, payload.phone)
    : existingMember.phone || "";

  const clean = {
    ...payload,
    phone,
    countryCode: cc,
    updatedAt:   ts,
  };

  // Never overwrite these with empty values accidentally
  if (!clean.phone)    delete clean.phone;
  if (!clean.email)    delete clean.email;

  await rtdb.update(`members/${familyId}/${memberId}`, clean);

  // Sync name/photo to Firestore tree display if changed
  const nameChanged  = payload.name     && payload.name     !== existingMember.name;
  const photoChanged = payload.photoURL && payload.photoURL !== existingMember.photoURL;
  if (nameChanged || photoChanged) {
    await updateMemberDisplay(familyId, memberId, {
      name:     payload.name     || existingMember.name     || "",
      photoURL: payload.photoURL || existingMember.photoURL || "",
    }).catch(console.warn);
  }

  // Build diff for audit log
  const auditFields = ["name", "phone", "email", "dob", "address", "occupation", "native", "gender"];
  const changes = {};
  auditFields.forEach(field => {
    const newVal = clean[field];
    const oldVal = existingMember[field];
    if (newVal !== undefined && String(newVal) !== String(oldVal ?? "")) {
      changes[field] = { old: oldVal ?? null, new: newVal };
    }
  });

  if (Object.keys(changes).length) {
    logMemberUpdate(
      familyId,
      { doneBy: actor.uid || null, doneByName: actor.name || null, doneByType: ACTOR_TYPES.REGISTERED },
      { targetId: memberId, targetName: clean.name || existingMember.name },
      changes
    ).catch(console.warn);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHOTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update member photo URL in RTDB + sync to Firestore tree display.
 * Called from PhotoUpload component after Cloudinary upload.
 */
export async function updateMemberPhoto(familyId, memberId, photoURL, actor = {}) {
  if (!familyId || !memberId || !photoURL) return;

  const ts = Date.now();

  // Update RTDB
  await rtdb.update(`members/${familyId}/${memberId}`, {
    photoURL,
    updatedAt: ts,
  });

  // Sync to Firestore tree display
  await updateMemberDisplay(familyId, memberId, { photoURL }).catch(console.warn);

  // Audit log
  logAudit(familyId, {
    action:     AUDIT_ACTIONS.MEMBER_PHOTO_UPDATED,
    doneBy:     actor.uid  || null,
    doneByName: actor.name || null,
    doneByType: ACTOR_TYPES.REGISTERED,
    targetId:   memberId,
  }).catch(console.warn);
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION LINK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Link a Firebase Auth UID to an existing member.
 * Called when anonymous/invited member completes registration.
 *
 * @param {string} familyId
 * @param {string} memberId
 * @param {string} uid         - Firebase Auth UID
 * @param {boolean} isAnonymous
 */
export async function linkMemberToUser(familyId, memberId, uid, isAnonymous = false) {
  if (!familyId || !memberId || !uid) return;

  await rtdb.update(`members/${familyId}/${memberId}`, {
    registeredUid: uid,
    isAnonymous,
    updatedAt: Date.now(),
  });

  logAudit(familyId, {
    action:     AUDIT_ACTIONS.USER_REGISTERED,
    doneBy:     uid,
    doneByType: isAnonymous ? ACTOR_TYPES.PIN : ACTOR_TYPES.REGISTERED,
    targetId:   memberId,
  }).catch(console.warn);
}

// ─────────────────────────────────────────────────────────────────────────────
// SOFT DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-delete a member.
 * Sets status = "removed" in RTDB + Firestore tree display.
 * Admin only.
 */
export async function removeMember(familyId, memberId, actor = {}) {
  if (!familyId || !memberId) return;

  const ts = Date.now();

  await rtdb.update(`members/${familyId}/${memberId}`, {
    status:    "removed",
    updatedAt: ts,
  });

  // Also soft-delete in Firestore tree display
  const { removeMember: firestoreRemove } = await import("./familyTreeDb");
  await firestoreRemove(familyId, memberId).catch(console.warn);

  logAudit(familyId, {
    action:     AUDIT_ACTIONS.MEMBER_DELETED,
    doneBy:     actor.uid  || null,
    doneByName: actor.name || null,
    doneByType: ACTOR_TYPES.REGISTERED,
    targetId:   memberId,
  }).catch(console.warn);
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get edit history for a specific member.
 * Returns array sorted newest first.
 */
export async function getMemberEditHistory(familyId, memberId, limit = 20) {
  if (!familyId || !memberId) return [];

  const logs = await rtdb.getList(`auditLogs/${familyId}`);
  return logs
    .filter(log => log.targetId === memberId && log.action === AUDIT_ACTIONS.MEMBER_UPDATED)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}