import { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";

export default function ProfilePage() {
  const [familyId, setFamilyId] = useState(null);
  const [family, setFamily] = useState(null);

  useEffect(() => {
    const loadFamily = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      const snap = await get(ref(db, "families"));

      snap.forEach(f => {
        if (f.child("members").hasChild(user.uid)) {
          setFamilyId(f.key);
          setFamily(f.val());
        }
      });
    };

    loadFamily();
  }, []);

  if (!family) return <p className="p-4">Loading...</p>;

  const regeneratePin = async () => {
    const newPin = Math.floor(1000 + Math.random() * 9000);
    await update(ref(db, `families/${familyId}`), { familyPin: newPin });
    setFamily({ ...family, familyPin: newPin });
    alert("PIN updated");
  };

  const logout = async () => {
    await signOut(getAuth());
    window.location.href = "/";
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      {/* Family Info */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Family Profile</h2>
        <p className="text-sm text-gray-600">
          Family PIN: <span className="font-semibold">{family.familyPin}</span>
        </p>

        <button
          onClick={regeneratePin}
          className="mt-2 text-xs text-blue-600 underline"
        >
          Regenerate PIN
        </button>
      </div>
      <div className="bg-white p-4 rounded shadow">
  <h3 className="font-semibold mb-2">Invite Family Member</h3>

  <p className="text-sm text-gray-600 mb-2">
    Share this link and PIN with family member to join.
  </p>

  <input
    readOnly
    value={`${window.location.origin}/join?familyId=${familyId}`}
    className="border w-full p-2 rounded text-sm mb-2"
  />

  <button
    onClick={() => {
      navigator.clipboard.writeText(
        `${window.location.origin}/join?familyId=${familyId}`
      );
      alert("Invite link copied");
    }}
    className="w-full bg-blue-600 text-white p-2 rounded mb-2"
  >
    Copy Invite Link
  </button>

  <button
    onClick={() => {
      const msg = `Join our family app.\nLink: ${window.location.origin}/join?familyId=${familyId}\nPIN: ${family.familyPin}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
    }}
    className="w-full bg-green-600 text-white p-2 rounded"
  >
    Share on WhatsApp
  </button>
</div>


      {/* Family Contacts */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Family Contacts</h3>

        {family.familyContacts?.map((c, i) => (
          <div key={i} className="border-b py-2">
            <p className="font-medium">{c.name}</p>
            <p className="text-sm text-gray-600">
              {c.phone} • {c.relation}
            </p>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Joined Members</h3>

        {Object.values(family.members || {}).map((m, i) => (
          <div key={i} className="border-b py-2 text-sm">
            {m.email} ({m.role})
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button className="w-full bg-gray-200 p-2 rounded">
          Edit Family Details
        </button>

        <button
          onClick={logout}
          className="w-full bg-red-500 text-white p-2 rounded"
        >
          Logout
        </button>
      </div>

    </div>
  );
}
