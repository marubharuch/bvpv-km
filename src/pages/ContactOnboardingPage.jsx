import { useState, useContext } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

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
    checkFamilies(mobiles);
  };

  // 🔍 Check Families
  const checkFamilies = async (mobiles) => {
    setChecking(true);

    const snap = await get(ref(db, "families"));
    let found = null;
    let foundId = null;

    snap.forEach(f => {
      const contacts = f.val().familyContacts || {};

      Object.values(contacts).forEach(c => {
        const m = c.mobile?.replace(/\D/g, "");
        if (mobiles.includes(m)) {
          found = f.val();
          foundId = f.key;
        }
      });
    });

    if (found) {
      setFamily(found);
      setFamilyId(foundId);
    } else {
      navigate("/registration"); // 🔴 No family found
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
