import { getDatabase, ref, push, set, update, get } from "firebase/database";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword
} from "firebase/auth";
import { clearStudentDraft } from "../utils/studentStorage";
import { auth } from "../firebase";

export const submitStudentRegistration = async (student, editId = null) => {
  const db = getDatabase();

  // 🔍 Validation
  if (!student.name || !student.dob || !student.mobile)
    throw new Error("Student basic details missing");

  // 🔐 AUTH only if user not logged in
  let user = auth.currentUser;

  if (!user) {
    if (!student.email) throw new Error("Email required");

    if (student.email.endsWith("@gmail.com")) {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      user = res.user;
    } else {
      const password = prompt("Enter password:");
      const res = await signInWithEmailAndPassword(auth, student.email, password)
        .catch(async () => {
          return await createUserWithEmailAndPassword(auth, student.email, password);
        });
      user = res.user;
    }
  }

  // 🔎 Find if user already belongs to a family
  const snap = await get(ref(db, "families"));
  let familyId = null;
  let familyData = null;

  snap.forEach(f => {
    if (f.child("members").hasChild(user.uid)) {
      familyId = f.key;
      familyData = f.val();
    }
  });

  // 🟢 CASE 1 — EDIT STUDENT
  if (editId && familyId) {
    await update(ref(db, `families/${familyId}/students/${editId}`), student);
    await clearStudentDraft();
    return { mode: "updated" };
  }

  // 🟢 CASE 2 — ADD STUDENT TO EXISTING FAMILY
  if (familyId) {
    const newId = "STU_" + Date.now();

    await update(ref(db, `families/${familyId}/students/${newId}`), student);
    await clearStudentDraft();
    return { mode: "added" };
  }

  // 🟢 CASE 3 — NEW FAMILY REGISTRATION
  if (!student.familyContacts?.length)
    throw new Error("Add at least one family contact");

  const familyRef = push(ref(db, "families"));
  familyId = familyRef.key;
  const familyPin = Math.floor(1000 + Math.random() * 9000);

  await set(ref(db, `families/${familyId}`), {
    ownerUid: user.uid,
    familyPin,
    createdAt: Date.now(),
    familyContacts: student.familyContacts || [],
    members: {
      [user.uid]: { role: "owner", email: user.email }
    },
    students: { STU_1: student }
  });
  await set(ref(db, `users/${user.uid}`), {
  familyId: familyRef.key,
  role: "owner"
});


  await clearStudentDraft();

  return { mode: "new", familyPin, familyId };
};
