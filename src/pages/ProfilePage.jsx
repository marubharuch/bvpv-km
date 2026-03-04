/**
 * pages/ProfilePage.jsx
 * FIX BUG 4: Members uses getFamilyWithMembers() - real member objects not booleans
 * FIX BUG 6: Removed ghost familyContacts section
 * FIX BUG 8: PIN regeneration uses generateUniquePin()
 */
import { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { updateFamilyPin, getFamilyWithMembers } from "../services/familyService";
import { generateUniquePin } from "../services/familyRegistrationService";

export default function ProfilePage() {
  const [familyId, setFamilyId] = useState(null);
  const [family,   setFamily]   = useState(null);
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const loadFamily = async () => {
      const user = getAuth().currentUser;
      if (!user) { setLoading(false); return; }

      const uidSnap = await get(ref(db, `users/${user.uid}/familyId`));
      if (!uidSnap.exists()) { setLoading(false); return; }

      const famId = uidSnap.val();
      setFamilyId(famId);

      // FIX BUG 4: use getFamilyWithMembers which returns real member documents
      const famWithMembers = await getFamilyWithMembers(famId);
      if (famWithMembers) {
        const { members: memberList, ...famData } = famWithMembers;
        setFamily(famData);
        setMembers(Array.isArray(memberList) ? memberList : []);
      }
      setLoading(false);
    };
    loadFamily();
  }, []);

  if (loading) return <p className="p-4">Loading...</p>;
  if (!family) return <p className="p-4">No family found.</p>;

  const regeneratePin = async () => {
    try {
      // FIX BUG 8: generateUniquePin prevents collisions with other families
      const newPin = await generateUniquePin();
      await updateFamilyPin(familyId, newPin, String(family.familyPin));
      setFamily({ ...family, familyPin: newPin });
      alert("PIN updated successfully");
    } catch (e) {
      console.error("PIN regen failed:", e);
      alert("Failed to regenerate PIN. Please try again.");
    }
  };

  const logout = async () => {
    await signOut(getAuth());
    window.location.href = "/";
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Family Profile</h2>
        <p className="text-sm text-gray-600">City: <span className="font-semibold">{family.city || "—"}</span></p>
        <p className="text-sm text-gray-600">
          Family PIN: <span className="font-semibold">{family.familyPin}</span>
        </p>
        <button onClick={regeneratePin} className="mt-2 text-xs text-blue-600 underline">
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
            navigator.clipboard.writeText(`${window.location.origin}/join?familyId=${familyId}`);
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

      {/* FIX BUG 4: real member documents via getFamilyWithMembers() */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Family Members ({members.length})</h3>
        {members.length === 0 && (
          <p className="text-sm text-gray-400">No members linked yet.</p>
        )}
        {members.map((m) => (
          <div key={m.id} className="border-b py-2 text-sm flex items-center gap-2">
            {m.photoURL && (
              <img src={m.photoURL} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
            )}
            <div>
              <p className="font-semibold text-gray-800">{m.name || "—"}</p>
              <p className="text-xs text-gray-500">
                {m.mobile || ""}{m.email ? ` · ${m.email}` : ""}
              </p>
            </div>
            {m.isHead && (
              <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded">
                Head
              </span>
            )}
          </div>
        ))}
      </div>

      {/* FIX BUG 6: familyContacts section removed — field does not exist in schema/RTDB */}

      <div className="space-y-2">
        <button onClick={logout} className="w-full bg-red-500 text-white p-2 rounded">
          Logout
        </button>
      </div>

    </div>
  );
}
