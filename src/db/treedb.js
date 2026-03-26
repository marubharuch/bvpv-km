// db/treeDb.js — All tree-related database operations
//
// ── Firestore  trees/{treeId} ─────────────────────────────────────────────────
//    treeName, pin, adminUid, createdAt
//    invited:  [ {name, phone} ]     ← still kept for PIN verify lookup
//    nodes:    { [nodeId]: {...} }
//    rowOrder: string[]
//    activityLog: [ {...} ]
//
// ── RTDB  invites/{mobileKey} ────────────────────────────────────────────────  ← NEW
//    name, phone, treeId, treeName, pin, invitedBy, invitedAt, status
//    Fast O(1) lookup: "has this phone already been invited anywhere?"
//
// ── RTDB  userTrees/{uid}/{treeId} ───────────────────────────────────────────
//    treeName, pin, joinedAt
//
// ── RTDB  treeEditors/{treeId}/{mobileKey} ───────────────────────────────────
//    phone, verifiedAt, isUser, uid, name
//
// ── RTDB  users/{uid} ────────────────────────────────────────────────────────
//    uid, displayName, mobile, email, city

import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc, arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';

import { rtdb }                                     from './rtdb';
import { generatePin, generateTreeId, toMobileKey } from '../lib/phone';

function fsdb() { return getFirestore(); }

// ─── CREATE TREE ──────────────────────────────────────────────────────────────

export async function createTree(uid, treeName) {
  const treeId = generateTreeId();
  const pin    = generatePin();

  await setDoc(doc(fsdb(), 'trees', treeId), {
    treeName:  treeName || 'My Family Tree',
    pin,
    adminUid:  uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    invited:   [],
    nodes:     {},
    rowOrder:  null,
  });

  await rtdb.set(`userTrees/${uid}/${treeId}`, {
    treeName:  treeName || 'My Family Tree',
    pin,
    createdAt: Date.now(),
  });

  return { treeId, pin };
}

// ─── GET TREE ─────────────────────────────────────────────────────────────────

