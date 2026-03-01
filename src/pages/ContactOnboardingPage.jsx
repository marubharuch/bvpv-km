import { useState, useContext } from "react";
import { ref, get } from "firebase/database";
import { updateFamilyMember, updateUser } from "../services/rtdbService";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import localforage from "localforage";

export default function ContactOnboardingPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);

  // 📱 Pick Contacts
  const pickContacts = async () => {
    if (!("contacts" in navigator)) {
      alert("Contact picker not supported");
      return;
    }

    const picked = await navigator.contacts.select(
      ["name", "tel"],
      { multiple: true }
    );

    const mobiles = picked
      .map(c => c.tel?.[0]?.replace(/\D/g, ""))
      .filter(Boolean);

    setContacts(mobiles);
    await localforage.setItem("onboardingContacts", mobiles);
    checkFamiliesByMobile(mobiles);
  };

  // ✅ FIX: Use /mobileIndex instead of full families scan
  const checkFamiliesByMobile = async (mobiles) => {
    setChecking(true);

    let foundFamilyId = null;

    for (const mobile of mobiles) {
      const clean = mobile.replace(/\D/g, "").slice(-10);
      const snap = await get(ref(db, `mobileIndex/${clean}`));
      if (snap.exists()) {
        foundFamilyId = snap.val().familyId;
        break;
      }
    }

    if (foundFamilyId) {
      const famSnap = await get(ref(db, `families/${foundFamilyId}`));
      if (famSnap.exists()) {
        setFamily(famSnap.val());
        setFamilyId(foundFamilyId);
      }
    } else {
      navigate("/registration");
    }

    setChecking(false);
  };

  // 🔐 Join Family
  const joinFamily = async () => {
    if (!familyId || !user) return;

    if (family.familyPin != pin) {
      alert("Invalid PIN");
      return;
    }

    // ✅ Bug 5: fetch actual memberId, do not use user.uid as memberId
    const userSnap = await get(ref(db, `users/${user.uid}`));
    const userData = userSnap.exists() ? userSnap.val() : {};
    const ts = Date.now();
    const { batchWrite } = await import("../services/rtdbService");
    const { push } = await import("firebase/database");
    const writes = {};

    let resolvedMemberId = userData.memberId || null;
    if (!resolvedMemberId) {
      const newRef = push(ref(db, "members"));
      resolvedMemberId = newRef.key;
      writes[`members/${resolvedMemberId}`] = {
        name: user.displayName || user.email || "Member",
        mobile: userData.mobile || "",
        email: user.email || "",
        gender: "",
        dob: "",
        photoURL: user.photoURL || "",
        honoraryOrgs: [],
        isHead: false,
        isSelf: true,
        isStudent: false,
        familyId,
        createdAt: ts,
        joinedAt: ts,
      };
    }

    writes[`families/${familyId}/members/${resolvedMemberId}`] = true;
    writes[`users/${user.uid}/familyId`] = familyId;
    writes[`users/${user.uid}/memberId`] = resolvedMemberId;
    writes[`users/${user.uid}/role`] = "member";
    writes[`users/${user.uid}/status`] = "active";

    await batchWrite(writes);
    navigate("/dashboard");
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-5">

      <h2 className="text-xl font-bold text-center">
        Find Your Family
      </h2>

      <button
        onClick={pickContacts}
        className="w-full bg-blue-600 text-white p-3 rounded-lg"
      >
        Pick Family Contacts
      </button>

      {checking && (
        <p className="text-center text-gray-500">
          Checking families...
        </p>
      )}

      {/* 👨‍👩‍👧 Family Found */}
      {family && (
        <div className="bg-white shadow rounded-lg p-4 space-y-2">

          <h3 className="text-green-700 font-semibold text-center">
            Family Found ✅
          </h3>

          <p><b>Name:</b> {family.familyName}</p>
          <p><b>City:</b> {family.city}</p>

          <input
            type="number"
            placeholder="Enter Family PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full border p-2 rounded"
          />

          <button
            onClick={joinFamily}
            className="w-full bg-green-600 text-white p-3 rounded-lg"
          >
            Join Family
          </button>

          <button
            onClick={() => navigate("/registration")}
            className="w-full border p-2 rounded"
          >
            Not My Family
          </button>

        </div>
      )}

    </div>
  );
}