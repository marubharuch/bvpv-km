/**
 * rtdbService.js
 * ─────────────────────────────────────────────────────────────────
 * ✅ SINGLE WRITE SOURCE — All RTDB writes go through this file only.
 *
 * Rules:
 *  • No other file should import { set, update, push, remove } from firebase/database
 *  • All other files call functions from THIS file to write data
 *  • Reads (get, onValue) are fine to keep wherever they are
 * ─────────────────────────────────────────────────────────────────
 */

import { ref, set, update, push, remove } from "firebase/database";
import { db } from "../firebase";

// ─────────────────────────────────────────────
// 🔧 PRIMITIVE WRITE HELPERS (internal use)
// ─────────────────────────────────────────────

/** Atomic multi-path write. Pass a flat { "path/key": value } object. */
export async function batchWrite(updates) {
  await update(ref(db), updates);
}

/** Set a value at a specific path (overwrites). */
export async function writePath(path, data) {
  await set(ref(db, path), data);
}

/** Update (merge) a value at a specific path. */
export async function updatePath(path, data) {
  await update(ref(db, path), data);
}

/** Push a new child to a list path. Returns the new key. */
export async function pushToPath(path, data) {
  const newRef = push(ref(db, path));
  if (data !== undefined) await set(newRef, data);
  return newRef.key;
}

/** Remove a node at a specific path. */
export async function deletePath(path) {
  await remove(ref(db, path));
}

// ─────────────────────────────────────────────
// 👤 USER WRITES
// ─────────────────────────────────────────────

/** Create or overwrite a user node. */
export async function writeUser(uid, data) {
  await writePath(`users/${uid}`, data);
}

/** Update partial fields on a user node. */
export async function updateUser(uid, data) {
  await updatePath(`users/${uid}`, data);
}

/** Write the usersByEmail index. */
export async function writeUserEmailIndex(emailKey, uid) {
  await writePath(`usersByEmail/${emailKey}`, uid);
}

// ─────────────────────────────────────────────
// 👨‍👩‍👧 FAMILY WRITES
// ─────────────────────────────────────────────

/** Update partial fields on a family node. */
export async function updateFamily(familyId, data) {
  await updatePath(`families/${familyId}`, data);
}

/**
 * Update the family presence map entry for a member.
 * NOTE: families/{familyId}/members/{memberId} only stores `true` (presence).
 * To update actual member data, use updateMemberNode() instead.
 */
export async function updateFamilyMemberPresence(familyId, memberId) {
  await updatePath(`families/${familyId}/members/${memberId}`, true);
}

/**
 * @deprecated Use updateMemberNode() to update member data.
 * Kept for backward compatibility — writes to families presence map only.
 */
export async function updateFamilyMember(familyId, memberId, data) {
  // ✅ Bug 9: this path is a presence map, not member data
  // Writing data here has no effect on members/{memberId}
  // Use updateMemberNode() for actual member field updates
  await updatePath(`families/${familyId}/members/${memberId}`, true);
}

/** Update partial fields on the actual member document at members/{memberId}. */
export async function updateMemberNode(memberId, data) {
  await updatePath(`members/${memberId}`, data);
}

/** Write familyPin-related indexes. */
export async function updateFamilyPins(familyId, newPin, oldPin = null) {
  const updates = {};
  updates[`families/${familyId}/familyPin`] = newPin;
  updates[`familyPins/${newPin}`] = familyId;
  if (oldPin) updates[`familyPins/${oldPin}`] = null; // remove old pin
  await batchWrite(updates);
}

// ─────────────────────────────────────────────
// 🧑 MEMBER WRITES
// ─────────────────────────────────────────────

/** Update partial fields on a member node. */
export async function updateMember(memberId, data) {
  await updatePath(`members/${memberId}`, data);
}

// ─────────────────────────────────────────────
// 🔗 CONNECTOR WRITES
// ─────────────────────────────────────────────

/** Update partial fields on a connector node. */
export async function updateConnector(connectorId, data) {
  await updatePath(`connectors/${connectorId}`, data);
}

// ─────────────────────────────────────────────
// 🎓 STUDENT WRITES  (StudentsPage)
// ─────────────────────────────────────────────

/** Update student fields on a family member. */
export async function updateStudentMember(familyId, memberId, data) {
  await updateFamilyMember(familyId, memberId, data);
}