// db/treeDb.js
// ─────────────────────────────────────────────────────────────────────────────
// Firestore:
//   meta/treeCounter          → { lastId: 42 }  (auto-increment)
//   trees/{treeId}            → tree data
//   treesByUid/{uid}          → creator ke trees ka pointer
//
// RTDB (naya node — directory se bilkul alag):
//   treeEditors/{treeId}/{mobileKey} → { phone, name, verifiedAt, lastSeen }
//
// RULES:
//   Creator = uid zaroori (logged-in)
//   Editor  = PIN verify → phone RTDB treeEditors mein save
//   Viewer  = sirf URL, koi verify nahi
//
// Directory nodes TOUCH NAHI: families/, members/, mobileIndex/, users/
// ─────────────────────────────────────────────────────────────────────────────

import {
  doc, getDoc, setDoc, updateDoc,
  runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { rtdb }      from './rtdb';
import { toMobileKey, toFullMobile } from '../lib/phone';

// ── Refs ──────────────────────────────────────────────────────────────────────
const counterRef   = doc(firestore, 'meta', 'treeCounter');
const treeRef      = (treeId) => doc(firestore, 'trees', treeId);
const byUidRef     = (uid)    => doc(firestore, 'treesByUid', uid);

// ── RTDB path (fresh node) ────────────────────────────────────────────────────
const editorPath   = (treeId, mobileKey) => `treeEditors/${treeId}/${mobileKey}`;

// ── PIN generator ─────────────────────────────────────────────────────────────
export function newTreePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ── Auto-increment tree ID (transaction-safe) ─────────────────────────────────
async function nextTreeId() {
  return runTransaction(firestore, async (tx) => {
    const snap = await tx.get(counterRef);
    const next = (snap.exists() ? snap.data().lastId : 0) + 1;
    tx.set(counterRef, { lastId: next });
    return String(next);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creator tree banata hai.
 * @param {string}   uid
 * @param {string}   treeName
 * @param {Array}    nodes           — initial nodes (empty ya existing)
 * @param {Array}    invitedContacts — [{ name, phone, countryCode }] contact picker se
 * @returns {{ treeId, pin }}
 */
export async function createTree(uid, treeName, nodes = [], invitedContacts = []) {
  const treeId = await nextTreeId();         // "1", "2", "43" ...
  const pin    = newTreePin();               // "4821"
  const now    = Date.now();

  const invited = invitedContacts
    .filter(c => c.phone)
    .map(c => ({
      name:  c.name  || '',
      phone: toFullMobile(c.countryCode || '+91', c.phone),
    }));

  const treeDoc = {
    treeId,
    treeName:     treeName || 'Family Tree',
    pin,
    createdByUid: uid,
    createdAt:    now,
    updatedAt:    now,
    nodes,
    rowOrder:     null,
    invited,
  };

  // Firestore: tree save
  await setDoc(treeRef(treeId), treeDoc);

  // Firestore: uid → tree pointer
  await setDoc(byUidRef(uid), {
    [`trees.${treeId}`]: {
      role:      'creator',
      treeName:  treeDoc.treeName,
      createdAt: now,
    },
  }, { merge: true });

  return { treeId, pin };
}

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/** Full tree data. Returns null if not found. */
export async function getTree(treeId) {
  if (!treeId) return null;
  const snap = await getDoc(treeRef(treeId));
  return snap.exists() ? snap.data() : null;
}

/** Creator ke saare trees. Returns { treeId: { role, treeName, createdAt } } */
export async function getTreesByUid(uid) {
  if (!uid) return {};
  const snap = await getDoc(byUidRef(uid));
  return snap.exists() ? (snap.data().trees || {}) : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN VERIFY  (editor ke liye)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PIN verify karo. Sahi hone par phone RTDB mein save karo.
 * @returns {{ ok: boolean, reason?: string }}
 */
export async function verifyPinAndSaveEditor(treeId, enteredPin, phone, name = '') {
  const tree = await getTree(treeId);
  if (!tree)                                  return { ok: false, reason: 'tree_not_found' };
  if (String(tree.pin) !== String(enteredPin)) return { ok: false, reason: 'wrong_pin' };

  // RTDB mein save karo
  const mobileKey = toMobileKey(phone);
  if (mobileKey) {
    const path     = editorPath(treeId, mobileKey);
    const existing = await rtdb.get(path);
    await rtdb.set(path, {
      phone,
      name:       name || existing?.name || '',
      verifiedAt: existing?.verifiedAt || now(),
      lastSeen:   now(),
    });
  }

  return { ok: true };
}

/**
 * Dobara aane par check — agar phone already verified hai to PIN mat maango.
 * lastSeen update bhi hota hai.
 */
export async function isVerifiedEditor(treeId, phone) {
  const mobileKey = toMobileKey(phone);
  if (!mobileKey) return false;
  const path = editorPath(treeId, mobileKey);
  const data = await rtdb.get(path);
  if (!data) return false;
  await rtdb.update(path, { lastSeen: now() });
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/** Nodes + rowOrder save karo (creator ya verified editor). */
export async function saveTreeData(treeId, nodes, rowOrder = null) {
  await updateDoc(treeRef(treeId), {
    nodes,
    rowOrder,
    updatedAt: now(),
  });
}

/** Naye invited contacts add karo (duplicates skip). */
export async function addInvitedContacts(treeId, newContacts = []) {
  const tree = await getTree(treeId);
  if (!tree) return;

  const existingPhones = new Set((tree.invited || []).map(i => i.phone));

  const toAdd = newContacts
    .filter(c => c.phone)
    .map(c => ({
      name:  c.name || '',
      phone: toFullMobile(c.countryCode || '+91', c.phone),
    }))
    .filter(c => !existingPhones.has(c.phone));

  if (!toAdd.length) return;

  await updateDoc(treeRef(treeId), {
    invited:   [...(tree.invited || []), ...toAdd],
    updatedAt: now(),
  });
}

/** Tree ka naam update karo. */
export async function updateTreeName(treeId, treeName) {
  await updateDoc(treeRef(treeId), { treeName, updatedAt: now() });
}

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP INVITE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WhatsApp share URL banao.
 * @param {string} treeId   — "42"
 * @param {string} pin      — "4821"
 * @param {string} treeName
 * @param {string} baseUrl  — default: current origin
 */
export function buildWhatsAppInvite(treeId, pin, treeName, baseUrl = window.location.origin) {
  const link = `${baseUrl}/tree/${treeId}`;
  const msg  =
    `🌳 *${treeName}*\n\n` +
    `Aapko vansh vriksha mein jodne ka niyantran hai.\n\n` +
    `👉 Link: ${link}\n` +
    `🔑 PIN: ${pin}\n\n` +
    `PIN daalkar aap data add/edit kar sakte hain.`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

// ── helper ────────────────────────────────────────────────────────────────────
const now = () => Date.now();

// ─────────────────────────────────────────────────────────────────────────────
// TREE GUEST → DIRECTORY USER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tree editor ko directory user banao.
 * Firebase Auth account already ban chuka hai (anonymous ya phone).
 * Yeh function RTDB mein member + user + mobileIndex save karta hai.
 *
 * @param {string} uid         — Firebase Auth uid
 * @param {string} treeId      — jis tree se aaya
 * @param {object} formData    — { name, phone, countryCode, email, city }
 * @returns {{ memberId, familyId }}
 */
export async function registerTreeGuestAsUser(uid, treeId, formData) {
  const { name, phone, countryCode = '+91', email = '', city = '' } = formData;

  // 1. Tree se naam confirm karo
  const tree     = await getTree(treeId);
  const treeName = tree?.treeName || 'Family';

  // 2. Member ID + timestamps
  const ts       = Date.now();
  const memberId = `MEM_${ts}`;

  // Abhi family ID nahi hai — tree se family baad mein banegi
  // Isliye familyId = null, status = 'pendingFamily'
  const writes = {};

  // 3. Member node
  writes[`members/${memberId}`] = {
    name,
    mobile:      phone,
    countryCode,
    email,
    stayCity:    city,
    familyId:    null,
    treeId,                    // kis tree se aaya — future linking ke liye
    createdAt:   ts,
    createdFrom: 'tree',
  };

  // 4. User node
  writes[`users/${uid}`] = {
    displayName: name,
    email:       email || null,
    mobile:      phone,
    countryCode,
    role:        'member',
    memberId,
    familyId:    null,
    treeId,
    status:      'active',
    createdAt:   ts,
  };

  // 5. mobileIndex — phone → uid + memberId link
  const mobileKey = toMobileKey(phone);
  if (mobileKey) {
    writes[`mobileIndex/${mobileKey}/isUser`]               = true;
    writes[`mobileIndex/${mobileKey}/userUid`]              = uid;
    writes[`mobileIndex/${mobileKey}/memberIds/${memberId}`] = true;
    writes[`mobileIndex/${mobileKey}/countryCode`]          = countryCode;
    writes[`mobileIndex/${mobileKey}/sources/tree`]         = true;
  }

  // 6. email index (agar diya ho)
  if (email) {
    const emailKey = email.toLowerCase().replace(/\./g, ',');
    writes[`usersByEmail/${emailKey}`] = uid;
  }

  // 7. treeEditors mein isUser flag set karo
  if (mobileKey) {
    writes[`treeEditors/${treeId}/${mobileKey}/isUser`]   = true;
    writes[`treeEditors/${treeId}/${mobileKey}/uid`]      = uid;
    writes[`treeEditors/${treeId}/${mobileKey}/memberId`] = memberId;
  }

  // Ek hi batch mein sab save
  await rtdb.batch(writes);

  return { memberId, familyId: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// TREE GUEST → DIRECTORY USER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tree editor ko directory user banao.
 * @param {string} uid       — Firebase Auth uid
 * @param {string} treeId    — jis tree se aaya
 * @param {object} formData  — { name, phone, countryCode, email, city }
 * @returns {{ memberId }}
 */