export async function getTree(treeId) {
  const snap = await getDoc(doc(fsdb(), 'trees', treeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── GET TREES BY UID ─────────────────────────────────────────────────────────

export async function getTreesByUid(uid) {
  const data = await rtdb.get(`userTrees/${uid}`);
  return data || {};
}

// ─── CHECK INVITE — O(1) RTDB lookup ─────────────────────────────────────────
//
// Before adding a contact, check if this phone was already invited.
// Returns existing invite data or null.
//
// RTDB path: invites/{mobileKey}
// Example:   invites/919974021397
//
// Returns:
//   null                                   → not invited yet, safe to proceed
//   { name, phone, treeId, treeName, pin, invitedBy, invitedAt, status }
//                                          → already invited

export async function checkInvite(fullPhone) {
  const mobileKey = toMobileKey(fullPhone);
  const data      = await rtdb.get(`invites/${mobileKey}`);
  return data || null;
}

// ─── SAVE INVITE — write to RTDB invites node ─────────────────────────────────
//
// Called after tree is created and contacts confirmed.
// Writes to BOTH:
//   RTDB  invites/{mobileKey}             ← fast lookup
//   Firestore  trees/{treeId}/invited[]   ← used by PIN verify

export async function saveInvite(treeId, treeName, pin, invitedByUid, contact) {
  const mobileKey = toMobileKey(contact.phone);

  // RTDB — fast lookup node
  await rtdb.set(`invites/${mobileKey}`, {
    name:       contact.name  || '',
    phone:      contact.phone || '',
    treeId,
    treeName,
    pin,
    invitedBy:  invitedByUid || '',
    invitedAt:  Date.now(),
    status:     'pending',   // 'pending' | 'joined'
  });

  // Firestore — inside tree document (used by verifyPinAndSaveEditor)
  await updateDoc(doc(fsdb(), 'trees', treeId), {
    invited: arrayUnion({
      name:  contact.name  || '',
      phone: contact.phone || '',
    }),
  });
}

// ─── SAVE ALL INVITES — batch save contacts after tree creation ───────────────
//
// Called once after tree created with all confirmed contacts.
// Replaces old addInvitedContacts().

export async function saveAllInvites(treeId, treeName, pin, invitedByUid, contacts) {
  // Save each contact to RTDB invites node in parallel
  await Promise.all(
    contacts.map(c => saveInvite(treeId, treeName, pin, invitedByUid, c))
  );
}

// ─── MARK INVITE JOINED — called when user registers ─────────────────────────

export async function markInviteJoined(fullPhone, uid) {
  const mobileKey = toMobileKey(fullPhone);
  try {
    await rtdb.update(`invites/${mobileKey}`, {
      status:   'joined',
      uid,
      joinedAt: Date.now(),
    });
  } catch (e) {
    console.warn('markInviteJoined failed:', e);
  }
}

// ─── ADD INVITED CONTACTS (legacy — kept for member invite flow) ──────────────
// Member inviting someone mid-tree uses this.
// Also writes to RTDB invites node.

export async function addInvitedContacts(treeId, contacts, invitedByUid = '') {
  // Get tree for treeName + pin
  const tree = await getTree(treeId);
  if (!tree) return;

  await Promise.all(
    contacts.map(c => saveInvite(treeId, tree.treeName, tree.pin, invitedByUid, c))
  );
}

// ─── VERIFY PIN & SAVE EDITOR ─────────────────────────────────────────────────

export async function verifyPinAndSaveEditor(treeId, enteredPin, fullPhone) {
  const tree = await getTree(treeId);
  if (!tree) return { ok: false, reason: 'tree_not_found' };

  // Check 1: PIN must match
  if (String(tree.pin) !== String(enteredPin)) {
    return { ok: false, reason: 'wrong_pin' };
  }

  // Check 2: phone must be in invited[] OR in RTDB invites node
  const normalised = fullPhone.replace(/\s/g, '');

  // Check Firestore invited[] first
  const invitedEntry = (tree.invited || []).find(
    i => i.phone && i.phone.replace(/\s/g, '') === normalised
  );

  // Also check RTDB invites node (faster, more reliable)
  const mobileKey  = toMobileKey(fullPhone);
  const inviteData = !invitedEntry
    ? await rtdb.get(`invites/${mobileKey}`)
    : null;

  // Check if this is the admin
  const adminData = tree.adminUid
    ? await rtdb.get(`users/${tree.adminUid}`)
    : null;
  const isAdmin = adminData?.mobile?.replace(/\s/g, '') === normalised;

  const isInvited = !!(invitedEntry || (inviteData?.treeId === treeId) || isAdmin);

  if (!isInvited) {
    return { ok: false, reason: 'not_invited' };
  }

  // All checks passed — save as verified editor
  await rtdb.set(`treeEditors/${treeId}/${mobileKey}`, {
    phone:      fullPhone,
    name:       invitedEntry?.name || inviteData?.name || '',
    verifiedAt: Date.now(),
    isUser:     false,
  });

  return { ok: true };
}

// ─── IS VERIFIED EDITOR ───────────────────────────────────────────────────────

export async function isVerifiedEditor(treeId, fullPhone) {
  const mobileKey = toMobileKey(fullPhone);
  const data      = await rtdb.get(`treeEditors/${treeId}/${mobileKey}`);
  return !!data;
}

// ─── GET INVITED PERSON NAME BY PHONE ────────────────────────────────────────

export function getInvitedName(tree, fullPhone) {
  if (!tree?.invited?.length) return '';
  const normalised = fullPhone.replace(/\s/g, '');
  const match = tree.invited.find(i =>
    i.phone && i.phone.replace(/\s/g, '') === normalised
  );
  return match?.name || '';
}

// ─── BUILD WHATSAPP INVITE ────────────────────────────────────────────────────

export function buildWhatsAppInvite(treeId, pin, treeName) {
  const joinUrl = `${window.location.origin}/tree/${treeId}`;
  const msg = encodeURIComponent(
    `🌳 ${treeName || 'Family Tree'} mein join karo!\n` +
    `Link: ${joinUrl}\n` +
    `PIN: ${pin}\n\n` +
    `Link kholo, PIN daalo aur family tree dekho / edit karo.`
  );
  return `https://wa.me/?text=${msg}`;
}

// ─── REGISTER TREE GUEST AS USER ──────────────────────────────────────────────

export async function registerTreeGuestAsUser(uid, treeId, { name, phone, email }) {
  const mobileKey = toMobileKey(phone);

  const existing    = await rtdb.get(`users/${uid}`);
  const wasExisting = !!existing;

  await rtdb.set(`users/${uid}`, {
    uid,
    displayName: name,
    mobile:      phone,
    email:       email || '',
    createdAt:   existing?.createdAt || Date.now(),
    updatedAt:   Date.now(),
  });

  const tree = await getTree(treeId);
  await rtdb.set(`userTrees/${uid}/${treeId}`, {
    treeName: tree?.treeName || '',
    pin:      tree?.pin      || '',
    joinedAt: Date.now(),
  });

  await rtdb.update(`treeEditors/${treeId}/${mobileKey}`, {
    isUser: true,
    uid,
    name,
  });

  // Mark invite as joined
  await markInviteJoined(phone, uid);

  return { wasExisting };
}

// ─── APPEND ACTIVITY LOG ──────────────────────────────────────────────────────

export async function appendLog(treeId, entry) {
  if (!treeId || !entry) return;
  try {
    await updateDoc(doc(fsdb(), 'trees', treeId), {
      activityLog: arrayUnion({
        uid:       entry.uid       || 'unknown',
        name:      entry.name      || 'Someone',
        action:    entry.action    || '',
        target:    entry.target    || '',
        detail:    entry.detail    || '',
        timestamp: entry.timestamp || Date.now(),
      }),
    });
  } catch (e) {
    console.warn('appendLog failed:', e);
  }
}
