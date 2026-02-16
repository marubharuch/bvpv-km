import { useState, useContext } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import localforage from "localforage";


export default function UniversalOnboardingPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mobiles, setMobiles] = useState(["", ""]);
  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [pin, setPin] = useState("");

  const supportsContacts = "contacts" in navigator;

  // 📱 PICK CONTACTS
  const pickContacts = async () => {
  const picked = await navigator.contacts.select(
    ["name", "tel"],
    { multiple: true }
  );

  const numbers = picked
    .map(c => c.tel?.[0]?.replace(/\D/g, ""))
    .filter(Boolean)
    .slice(0, 2);

  setMobiles(numbers);

  // 💾 SAVE to localforage
  await localforage.setItem(
    "pendingFamilyContacts",
    numbers.map(m => ({ mobile: m }))
  );
};


  // ✏️ Update manual input
  const updateMobile = async (index, value) => {
  const copy = [...mobiles];
  copy[index] = value;
  setMobiles(copy);

  // 💾 SAVE updated list
  await localforage.setItem(
    "pendingFamilyContacts",
    copy
      .filter(Boolean)
      .map(m => ({ mobile: m }))
  );
};


  // 🔍 FIND FAMILY
  const findFamily = async () => {
    if (mobiles.some(m => !m)) {
      alert("Enter at least two mobile numbers");
      return;
    }

    const clean = mobiles.map(m => m.replace(/\D/g, ""));

    const snap = await get(ref(db, "families"));
    let found = null;
    let foundId = null;

    snap.forEach(f => {
      const contacts = f.val().familyContacts || {};

      let matches = 0;

      Object.values(contacts).forEach(c => {
        const m = c.mobile?.replace(/\D/g, "");
        if (clean.includes(m)) matches++;
      });

      if (matches >= 2) {
        found = f.val();
        foundId = f.key;
      }
    });

    if (found) {
      setFamily(found);
      setFamilyId(foundId);
    } else {
        await localforage.setItem(
    "pendingFamilyContacts",
    clean.map(m => ({ mobile: m }))
  );
      navigate("/registration");
    }
  };

  // 🤝 JOIN FAMILY
  const joinFamily = async () => {
    if (family.familyPin != pin) {
      alert("Invalid PIN");
      return;
    }

    await update(ref(db, `families/${familyId}/members/${user.uid}`), {
      name: user.displayName || user.email,
      joinedAt: Date.now()
    });

    await update(ref(db, `users/${user.uid}`), {
      familyId
    });

    navigate("/dashboard");
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-5">

      <h2 className="text-xl font-bold text-center">
        Wel Come to Kedavani Madal App
      </h2>

      {/* 📱 Contact Picker */}
      {supportsContacts && (
        <>
          <button
            onClick={pickContacts}
            className="w-full bg-blue-600 text-white p-3 rounded-lg"
          >
            Pick from Contacts
          </button>

          <div className="text-center text-gray-400">OR</div>
        </>
      )}

      {/* ✍️ Manual Entry */}
      <p className="text-sm text-center text-gray-600">
        Enter at least two  members  mobile numbers
      </p>

      {mobiles.map((m, i) => (
        <input
          key={i}
          placeholder={`Mobile ${i + 1}`}
          value={m}
          onChange={(e)=>updateMobile(i, e.target.value)}
          className="w-full border p-3 rounded-lg"
        />
      ))}

      <button
        onClick={findFamily}
        className="w-full bg-green-600 text-white p-3 rounded-lg"
      >
        Next
      </button>

      {/* 👨‍👩‍👧 FAMILY FOUND */}
      {family && (
        <div className="bg-white shadow rounded-lg p-4 space-y-2">

          <h3 className="text-green-700 font-semibold text-center">
            Family Found ✅
          </h3>

          <p><b>Name:</b> {family.familyName}</p>
          <p><b>City:</b> {family.city}</p>

          <input
            placeholder="Enter Family PIN"
            value={pin}
            onChange={(e)=>setPin(e.target.value)}
            className="w-full border p-2 rounded"
          />

          <button
            onClick={joinFamily}
            className="w-full bg-green-600 text-white p-3 rounded-lg"
          >
            Join Family
          </button>

          <button
            onClick={()=>navigate("/registration")}
            className="w-full border p-2 rounded"
          >
            Not My Family
          </button>

        </div>
      )}

    </div>
  );
}
