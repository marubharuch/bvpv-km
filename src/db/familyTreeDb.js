// db/familyTreeDb.js
// ─────────────────────────────────────────────────────────────────────────────
// Firestore CRUD for family tree structure.
//
// Collection: /families/{familyId}
// 1 document = 1 family = full tree (couples + member names/photos)
// 1 Firestore read = entire tree loaded → billing optimal
//
// What lives here (Firestore):
//   - Tree structure: couples{}, rootCoupleId
//   - Member display: members{} → name, photoURL, gender, coupleId, status
//   - Family meta: treeName, vatan, atak, kuldevi, adminUid, memberCount
//
// What does NOT live here (→ RTDB memberDb.js):
//   - Phone, email, dob, address, occupation, invitedBy, registeredUid etc.
// ─────────────────────────────────────────────────────────────────────────────

import {
  doc, getDoc, setDoc, updateDoc,
  increment, serverTimestamp, deleteField,
} from "firebase/firestore";
import { firestore }  from "../lib/firebase";
import {
  familyTreeDoc, coupleNode, memberTreeEntry,
  newFamilyId, newMemberId, newCoupleId,
} from "./schema";

// ── Refs ──────────────────────────────────────────────────────────────────────
const familyRef = (familyId) => doc(firestore, "families", familyId);

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the full family tree document.
 * Returns null if not found.
 * 1 Firestore read = full tree (couples + member names/photos).
 */
