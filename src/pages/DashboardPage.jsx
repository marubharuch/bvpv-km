import { useContext, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { ref, get, update, push } from "firebase/database";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { loadCache, saveCache } from "../utils/cache";
import { AuthContext } from "../context/AuthContext";

export default function FamilyDashboardPage() {
  const { user } = useContext(AuthContext);

  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    countryCode: "+91",
    mobile: ""
  });

  const navigate = useNavigate();

  // 🔹 LOAD FAMILY DATA
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);

      const userSnap = await get(ref(db, `users/${user.uid}`));
      const userData = userSnap.val();

      if (!userData?.familyId) {
        setLoading(false);
        return;
      }

      const foundId = userData.familyId;
      setFamilyId(foundId);

      const cached = await loadCache(`family_${foundId}`);

      if (cached) {
        setFamily(cached);
      } else {
        const famSnap = await get(ref(db, `families/${foundId}`));
        const famData = famSnap.val();
        setFamily(famData);
        saveCache(`family_${foundId}`, famData);
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  // 🔄 Refresh
  const refreshFromFirebase = async () => {
    if (!familyId) return;

    const snap = await get(ref(db, `families/${familyId}`));
    const data = snap.val();

    setFamily(data);
    saveCache(`family_${familyId}`, data);
  };

  // 🔐 Logout
  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  // 🔢 Helpers
  const contacts = family?.familyContacts
    ? Object.values(family.familyContacts)
    : [];

  const students = family?.students
    ? Object.entries(family.students).map(([id, data]) => ({ id, ...data }))
    : [];

  // 📩 Invite
  const inviteMember = (contact) => {
    const mobile = contact.mobile || contact.phone;
    if (!mobile) return;

    const message =
      `You are invited to join our family directory.\n` +
      `Family PIN: ${family.familyPin}\n` +
      `Register here: https://yourapp.com/register`;

    window.open(
      `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  // ➕ Save New Member
  const saveNewMember = async () => {
    if (!newMember.name.trim()) {
      alert("Name is required");
      return;
    }

    const fullMobile = newMember.mobile
      ? `${newMember.countryCode}${newMember.mobile}`
      : "";

    const newRef = push(ref(db, `families/${familyId}/familyContacts`));

    await update(newRef, {
      name: newMember.name,
      mobile: fullMobile,
      addedAt: Date.now()
    });

    await refreshFromFirebase();

    setNewMember({ name: "", countryCode: "+91", mobile: "" });
    setShowAddMember(false);
  };

  // 🔹 UI STATES
  if (!user) return <p className="p-4 text-center">Checking login...</p>;
  if (loading) return <p className="p-4 text-center">Loading...</p>;
  if (!family) return <p className="p-4 text-center">No family data found.</p>;

  // 🏆 MAIN UI
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      {/* HEADER */}
      <div className="flex justify-between">
        <button
          onClick={refreshFromFirebase}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          🔄 Refresh
        </button>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          Logout
        </button>
      </div>

      {/* FAMILY PROFILE */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold text-lg">Family Profile</h2>
        <p>PIN: {family.familyPin}</p>
        <p>ID: {familyId}</p>
        <p>Name: {family.familyName}</p>
      </div>

      {/* STUDENTS */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">
          Students ({students.length})
        </h3>

        {students.map((s) => (
          <div key={s.id} className="flex justify-between border-b py-2">
            <span>{s.name}</span>
            <button
              onClick={() => navigate(`/registration?edit=${s.id}`)}
              className="text-blue-600 text-xs border px-2 rounded"
            >
              Edit
            </button>
          </div>
        ))}

        <button
          onClick={() => navigate("/registration")}
          className="w-full bg-blue-600 text-white p-2 rounded mt-3"
        >
          + Add Student
        </button>
      </div>

      {/* FAMILY MEMBERS */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">
          Family Members ({contacts.length})
        </h3>

        {contacts.map((c, i) => (
          <div key={i} className="flex justify-between border-b py-2">
            <div>
              <p>{c.name}</p>
              {c.mobile && <p className="text-sm">📱 {c.mobile}</p>}
            </div>

            {c.mobile && (
              <button
                onClick={() => inviteMember(c)}
                className="text-green-600 text-xs border px-2 rounded"
              >
                Invite
              </button>
            )}
          </div>
        ))}

        {/* INLINE ADD MEMBER */}
        {!showAddMember ? (
          <button
            onClick={() => setShowAddMember(true)}
            className="w-full bg-green-600 text-white p-2 rounded mt-3"
          >
            + Add Family Member
          </button>
        ) : (
          <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded">
            <input
              placeholder="Name"
              value={newMember.name}
              onChange={(e) =>
                setNewMember({ ...newMember, name: e.target.value })
              }
              className="w-full border p-2 rounded"
            />

            <div className="flex gap-2">
              <input
                value={newMember.countryCode}
                onChange={(e) =>
                  setNewMember({
                    ...newMember,
                    countryCode: e.target.value
                  })
                }
                className="w-20 border p-2 rounded"
              />
              <input
                placeholder="Mobile (optional)"
                value={newMember.mobile}
                onChange={(e) =>
                  setNewMember({
                    ...newMember,
                    mobile: e.target.value
                  })
                }
                className="flex-1 border p-2 rounded"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveNewMember}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Save
              </button>
              <button
                onClick={() => setShowAddMember(false)}
                className="border px-3 py-1 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
