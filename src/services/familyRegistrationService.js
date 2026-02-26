// src/services/familyRegistrationService.js

import { ref, update, get, push } from "firebase/database";
import { db } from "../firebase";

// ─────────────────────────────────────────────
// Normalize mobile — handles Indian and international numbers
// ─────────────────────────────────────────────
function normalizeMobile(mobile) {
  if (!mobile) return "";
  const cleaned = String(mobile).trim();
  if (cleaned.startsWith("+")) {
    // International format — remove spaces, dashes, brackets only
    return cleaned.replace(/[\s\-\(\)]/g, "");
  }
  // No + prefix — assume India, strip to 10 digits
  return cleaned.replace(/\D/g, "").slice(-10);
}

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

  const selfIndex = contacts.findIndex((c) => c.isSelf);
  if (selfIndex === -1) {
    throw new Error("Please select your contact (👤 Me).");
  }

  const familyId = push(ref(db, "families")).key;
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

    // ✅ FIX 1: normalize mobile before storing and indexing
    const mobile = normalizeMobile(contact.phone);

    const isSelf = contact.isSelf || false;

    // Member node — same as app writes
    updates[`members/${memberId}`] = {
      name:    contact.name.trim(),
      mobile,
      native:  city,
      email:   isSelf ? (user?.email || "") : "",
      isHead:  index === 0,
      isSelf,
      familyId, // ✅ always write familyId at registration
    };

    // ✅ FIX 1: use normalized mobile as mobileIndex key
    if (mobile) {
      updates[`mobileIndex/${mobile}/memberIds/${memberId}`] = true;
      updates[`mobileIndex/${mobile}/familyIds/${familyId}`] = true;
      updates[`mobileIndex/${mobile}/sources/familyRegistration`] = true;
      updates[`mobileIndex/${mobile}/createdAt`] = ts;
    }
  });

  // ─────────────────────────────────────────────
  // FAMILY NODE
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
    const selfMobile = normalizeMobile(contacts[selfIndex].phone); // ✅ FIX 1

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

  // ─────────────────────────────────────────────
  // EMAIL INDEX
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