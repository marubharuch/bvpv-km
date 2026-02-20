// submitFamilyRegistration — FINAL VERSION (Basic Family Registration)

import { getDatabase, ref, push, set, get } from "firebase/database";
import { auth } from "../firebase";

/**
 * Generate unique 4-digit Family PIN
 */
const generateFamilyPin = async (db) => {
  for (let i = 0; i < 10; i++) {
    const pin = Math.floor(1000 + Math.random() * 9000);

    const snap = await get(ref(db, "families"));
    let exists = false;

    snap.forEach((child) => {
      if (child.val()?.familyPin === pin) exists = true;
    });

    if (!exists) return pin;
  }

  // fallback
  return Math.floor(1000 + Math.random() * 9000);
};

/**
 * MAIN FUNCTION
 * Creates new family with basic data
 */
export const submitFamilyRegistration = async (data) => {
  const db = getDatabase();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not authenticated");
  }

  if (!data.city || !data.members?.length) {
    throw new Error("City and members are required");
  }

  try {
    // 🥇 Generate Family ID
    const familyRef = push(ref(db, "families"));
    const familyId = familyRef.key;

    // 🥈 Generate PIN
    const familyPin = await generateFamilyPin(db);

    // 🥉 Clean members (no relation, no extra fields)
    const cleanMembers = data.members.map((m) => ({
      name: m.name || "",
      mobile: m.mobile || "",
      isStudent: false // default
    }));

    // 🏠 Save family
    const familyData = {
      city: data.city.trim(),
      members: cleanMembers,
      ownerUid: user.uid,
      familyPin,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await set(familyRef, familyData);

    // 👤 Link user → family
    await set(ref(db, `users/${user.uid}`), {
      familyId,
      name: user.displayName || "",
      email: user.email || "",
      joinedAt: Date.now()
    });

    return {
      familyId,
      familyPin,
      message: "Family registered successfully"
    };

  } catch (error) {
    console.error("Registration failed:", error);
    throw new Error("Failed to register family");
  }
};
