// src/services/familyRegistrationService.js

import { ref, get, push } from "firebase/database";
import { batchWrite } from "./rtdbService";
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

    const mobile = (contact.phone || contact.mobile || "").trim();
    // ✅ Bug 4: normalize mobile before indexing
    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);

    // ✅ Bug 3 + Bug 8: added familyId, createdAt, photoURL, honoraryOrgs to member node
    updates[`members/${memberId}`] = {
      name: contact.name.trim(),
      mobile: cleanMobile,
      native: city,
      email: "",
      gender: "",
      photoURL: "",
      honoraryOrgs: [],
      isHead: index === 0,
      isSelf: contact.isSelf || false,
      isStudent: false,
      familyId,
      createdAt: ts,
    };

    // ✅ Bug 4: use cleanMobile as index key
    if (cleanMobile) {
      updates[`mobileIndex/${cleanMobile}/memberIds/${memberId}`] = true;
      updates[`mobileIndex/${cleanMobile}/familyIds/${familyId}`] = true;
      updates[`mobileIndex/${cleanMobile}/sources/familyRegistration`] = true;
      updates[`mobileIndex/${cleanMobile}/createdAt`] = ts;
    }
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
    const selfMobileRaw = (contacts[selfIndex].phone || contacts[selfIndex].mobile || "").trim();
    const selfMobile = selfMobileRaw.replace(/\D/g, "").slice(-10); // ✅ normalized

    updates[`users/${user.uid}/familyId`] = familyId;
    updates[`users/${user.uid}/memberId`] = selfMemberId;
    updates[`users/${user.uid}/mobile`] = selfMobile;
    updates[`users/${user.uid}/role`] = "member";
    updates[`users/${user.uid}/status`] = "active";

    // ✅ MOBILE INDEX — mark as registered user (normalized key)
    if (selfMobile) {
      updates[`mobileIndex/${selfMobile}/isUser`] = true;
      updates[`mobileIndex/${selfMobile}/userUid`] = user.uid;
    }
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
  await batchWrite(updates);

  return {
    familyId,
    familyPin,
    memberIds,
    headMemberId,
    selfMemberId,
  };
}