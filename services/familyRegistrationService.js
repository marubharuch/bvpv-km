import { ref, update, get, push } from "firebase/database";
import { db } from "../firebase";

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

  // ⭐ AUTO FAMILY ID (no read, no billing increase)
  const familyId = push(ref(db, "families")).key;

  const familyPin = await generateUniquePin();
  const ts = Date.now();
  const updates = {};

  const membersMap = {};
  const memberIds = [];

  contacts.forEach((contact, index) => {
    const memberId = `MEM_${ts + index}`;
    memberIds.push(memberId);
    membersMap[memberId] = true;

    updates[`members/${memberId}`] = {
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      city: city,
      native: city,
      email: "",
      gender: "",
      isHead: index === 0,
      isStudent: false,
    };
  });

  updates[`families/${familyId}`] = {
    familyName: `${city} Family`,
    address: "",
    familyPin,
    members: membersMap,
  };

  updates[`familiesByPin/${familyPin}`] = familyId;

  if (user?.email) {
  const emailKey = user.email
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/@/g, "_");

  const userData = {
    email: user.email,
    familyId,
    memberId: memberIds[0],
    role: "guest",
  };

  // 🔴 OLD STRUCTURE — keep for compatibility
  updates[`users/${emailKey}`] = userData;

  // 🟢 NEW STANDARD — UID based
  if (user?.uid) {
    updates[`users/${user.uid}`] = userData;
  }

  // ⭐ OPTIONAL EMAIL INDEX (best practice)
  updates[`usersByEmail/${emailKey}`] = user?.uid || true;
}

  await update(ref(db), updates);

  return {
    familyId,
    familyPin,
    memberIds,
    headMemberId: memberIds[0],
  };
}