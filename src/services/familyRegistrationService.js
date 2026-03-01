/**
 * services/familyRegistrationService.js
 * Registration flow only — creates family + members + indexes atomically.
 */

import { ref, get, push } from "firebase/database";
import { db } from "../firebase";
import { batchWrite } from "./rtdbService";
import { memberSchema, familySchema } from "../schema/schema";
import { normalizeMobile } from "../utils/normalizePhone";
import { emailToKey } from "../utils/emailKey";

async function generateUniquePin() {
  for (let i = 0; i < 30; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await get(ref(db, `familiesByPin/${pin}`));
    if (!snap.exists()) return pin;
  }
  throw new Error("Could not generate a unique PIN.");
}

export async function submitFamilyRegistration({ city, contacts, user }) {
  if (!contacts || contacts.length === 0) {
    throw new Error("Add at least one family member.");
  }

  const selfIndex = contacts.findIndex(c => c.isSelf);
  if (selfIndex === -1) {
    throw new Error("Please select your contact (👤 Me).");
  }

  const familyId  = push(ref(db, "families")).key;
  const familyPin = await generateUniquePin();
  const ts        = Date.now();
  const updates   = {};

  const membersMap  = {};
  const memberIds   = [];
  let selfMemberId  = null;
  let headMemberId  = null;

  contacts.forEach((contact, index) => {
    const memberId = `MEM_${ts + index}`;
    memberIds.push(memberId);
    membersMap[memberId] = true;

    if (index === 0)         headMemberId = memberId;
    if (index === selfIndex) selfMemberId = memberId;

    const cleanMobile = normalizeMobile(contact.phone || contact.mobile || "");

    updates[`members/${memberId}`] = memberSchema({
      name:      contact.name.trim(),
      mobile:    cleanMobile,
      native:    city,
      isHead:    index === 0,
      isSelf:    contact.isSelf || false,
      familyId,
      createdAt: ts,
    });

    if (cleanMobile) {
      updates[`mobileIndex/${cleanMobile}/memberIds/${memberId}`]        = true;
      updates[`mobileIndex/${cleanMobile}/familyIds/${familyId}`]        = true;
      updates[`mobileIndex/${cleanMobile}/sources/familyRegistration`]   = true;
      updates[`mobileIndex/${cleanMobile}/createdAt`]                    = ts;
    }
  });

  updates[`families/${familyId}`] = familySchema({
    familyName:        `${city} Family`,
    city,
    familyPin,
    members:           membersMap,
    headMemberId,
    createdByMemberId: selfMemberId,
  });

  updates[`familiesByPin/${familyPin}`] = familyId;

  if (user?.uid) {
    const selfContact  = contacts[selfIndex];
    const selfMobileRaw = selfContact.phone || selfContact.mobile || "";
    const selfMobile    = normalizeMobile(selfMobileRaw);

    updates[`users/${user.uid}/familyId`] = familyId;
    updates[`users/${user.uid}/memberId`] = selfMemberId;
    updates[`users/${user.uid}/mobile`]   = selfMobile;
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
