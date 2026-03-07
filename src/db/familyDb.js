// db/familyDb.js — All reads/writes for `families` node.
// Cache layer added: family + members cached for 5 min to reduce Firebase reads.

import { ref, get }  from "firebase/database";
import { db }        from "../lib/firebase";
import { rtdb }      from "./rtdb";
import { familyDoc } from "./schema";
import { cache, TTL } from "../lib/cache";

const FAMILY_CACHE_KEY = (id) => `family:${id}`;

/** Generate a 4-digit PIN not already in use. */
export async function generatePin() {
  for (let i = 0; i < 30; i++) {
    const pin  = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await rtdb.get(`familiesByPin/${pin}`);
    if (!snap) return pin;
  }
  throw new Error("Could not generate unique PIN.");
}

/**
 * Fetch family data + all member documents.
 * Cache-first: returns cached result within TTL, else fetches from Firebase.
 * @param {string}  familyId
 * @param {boolean} forceRefresh — skip cache and re-fetch
 */
export async function getFamilyWithMembers(familyId, forceRefresh = false) {
  if (!familyId) return null;

  const cacheKey = FAMILY_CACHE_KEY(familyId);

  // Return cached value if fresh
  if (!forceRefresh) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  // Fetch from Firebase
  const fam = await rtdb.get(`families/${familyId}`);
  if (!fam) return null;

  const memberIds = Object.keys(fam.members || {});
  const snaps     = await Promise.all(memberIds.map(id => get(ref(db, `members/${id}`))));
  const members   = snaps.filter(s => s.exists()).map(s => ({ id: s.key, ...s.val() }));

  const result = { ...fam, members };

  // Store in cache with TTL
  await cache.set(cacheKey, result, TTL.FAMILY);

  return result;
}

/** Invalidate family cache (call after any write to family or members). */
export async function invalidateFamilyCache(familyId) {
  if (familyId) await cache.remove(FAMILY_CACHE_KEY(familyId));
}

/** Partial update of a family node + invalidate cache. */
export async function updateFamily(familyId, data) {
  await rtdb.update(`families/${familyId}`, data);
  await invalidateFamilyCache(familyId);
}

/** Update PIN atomically (remove old pin from index). */
export async function updateFamilyPin(familyId, newPin, oldPin = null) {
  const writes = {};
  writes[`families/${familyId}/familyPin`] = newPin;
  writes[`familiesByPin/${newPin}`]        = familyId;
  if (oldPin) writes[`familiesByPin/${oldPin}`] = null;
  await rtdb.batch(writes);
  await invalidateFamilyCache(familyId);
}
