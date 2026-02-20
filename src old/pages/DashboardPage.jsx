import { useContext, useEffect, useState, useCallback } from "react";
import { signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import EditMemberModal from "../components/modals/EditMemberModal";
import ImageUploadBox from "../components/ImageUploadBox";

export default function FamilyDashboardPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState(null);

  /* ================= LOAD FAMILY ================= */

  const loadFamily = useCallback(async () => {
    if (!user?.uid) return;

    const userSnap = await get(ref(db, `users/${user.uid}`));
    const famId = userSnap.val()?.familyId;
    if (!famId) return;

    setFamilyId(famId);

    const famSnap = await get(ref(db, `families/${famId}`));
    setFamily(famSnap.val());

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  /* ================= MEMBERS ================= */

  const members = family?.members
    ? Object.entries(family.members).map(([id, m]) => ({ id, ...m }))
    : [];

  const students = members.filter(m => m.isStudent);
  const contacts = members.filter(m => !m.isStudent);

  /* ================= ACTIONS ================= */

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const addStudent = () => navigate("/registration");

  /* ================= UI ================= */

  if (loading) return <div>Loading...</div>;
  if (!family) return <div>No family</div>;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      {/* HEADER */}

      <div className="flex justify-between">
        <button onClick={loadFamily}>🔄 Refresh</button>
        <button onClick={logout}>Logout</button>
      </div>

      {/* FAMILY PROFILE */}

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">Family Profile</h2>

        <p>PIN: <b>{family.familyPin}</b></p>
        <p>City: {family.city || "Not set"}</p>
        <p>Native: {family.native || "Not set"}</p>
        <p>Address: {family.address || "Not set"}</p>
      </div>

      {/* STUDENTS */}

      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between mb-2">
          <h3>Students ({students.length})</h3>
          <button onClick={addStudent}>+ Add</button>
        </div>

        {students.map(student => (
          <div key={student.id} className="flex justify-between border-b py-2">
            <div>
              <ImageUploadBox
  familyId={familyId}
  memberId={student.id}
  photoUrl={student.photoUrl}
/>

              <p className="font-medium">{student.name}</p>
              <p className="text-sm text-gray-500">
                {student.education || "Add Education"}
              </p>
            </div>

            <button onClick={() => setEditingMember(student)}>
              ✏️
            </button>
          </div>
        ))}
      </div>

      {/* CONTACTS */}

      <div className="bg-white p-4 rounded shadow">
        <h3 className="mb-2">Family Contacts ({contacts.length})</h3>

        {contacts.map(contact => (
          <div key={contact.id} className="flex justify-between border-b py-2">
            <div>
 <ImageUploadBox
  familyId={familyId}
  memberId={contact.id}
  photoUrl={contact.photoUrl}
/>

              <p className="font-medium">{contact.name}</p>
              {contact.mobile && (
                <p className="text-sm text-gray-500">
                  📱 {contact.mobile}
                </p>
              )}
            </div>

            <button onClick={() => setEditingMember(contact)}>
              ✏️
            </button>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}

      <EditMemberModal
        open={!!editingMember}
        member={editingMember}
        familyId={familyId}
        onClose={() => {
          setEditingMember(null);
          loadFamily();
        }}
      />

    </div>
  );
}
