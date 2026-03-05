/**
 * services/familyRegistrationService.js
 * FIX BUG 2: pass native:city to familySchema
 * FIX BUG 3: memberSchema now has native (schema fix)
 * FIX BUG 8: export generateUniquePin so ProfilePage can reuse it
 * FIX BUG 9: auto-mark contacts[0] as isSelf if none tagged
 */
import { ref, get, push } from "firebase/database";
import { db } from  "../lib/firebase"
import { batchWrite } from "./rtdbService";
import { memberSchema, familySchema } from "../schema/schema";
import { normalizeMobile } from "../utils/normalizePhone";
import { emailToKey } from "../utils/emailKey";

export async function generateUniquePin() {
  for (let i = 0; i < 30; i++) {
    const pin  = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await get(ref(db, `familiesByPin/${pin}`));
    if (!snap.exists()) return pin;
  }
  throw new Error("Could not generate a unique PIN after 30 attempts.");
}

export async function submitFamilyRegistration({ city, contacts, user }) {
  if (!contacts || contacts.length === 0) {
    throw new Error("Add at least one family member.");
  }

  // ── Guard: ensure user is not already in a family ──────────────
  // This is the server-side check — protects against race conditions,
  // double-taps, or direct URL access bypassing the UI check.
  const userSnap = await get(ref(db, `users/${user.uid}`));
  if (userSnap.exists() && userSnap.val()?.familyId) {
    throw new Error("ALREADY_IN_FAMILY");
  }

  // FIX BUG 9: guarantee one contact is marked isSelf
  const hasSelf = contacts.some(c => c.isSelf);
  const normalizedContacts = hasSelf
    ? contacts
    : contacts.map((c, i) => (i === 0 ? { ...c, isSelf: true } : c));

  const familyId  = push(ref(db, "families")).key;
  const familyPin = await generateUniquePin();
  const ts        = Date.now();
  const updates   = {};

  const membersMap  = {};
  const memberIds   = [];
  let   selfMemberId = null;
  let   headMemberId = null;

  normalizedContacts.forEach((contact, index) => {
    const memberId = `MEM_${ts + index}`;
    memberIds.push(memberId);
    membersMap[memberId] = true;

    if (index === 0) headMemberId = memberId;
    if (contact.isSelf) selfMemberId = memberId;

    const cleanMobile = normalizeMobile(contact.phone || contact.mobile || "");

    const memberData = {
      name:      contact.name.trim(),
      mobile:    cleanMobile,
      native:    city,             // FIX BUG 3: schema now accepts this field
      isHead:    index === 0,
      isSelf:    contact.isSelf || false,
      familyId,
      createdAt: ts,
    };

    if (contact.isSelf && user?.email) {
      memberData.email = user.email;
    }

    updates[`members/${memberId}`] = memberSchema(memberData);

    if (cleanMobile) {
      updates[`mobileIndex/${cleanMobile}/memberIds/${memberId}`]      = true;
      updates[`mobileIndex/${cleanMobile}/familyIds/${familyId}`]      = true;
      updates[`mobileIndex/${cleanMobile}/sources/familyRegistration`] = true;
      updates[`mobileIndex/${cleanMobile}/createdAt`]                  = ts;
    }
  });

  if (!selfMemberId) {
    throw new Error("Self member not found. This should never happen.");
  }

  // FIX BUG 2: pass native: city to familySchema
  updates[`families/${familyId}`] = familySchema({
    familyName:        `${city} Family`,
    city,
    native:            "",   // FIX BUG 2
    familyPin,
    members:           membersMap,
    headMemberId,
    createdByMemberId: selfMemberId,
  });

  updates[`familiesByPin/${familyPin}`] = familyId;

  if (user?.uid) {
    const selfContact = normalizedContacts.find(c => c.isSelf);
    const selfMobile  = normalizeMobile(selfContact?.phone || selfContact?.mobile || "");

    updates[`users/${user.uid}/familyId`] = familyId;
    updates[`users/${user.uid}/memberId`] = selfMemberId;
    updates[`users/${user.uid}/mobile`]   = selfMobile;   // 10-digit normalized
    updates[`users/${user.uid}/role`]     = "member";
    updates[`users/${user.uid}/status`]   = "active";

    if (selfMobile) {
      updates[`mobileIndex/${selfMobile}/isUser`]  = true;
      updates[`mobileIndex/${selfMobile}/userUid`] = user.uid;
    }
  }

  if (user?.email) {
    updates[`usersByEmail/${emailToKey(user.email)}`] = user.uid;
  }

  await batchWrite(updates);

  return { familyId, familyPin, memberIds, headMemberId, selfMemberId };
}