export async function getFamilyTree(familyId) {
  if (!familyId) return null;
  const snap = await getDoc(familyRef(familyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a brand-new family tree.
 * Called when admin sends "create" invite and receiver opens it.
 *
 * @param {object} params
 * @param {string} params.adminUid      - Firebase Auth UID of creator (admin)
 * @param {string} params.treeName      - e.g. "પટેલ ફેમિલી"
 * @param {string} params.vatan         - e.g. "વટાદરા"
 * @param {string} params.atak          - e.g. "શાહ"
 * @param {string} params.kuldevi       - e.g. "અંબિકા માતા"
 * @returns {{ familyId: string }}
 */
export async function createFamilyTree({ adminUid, treeName, vatan = "", atak = "", kuldevi = "" }) {
  const familyId = newFamilyId();

  const data = familyTreeDoc({
    familyId,
    treeName,
    adminUid,
    vatan,
    atak,
    kuldevi,
    couples:     {},
    members:     {},
    memberCount: 0,
    rootCoupleId: null,
    status:      "active",
  });

  await setDoc(familyRef(familyId), data);
  return { familyId };
}

// ─────────────────────────────────────────────────────────────────────────────
// COUPLE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a couple node to the tree.
 * A couple = Father + Mother pair.
 * If parentCoupleId is null, this becomes the root couple (દાદા-દાદી).
 *
 * @returns {{ coupleId, fatherId, motherId }}
 */
export async function addCouple(familyId, {
  fatherData,       // { name, gender:"M", photoURL? }
  motherData,       // { name, gender:"F", photoURL? }
  parentCoupleId,   // null for root, else parent couple's id
}) {
  const coupleId = newCoupleId();
  const fatherId = newMemberId();
  const motherId = newMemberId();
  const now      = Date.now();

  // Build couple node
  const couple = coupleNode({
    fatherId,
    motherId,
    parentCoupleId: parentCoupleId || null,
    childCoupleIds:    [],
    unmarriedChildIds: [],
  });

  // Build member tree entries (name + photo for tree display)
  const father = memberTreeEntry({
    name:     fatherData.name     || "",
    photoURL: fatherData.photoURL || "",
    gender:   "M",
    coupleId,
    status:   "active",
  });

  const mother = memberTreeEntry({
    name:     motherData.name     || "",
    photoURL: motherData.photoURL || "",
    gender:   "F",
    coupleId,
    status:   "active",
  });

  const updates = {
    [`couples.${coupleId}`]:       couple,
    [`members.${fatherId}`]:       father,
    [`members.${motherId}`]:       mother,
    memberCount:                   increment(2),
    updatedAt:                     now,
  };

  // If this couple has a parent → add to parent's childCoupleIds
  if (parentCoupleId) {
    updates[`couples.${parentCoupleId}.childCoupleIds`] = arrayUnionCompat(parentCoupleId, coupleId);
  }

  // If no root couple yet → set this as root
  const existing = await getFamilyTree(familyId);
  if (!existing?.rootCoupleId) {
    updates.rootCoupleId = coupleId;
  }

  await updateDoc(familyRef(familyId), updates);

  // If parent exists, we need to properly update childCoupleIds array
  if (parentCoupleId) {
    await _appendToArray(familyId, `couples.${parentCoupleId}.childCoupleIds`, coupleId);
  }

  return { coupleId, fatherId, motherId };
}

/**
 * Add an unmarried child to a couple.
 * Child has no spouse yet → goes in unmarriedChildIds.
 *
 * @returns {{ memberId }}
 */
export async function addUnmarriedChild(familyId, parentCoupleId, childData) {
  const memberId = newMemberId();
  const now      = Date.now();

  const child = memberTreeEntry({
    name:     childData.name     || "",
    photoURL: childData.photoURL || "",
    gender:   childData.gender   || "M",
    coupleId: null,  // not in a couple yet
    status:   "active",
  });

  await updateDoc(familyRef(familyId), {
    [`members.${memberId}`]: child,
    memberCount:             increment(1),
    updatedAt:               now,
  });

  // Append to parent couple's unmarriedChildIds
  await _appendToArray(familyId, `couples.${parentCoupleId}.unmarriedChildIds`, memberId);

  return { memberId };
}

/**
 * "Marry" an existing unmarried child — create a new couple for them.
 * Moves memberId from parent's unmarriedChildIds → new couple's fatherId/motherId.
 *
 * @returns {{ coupleId, spouseMemberId }}
 */
export async function marryMember(familyId, {
  memberId,         // existing unmarried member
  spouseData,       // { name, gender, photoURL? }
  parentCoupleId,   // the couple whose child this member is
}) {
  const coupleId      = newCoupleId();
  const spouseMemberId = newMemberId();
  const now           = Date.now();

  // Get existing member to determine if father or mother
  const tree   = await getFamilyTree(familyId);
  const member = tree?.members?.[memberId];
  const isMale = member?.gender === "M";

  const fatherId = isMale ? memberId : spouseMemberId;
  const motherId = isMale ? spouseMemberId : memberId;

  const couple = coupleNode({
    fatherId,
    motherId,
    parentCoupleId,
    childCoupleIds:    [],
    unmarriedChildIds: [],
  });

  const spouse = memberTreeEntry({
    name:     spouseData.name     || "",
    photoURL: spouseData.photoURL || "",
    gender:   isMale ? "F" : "M",
    coupleId,
    status:   "active",
  });

  const updates = {
    [`couples.${coupleId}`]:                 couple,
    [`members.${spouseMemberId}`]:           spouse,
    [`members.${memberId}.coupleId`]:        coupleId,  // update existing member
    memberCount:                             increment(1),
    updatedAt:                               now,
  };

  await updateDoc(familyRef(familyId), updates);

  // Add to parent's childCoupleIds + remove from unmarriedChildIds
  await _appendToArray(familyId, `couples.${parentCoupleId}.childCoupleIds`, coupleId);
  await _removeFromArray(familyId, `couples.${parentCoupleId}.unmarriedChildIds`, memberId);

  return { coupleId, spouseMemberId };
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER DISPLAY UPDATE
// (Full detail → memberDb.js / RTDB. This is only name+photo for tree view.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the member's display info in the tree (name + photo only).
 * Called after Cloudinary upload or name edit.
 */
export async function updateMemberDisplay(familyId, memberId, { name, photoURL }) {
  const updates = { updatedAt: Date.now() };
  if (name     !== undefined) updates[`members.${memberId}.name`]     = name;
  if (photoURL !== undefined) updates[`members.${memberId}.photoURL`] = photoURL;
  await updateDoc(familyRef(familyId), updates);
}

/**
 * Soft-delete a member from the tree.
 * Sets status = "removed" — does not delete data.
 * Admin only.
 */
export async function removeMember(familyId, memberId) {
  await updateDoc(familyRef(familyId), {
    [`members.${memberId}.status`]: "removed",
    memberCount:                    increment(-1),
    updatedAt:                      Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY META UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update family meta info (treeName, vatan, atak, kuldevi).
 * Admin only.
 */
export async function updateFamilyMeta(familyId, updates) {
  const allowed = ["treeName", "vatan", "atak", "kuldevi"];
  const safe = {};
  allowed.forEach(k => {
    if (updates[k] !== undefined) safe[k] = updates[k];
  });
  safe.updatedAt = Date.now();
  await updateDoc(familyRef(familyId), safe);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — Array operations on Firestore nested fields
// Firestore arrayUnion doesn't work on nested object fields (couples.c1.childCoupleIds)
// So we read → modify → write manually.
// ─────────────────────────────────────────────────────────────────────────────

async function _appendToArray(familyId, fieldPath, value) {
  const snap = await getDoc(familyRef(familyId));
  if (!snap.exists()) return;

  const data     = snap.data();
  const keys     = fieldPath.split(".");
  let   current  = data;

  // Navigate to parent of target field
  for (let i = 0; i < keys.length - 1; i++) {
    current = current?.[keys[i]];
    if (!current) return;
  }

  const lastKey = keys[keys.length - 1];
  const arr     = Array.isArray(current[lastKey]) ? current[lastKey] : [];

  if (arr.includes(value)) return; // already exists

  await updateDoc(familyRef(familyId), {
    [fieldPath]: [...arr, value],
  });
}

async function _removeFromArray(familyId, fieldPath, value) {
  const snap = await getDoc(familyRef(familyId));
  if (!snap.exists()) return;

  const data    = snap.data();
  const keys    = fieldPath.split(".");
  let   current = data;

  for (let i = 0; i < keys.length - 1; i++) {
    current = current?.[keys[i]];
    if (!current) return;
  }

  const lastKey = keys[keys.length - 1];
  const arr     = Array.isArray(current[lastKey]) ? current[lastKey] : [];
  const updated = arr.filter(v => v !== value);

  await updateDoc(familyRef(familyId), {
    [fieldPath]: updated,
  });
}

// Unused but kept for reference
function arrayUnionCompat(parentCoupleId, coupleId) {
  return coupleId;
}