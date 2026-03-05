// db/familyDb.js — All reads/writes for `families` node.

import { ref, get } from "firebase/database";
import { db }        from "../lib/firebase";
import { rtdb }      from "./rtdb";
import { familyDoc } from "./schema";

/** Generate a 4-digit PIN not already in use. */
export async function generatePin() {
  for (let i = 0; i < 30; i++) {
    const pin  = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await rtdb.get(`familiesByPin/${pin}`);
    if (!snap) return pin;
  }
  throw new Error("Could not generate unique PIN.");
}

/** Fetch family data + all member documents. */
export async function getFamilyWithMembers(familyId) {
  const fam = await rtdb.get(`families/${familyId}`);
  if (!fam) return null;

  const memberIds = Object.keys(fam.members || {});
  const snaps     = await Promise.all(memberIds.map(id => get(ref(db, `members/${id}`))));
  const members   = snaps.filter(s => s.exists()).map(s => ({ id: s.key, ...s.val() }));

  return { ...fam, members };
}

/** Partial update of a family node. */
export function updateFamily(familyId, data) {
  return rtdb.update(`families/${familyId}`, data);
}

/** Update PIN atomically (remove old pin from index). */
export async function updateFamilyPin(familyId, newPin, oldPin = null) {
  const writes = {};
  writes[`families/${familyId}/familyPin`] = newPin;
  writes[`familiesByPin/${newPin}`]        = familyId;
  if (oldPin) writes[`familiesByPin/${oldPin}`] = null;
  await rtdb.batch(writes);
}
