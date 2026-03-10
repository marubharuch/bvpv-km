// db/familyTreeDb.js
// ─────────────────────────────────────────────────────────────────────────────
// Firestore layer for the new graph-based family tree schema.
//
// Collection: families/{familyId}
// Document shape:
// {
//   familyId, treeName, pin, createdBy, createdAt, updatedAt,
//   members: {
//     m1: { name, gender, year, rip, fatherId, motherId, spouseId,
//            isRegisteredUser?, uid? }
//   },
//   auditLogs: [ { timestamp, uid, action, memberId, changes } ]
// }
//
// users/{uid}  →  { familyId, memberId }   (pointer doc — written on join/create)
// ─────────────────────────────────────────────────────────────────────────────

import {
  doc, setDoc, getDoc, updateDoc,
  arrayUnion, serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../lib/firebase";

// ── Refs ─────────────────────────────────────────────────────────────────────
const familyRef  = (fid)  => doc(firestore, "families",  fid);
const userRef    = (uid)  => doc(firestore, "users",     uid);

// ── ID generators ─────────────────────────────────────────────────────────────
let _seq = 0;
export function newMemberId() {
  return "m" + Date.now().toString(36) + (++_seq);
}
export function newFamilyId() {
  return "FAM_" + Math.random().toString(36).slice(2, 8).toUpperCase();
}
export function newPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ── Read ──────────────────────────────────────────────────────────────────────

/** Load full family tree document. Returns null if not found. */
export async function getFamilyTree(familyId) {
  if (!familyId) return null;
  const snap = await getDoc(familyRef(familyId));
  return snap.exists() ? snap.data() : null;
}

/** Get the familyId and memberId pointer for a user. */
export async function getUserFamilyPointer(uid) {
  if (!uid) return null;
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? snap.data() : null;
}

// ── Create ────────────────────────────────────────────────────────────────────

/**
 * Create a brand-new family tree from wizard data.
 * Converts the wizard's flat arrays into the graph members map.
 * Returns { familyId, memberId } — the creator's own IDs.
 */
export async function createFamilyTree(uid, treeName, wizardState) {
  const familyId = newFamilyId();
  const pin      = newPin();
  const now      = Date.now();

  const { members, selfMemberId } = convertWizardToMembers(wizardState);

  // Mark the creator as a registered user
  if (selfMemberId && members[selfMemberId]) {
    members[selfMemberId].isRegisteredUser = true;
    members[selfMemberId].uid = uid;
  }

  const treeDoc = {
    familyId,
    treeName:  treeName || (wizardState.self?.name + "'s Family Tree"),
    pin,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
    members,
    auditLogs: [{
      timestamp: now,
      uid,
      action:    "create",
      memberId:  selfMemberId,
      changes:   { note: "Tree created from wizard" },
    }],
  };

  await setDoc(familyRef(familyId), treeDoc);
  await setDoc(userRef(uid), { familyId, memberId: selfMemberId }, { merge: true });

  return { familyId, memberId: selfMemberId };
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Edit an existing member in the tree.
 * changes = { field: { from, to } }  — used for audit log.
 */
export async function editMember(familyId, uid, memberId, data, changes = {}) {
  if (!familyId || !memberId) throw new Error("familyId and memberId required");

  const memberPath = `members.${memberId}`;
  const now = Date.now();

  await updateDoc(familyRef(familyId), {
    [`${memberPath}.name`]:   data.name   ?? null,
    [`${memberPath}.gender`]: data.gender ?? null,
    [`${memberPath}.year`]:   data.year   ?? null,
    [`${memberPath}.rip`]:    data.rip    ?? false,
    updatedAt: now,
    auditLogs: arrayUnion({
      timestamp: now,
      uid,
      action:    "edit",
      memberId,
      changes,
    }),
  });
}

/**
 * Add a new member to an existing tree.
 * Returns the new member's ID.
 */
export async function addMember(familyId, uid, memberData) {
  if (!familyId) throw new Error("familyId required");

  const memberId = newMemberId();
  const now      = Date.now();

  await updateDoc(familyRef(familyId), {
    [`members.${memberId}`]: {
      name:     memberData.name     || "",
      gender:   memberData.gender   || "M",
      year:     memberData.year     || null,
      rip:      memberData.rip      || false,
      fatherId: memberData.fatherId || null,
      motherId: memberData.motherId || null,
      spouseId: memberData.spouseId || null,
    },
    updatedAt: now,
    auditLogs: arrayUnion({
      timestamp: now,
      uid,
      action:    "add",
      memberId,
      changes:   { note: `Added ${memberData.name}` },
    }),
  });

  return memberId;
}

/**
 * Link two members as spouses (bidirectional).
 */
export async function setSpouseLink(familyId, uid, memberId1, memberId2) {
  const now = Date.now();
  await updateDoc(familyRef(familyId), {
    [`members.${memberId1}.spouseId`]: memberId2,
    [`members.${memberId2}.spouseId`]: memberId1,
    updatedAt: now,
    auditLogs: arrayUnion({
      timestamp: now, uid, action: "link_spouse",
      memberId: memberId1, changes: { spouseId: { to: memberId2 } },
    }),
  });
}

/**
 * Set parent → child link (sets fatherId or motherId on child).
 */
export async function setParentLink(familyId, uid, childId, parentId, parentGender) {
  const field = parentGender === "F" ? "motherId" : "fatherId";
  const now   = Date.now();
  await updateDoc(familyRef(familyId), {
    [`members.${childId}.${field}`]: parentId,
    updatedAt: now,
    auditLogs: arrayUnion({
      timestamp: now, uid, action: "link_parent",
      memberId: childId, changes: { [field]: { to: parentId } },
    }),
  });
}

// ── Migration ─────────────────────────────────────────────────────────────────

/**
 * Migrate old vanshTrees/{uid} document to the new families/{familyId} schema.
 * Called once per user. Returns { familyId }.
 */
export async function migrateOldTree(uid, oldTreeData) {
  const familyId = newFamilyId();
  const pin      = newPin();
  const now      = Date.now();

  const wizardState = {
    self:        oldTreeData.self        || {},
    ancestors:   oldTreeData.ancestors   || [],
    descendants: oldTreeData.descendants || [],
    spouses:     oldTreeData.spouses     || {},
    siblings:    oldTreeData.siblings    || {},
    cousins:     oldTreeData.cousins     || [],
  };

  const { members, selfMemberId } = convertWizardToMembers(wizardState);

  if (selfMemberId && members[selfMemberId]) {
    members[selfMemberId].isRegisteredUser = true;
    members[selfMemberId].uid = uid;
  }

  const treeDoc = {
    familyId,
    treeName:  (oldTreeData.self?.name || "Family") + "'s Family Tree",
    pin,
    createdBy: uid,
    createdAt: oldTreeData.updatedAt || now,
    updatedAt: now,
    members,
    auditLogs: [{
      timestamp: now,
      uid,
      action:    "migrate",
      memberId:  selfMemberId,
      changes:   { note: "Migrated from legacy vanshTrees schema" },
    }],
  };

  await setDoc(familyRef(familyId), treeDoc);
  await setDoc(userRef(uid), { familyId, memberId: selfMemberId }, { merge: true });

  return { familyId, memberId: selfMemberId };
}

// ── Conversion helper ─────────────────────────────────────────────────────────

/**
 * Convert the wizard's array-based state to the flat members graph.
 *
 * Wizard state:
 *   self        = { name, gender, year }
 *   ancestors   = [ { name, gender, year, rip }, ... ]  index 0 = father
 *   descendants = [ { name, gender, year, rip }, ... ]
 *   spouses     = { "self": {name,gender}, "anc_0": {...}, "desc_0": {...} }
 *   siblings    = { "self": {elder:[],younger:[]}, "anc_0": {...} }
 *   cousins     = [ { name, gender } ]
 *
 * Output: flat members map with parentId / spouseId links.
 */
export function convertWizardToMembers(wizardState) {
  const {
    self        = {},
    ancestors   = [],
    descendants = [],
    spouses     = {},
    siblings    = {},
    cousins     = [],
  } = wizardState;

  const members = {};
  const ancs    = ancestors.filter(a => a?.name);
  const descs   = descendants.filter(d => d?.name);

  // ── helper: add member, return id ──────────────────────────────
  const add = (data) => {
    const id = newMemberId();
    members[id] = {
      name:        data.name        || "",
      gender:      data.gender      || "M",
      year:        data.year        || null,
      rip:         data.rip         || false,
      fatherId:    data.fatherId    || null,  // compat
      motherId:    data.motherId    || null,  // compat
      spouseId:    data.spouseId    || null,
      ancestorId:  data.ancestorId  || null,  // new: points to older-gen member
      descendants: data.descendants || [],    // new: array of younger-gen member ids
    };
    return id;
  };
  // Helper: link two members as ancestor<->descendant
  const link = (youngerId, olderId) => {
    if (!youngerId || !olderId) return;
    members[youngerId].ancestorId = olderId;
    if (!members[olderId].descendants.includes(youngerId)) {
      members[olderId].descendants.push(youngerId);
    }
    // compat: set fatherId too
    members[youngerId].fatherId = olderId;
  };

  // ── 1. Self ────────────────────────────────────────────────────
  const selfId = add({ ...self });

  // ── 2. Ancestors (index 0 = father, 1 = grandfather, ...) ─────
  // Build chain: ancestors[0].fatherId = ancestors[1].id, etc.
  const ancIds = ancs.map(() => newMemberId());

  ancs.forEach((anc, i) => {
    const id = ancIds[i];
    members[id] = {
      name:        anc.name   || "",
      gender:      anc.gender || "M",
      year:        anc.year   || null,
      rip:         anc.rip    || false,
      fatherId:    null,
      motherId:    null,
      spouseId:    null,
      ancestorId:  null,
      descendants: [],
    };
  });

  // Link self → ancestors chain using new ancestorId/descendants
  if (ancIds[0]) {
    link(selfId, ancIds[0]);
  }
  ancIds.forEach((id, i) => {
    if (ancIds[i + 1]) link(id, ancIds[i + 1]);
  });

  // ── 3. Ancestor spouses ────────────────────────────────────────
  ancs.forEach((anc, i) => {
    // SpousesStep uses index-based keys: 'anc_0', 'anc_1', ...
    const sp = spouses[`anc_${i}`];
    if (sp?.name) {
      const spId = add({
        ...sp,
        gender:   sp.gender || (anc.gender === "M" ? "F" : "M"),
        fatherId: ancIds[i + 1] ? null : null,  // spouse parents unknown
      });
      members[ancIds[i]].spouseId = spId;
      members[spId].spouseId      = ancIds[i];

      // If self's mother not set yet, set it to first ancestor's wife
      if (i === 0 && !members[selfId].motherId) {
        members[selfId].motherId = spId;
      }
    }
  });

  // ── 4. Self's spouse ───────────────────────────────────────────
  const selfSp = spouses["self"];
  if (selfSp?.name) {
    const spId = add({
      ...selfSp,
      gender: selfSp.gender || (self.gender === "M" ? "F" : "M"),
    });
    members[selfId].spouseId = spId;
    members[spId].spouseId   = selfId;
  }

  // ── 5. Descendants ─────────────────────────────────────────────
  const descIds = descs.map(desc => {
    const id = add({ ...desc });
    // Link: self is the ancestor of each descendant
    link(id, selfId);

    // Descendant's own spouse
    // SpousesStep uses index-based keys: 'desc_0', 'desc_1', ...
    const dSpKey = `desc_${descs.indexOf(desc)}`;
    const dSp    = spouses[dSpKey];
    if (dSp?.name) {
      const dSpId = add({
        ...dSp,
        gender: dSp.gender || (desc.gender === "M" ? "F" : "M"),
      });
      members[id].spouseId  = dSpId;
      members[dSpId].spouseId = id;
    }

    return id;
  });

  // ── 6. Siblings ───────────────────────────────────────────────
  // Siblings of self
  // Add siblings: they share the same ancestor as the person they're sibling of
  const addSiblings = (sibData, sharedAncestorId) => {
    [...(sibData?.elder || []), ...(sibData?.younger || [])]
      .filter(s => s?.name)
      .forEach(s => {
        const sid = add({ ...s });
        if (sharedAncestorId) link(sid, sharedAncestorId);
      });
  };

  addSiblings(siblings["self"], members[selfId].ancestorId);

  ancs.forEach((_, i) => {
    const ancId = ancIds[i];
    addSiblings(siblings[`anc_${i}`], members[ancId]?.ancestorId);
  });

  // ── 7. Cousins (standalone — no parent links known) ───────────
  cousins.filter(c => c?.name).forEach(c => add({ ...c, relation: c.relation || 'cousin' }));

  return { members, selfMemberId: selfId };
}
