/**
 * services/familyService.js
 * All family-related reads/writes.
 */

import { ref, get } from "firebase/database";
import { db } from  "../lib/firebase"
import { updatePath, batchWrite } from "./rtdbService";
import { familySchema } from "../schema/schema";

/** Partially update a family node. */
export async function updateFamily(familyId, data) {
  await updatePath(`families/${familyId}`, data);
}

/** Update the familyPin and both pin index entries atomically. */
export async function updateFamilyPin(familyId, newPin, oldPin = null) {
  const updates = {};
  updates[`families/${familyId}/familyPin`] = newPin;
  updates[`familiesByPin/${newPin}`]         = familyId;
  if (oldPin) updates[`familiesByPin/${oldPin}`] = null;
  await batchWrite(updates);
}

/** Fetch a family with all its member documents. */
export async function getFamilyWithMembers(familyId) {
  const famSnap = await get(ref(db, `families/${familyId}`));
  if (!famSnap.exists()) return null;

  const famData   = famSnap.val();
  const memberIds = Object.keys(famData.members || {});
  const snapshots = await Promise.all(
    memberIds.map(id => get(ref(db, `members/${id}`)))
  );
  const membersData = snapshots
    .filter(s => s.exists())
    .map(s => ({ id: s.key, ...s.val() }));

  return { ...famData, members: membersData };
}

/** Mark a member as present in the family presence map. */
export async function setFamilyMemberPresence(familyId, memberId) {
  await updatePath(`families/${familyId}/members/${memberId}`, true);
}
