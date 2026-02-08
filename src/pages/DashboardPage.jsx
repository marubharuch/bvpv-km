import { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function FamilyDashboardPage() {
  const [familyId, setFamilyId] = useState(null);
  const [family, setFamily] = useState(null);
  const [showMemberPopup, setShowMemberPopup] = useState(false);
const [newMember, setNewMember] = useState({ name: "", phone: "", relation: "" });

  const navigate = useNavigate();

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
  };

  const logout = async () => {
    await signOut(getAuth());
    window.location.href = "/";
  };

  const invite = () => {
    const msg = `Join our family.\nLink: ${window.location.origin}/join?familyId=${familyId}\nPIN: ${family.familyPin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      {/* FAMILY PROFILE */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-1">Family Profile</h2>
        <p className="text-sm text-gray-600">
          PIN: <span className="font-semibold">{family.familyPin}</span>
        </p>
        <button
          onClick={regeneratePin}
          className="text-xs text-blue-600 underline mt-1"
        >
          Regenerate PIN
        </button>
      </div>

      {/* STUDENTS */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Students</h3>

        {Object.entries(family.students || {}).map(([id, s]) => (
          <div key={id} className="flex justify-between items-center border-b py-2">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gray-600">{s.standard || s.educationType}</p>
              <button
                onClick={() => navigate(`/registration?edit=${id}`)}
                className="text-blue-600 text-xs"
              >
                Edit
              </button>
            </div>

            {!family.members?.[id] && (
              <button
                onClick={invite}
                className="text-green-600 text-xs"
              >
                Invite
              </button>
            )}
          </div>
        ))}

        <button
          onClick={() => navigate("/registration")}
          className="w-full bg-blue-600 text-white p-2 rounded mt-2"
        >
          Add Student
        </button>
      </div>

      {/* FAMILY MEMBERS */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Family Members</h3>

        {family.familyContacts?.map((c, i) => (
          <div key={i} className="flex justify-between items-center border-b py-2">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-600">{c.phone} • {c.relation}</p>
            </div>

            <button
              onClick={invite}
              className="text-green-600 text-xs"
            >
              Invite
            </button>
          </div>
        ))}

        <button
  onClick={() => setShowMemberPopup(true)}
  className="w-full bg-gray-200 p-2 rounded mt-2"
>
  Add Family Member
</button>

      </div>

      {/* LOGOUT */}
      <button
        onClick={logout}
        className="w-full bg-red-500 text-white p-2 rounded"
      >
        Logout
      </button>
      {showMemberPopup && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-4 rounded w-72 space-y-2">

      <h3 className="font-semibold text-center">Add Family Member</h3>

      <input
        placeholder="Name"
        className="border w-full p-1"
        value={newMember.name}
        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
      />

      <input
        placeholder="Mobile Number"
        inputMode="numeric"
        maxLength={10}
        className="border w-full p-1"
        value={newMember.phone}
        onChange={(e) =>
          setNewMember({ ...newMember, phone: e.target.value.replace(/\D/g, "") })
        }
      />

      <select
        className="border w-full p-1"
        value={newMember.relation}
        onChange={(e) =>
          setNewMember({ ...newMember, relation: e.target.value })
        }
      >
        <option value="">Relation</option>
        <option>Father</option>
        <option>Mother</option>
        <option>Guardian</option>
        <option>Sibling</option>
        <option>Other</option>
      </select>

      <button
        onClick={async () => {
          if (!newMember.name || !newMember.phone || !newMember.relation)
            return alert("All fields required");

          const updated = [...(family.familyContacts || []), newMember];

          await update(ref(db, `families/${familyId}/familyContacts`), updated);

          setFamily({ ...family, familyContacts: updated });
          setShowMemberPopup(false);
          setNewMember({ name: "", phone: "", relation: "" });
        }}
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        Save
      </button>

      <button
        onClick={() => setShowMemberPopup(false)}
        className="w-full text-gray-500 text-sm"
      >
        Cancel
      </button>
    </div>
  </div>
)}

      
    </div>
  );
}
