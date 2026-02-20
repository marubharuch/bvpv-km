import { getDatabase, ref, push, get, update } from "firebase/database";
import { auth } from "../firebase";

const generateFamilyPin = async (db) => {
  while (true) {
    const pin = Math.floor(1000 + Math.random() * 9000);
    const snap = await get(ref(db, `familyPins/${pin}`));
    if (!snap.exists()) return pin;
  }
};

export const submitFamilyRegistration = async (data) => {
  const db = getDatabase();
  const user = auth.currentUser;

  if (!user) throw new Error("User not authenticated");
  if (!data.city || !data.members?.length)
    throw new Error("City and members are required");

  try {
    // 🔹 Create Family ID + PIN
    const familyRef = push(ref(db, "families"));
    const familyId = familyRef.key;
    const familyPin = await generateFamilyPin(db);

    const batchUpdates = {};
    let headMemberId = null;

    // 🔹 Create members
    data.members.forEach((m, i) => {
      const memberId = `MEM_${Date.now()}_${i}`;
      if (i === 0) headMemberId = memberId;

      // Save full member data
      batchUpdates[`members/${memberId}`] = {
        name: m.name || "",
        phone: m.mobile || "",
        city: data.city.trim(),
        native: data.native?.trim() || "",
        isStudent: false,
        isHead: i === 0,
        relation: m.relation || (i === 0 ? "Head" : "Member"),
      };

      // Link member → family
      batchUpdates[`families/${familyId}/members/${memberId}`] = true;

      // Mobile index
      if (m.mobile) {
        const clean = m.mobile.replace(/\D/g, "").slice(-10);
        if (clean.length === 10) {
          batchUpdates[`mobileIndex/${clean}`] = { familyId, memberId };
        }
      }
    });

    const headMember = data.members[0];

    // 🔹 Family info (NO members field here)
    batchUpdates[`families/${familyId}`] = {
      city: data.city.trim(),
      native: data.native?.trim() || "",
      address: data.address?.trim() || "",
      ownerUid: user.uid,
      familyPin,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 🔹 User → family + member mapping
    batchUpdates[`users/${user.uid}`] = {
      familyId,
      memberId: headMemberId,
      role: "admin",
      name: user.displayName || "",
      email: user.email || "",
      joinedAt: Date.now(),
    };

    // 🔹 Email index (for login mapping)
    const emailKey = user.email
      .trim()
      .toLowerCase()
      .replace(/\./g, ",")
      .replace(/@/g, "_");

    batchUpdates[`emailIndex/${emailKey}`] = {
      email: user.email,
      familyId,
      memberId: headMemberId,
      role: "admin",
    };

    // 🔹 PIN index
    batchUpdates[`familyPins/${familyPin}`] = familyId;

    // 🔹 Directory node
    batchUpdates[`directory/${familyId}`] = {
      headName: headMember?.name || "",
      mobile: headMember?.mobile || "",
      city: data.city.trim(),
      native: data.native?.trim() || "",
      memberCount: data.members.length,
      pin: familyPin,
      updatedAt: Date.now(),
    };

    await update(ref(db), batchUpdates);

    return { familyId, familyPin, message: "Family registered successfully" };

  } catch (error) {
    console.error("Registration failed:", error);
    throw new Error("Failed to register family");
  }
};