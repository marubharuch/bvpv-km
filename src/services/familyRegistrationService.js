// src/services/familyRegistrationService.js

import { ref, update, get, push } from "firebase/database";
import { db } from "../firebase";

// ─────────────────────────────────────────────
// Generate unique 4-digit family PIN
// ─────────────────────────────────────────────
async function generateUniquePin() {
  for (let i = 0; i < 30; i++) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await get(ref(db, `familiesByPin/${pin}`));
    if (!snap.exists()) return pin;
  }
  throw new Error("Could not generate a unique PIN.");
}

// ─────────────────────────────────────────────
// MAIN SERVICE
// ─────────────────────────────────────────────
export async function submitFamilyRegistration({
  city,
  contacts,
  user
}) {
  if (!contacts || contacts.length === 0) {
    throw new Error("Add at least one family member.");
  }

  // ⭐ Ensure creator selected
  const selfIndex = contacts.findIndex((c) => c.isSelf);
  if (selfIndex === -1) {
    throw new Error("Please select your contact (👤 Me).");
  }

  // ⭐ Create family ID
  const familyId = push(ref(db, "families")).key;

  // ⭐ Generate PIN
  const familyPin = await generateUniquePin();

  const ts = Date.now();
  const updates = {};

  const membersMap = {};
  const memberIds = [];

  let selfMemberId = null;
  let headMemberId = null;

  // ─────────────────────────────────────────────
  // CREATE MEMBERS + MOBILE INDEX
  // ─────────────────────────────────────────────
  contacts.forEach((contact, index) => {
    const memberId = `MEM_${ts + index}`;
    memberIds.push(memberId);
    membersMap[memberId] = true;

    if (index === 0) headMemberId = memberId;
    if (index === selfIndex) selfMemberId = memberId;

    const mobile = contact.phone.trim();

    // ⭐ MEMBER NODE (no city here)
    updates[`members/${memberId}`] = {
      name: contact.name.trim(),
      phone: mobile,
      native: city,
      email: "",
      gender: "",
      isHead: index === 0,
      isSelf: contact.isSelf || false,
      isStudent: false,
    };

    // ⭐ MOBILE INDEX UPDATE
    updates[`mobileIndex/${mobile}/memberIds/${memberId}`] = true;
    updates[`mobileIndex/${mobile}/familyIds/${familyId}`] = true;
    updates[`mobileIndex/${mobile}/sources/familyRegistration`] = true;
    updates[`mobileIndex/${mobile}/createdAt`] = ts;
  });

  // ─────────────────────────────────────────────
  // FAMILY NODE (city stored here)
  // ─────────────────────────────────────────────
  updates[`families/${familyId}`] = {
    familyName: `${city} Family`,
    city,
    address: "",
    familyPin,
    members: membersMap,
    headMemberId,
    createdByMemberId: selfMemberId,
  };

  updates[`familiesByPin/${familyPin}`] = familyId;

  // ─────────────────────────────────────────────
  // LINK USER → MEMBER
  // ─────────────────────────────────────────────
  if (user?.uid) {
    const selfMobile = contacts[selfIndex].phone.trim();

    updates[`users/${user.uid}/familyId`] = familyId;
    updates[`users/${user.uid}/memberId`] = selfMemberId;
    updates[`users/${user.uid}/mobile`] = selfMobile;
    updates[`users/${user.uid}/role`] = "member";
    updates[`users/${user.uid}/status`] = "active";

    // ⭐ MOBILE INDEX — mark as registered user
    updates[`mobileIndex/${selfMobile}/isUser`] = true;
    updates[`mobileIndex/${selfMobile}/userUid`] = user.uid;
  }

  // ─────────────────────────────────────────────
  // EMAIL INDEX (optional but recommended)
  // ─────────────────────────────────────────────
  if (user?.email) {
    const emailKey = user.email
      .toLowerCase()
      .replace(/\./g, ",")
      .replace(/@/g, "_");

    updates[`usersByEmail/${emailKey}`] = user.uid;
  }

  // ─────────────────────────────────────────────
  // SINGLE ATOMIC WRITE
  // ─────────────────────────────────────────────
  await update(ref(db), updates);

  return {
    familyId,
    familyPin,
    memberIds,
    headMemberId,
    selfMemberId,
  };
}