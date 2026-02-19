import { useContext, useEffect, useState, useCallback } from "react";
import { signOut } from "firebase/auth";
import { ref, get, push, set, update } from "firebase/database";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import EditMemberModal from "../components/modals/EditMemberModal"; 

export default function FamilyDashboardPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAddMember, setShowAddMember] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const [editFamilyField, setEditFamilyField] = useState(null);
  const [familyFieldValue, setFamilyFieldValue] = useState("");
const [editingMember, setEditingMember] = useState(null);

  const [newMember, setNewMember] = useState({
    name: "",
    relation: "parent",
    mobile: "",
    email: ""
  });

  /* ================= LOAD FAMILY ================= */

  const loadFamily = useCallback(async () => {
    if (!user?.uid) return;

    const userSnap = await get(ref(db, `users/${user.uid}`));
    const userData = userSnap.val();
    if (!userData?.familyId) return;

    const famId = userData.familyId;
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

  /* ================= FAMILY FIELD EDIT ================= */

  const openFamilyEdit = (field) => {
    setEditFamilyField(field);
    setFamilyFieldValue(family[field] || "");
  };

  const saveFamilyField = async () => {
    await update(ref(db, `families/${familyId}`), {
      [editFamilyField]: familyFieldValue,
      updatedAt: Date.now()
    });

    setEditFamilyField(null);
    loadFamily();
  };

  /* ================= ADD / EDIT CONTACT ================= */

  const saveMember = async () => {
    if (editingContact) {
      await update(
        ref(db, `families/${familyId}/members/${editingContact.id}`),
        newMember
      );
    } else {
      const newRef = push(ref(db, `families/${familyId}/members`));
      await set(newRef, {
        ...newMember,
        isStudent: false,
        createdAt: Date.now()
      });
    }

    setShowAddMember(false);
    setEditingContact(null);
    loadFamily();
  };

  const editContact = (member) => {
    setEditingContact(member);
    setNewMember(member);
    setShowAddMember(true);
  };

  /* ================= INVITE ================= */

  const inviteMember = (contact) => {
    if (!contact.mobile) return;

    const clean = contact.mobile.replace(/\D/g, "");
    const message = `Join our family directory\n\nFamily PIN: ${family.familyPin}`;

    window.open(
      `https://wa.me/${clean}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const inviteStudent = (student) => {
    if (!student.mobile) return;

    const clean = student.mobile.replace(/\D/g, "");
    const message = `Join our student portal\n\nFamily PIN: ${family.familyPin}`;

    window.open(
      `https://wa.me/${clean}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  /* ================= NAVIGATION ================= */

  const addStudent = () => navigate("/registration");
  const editStudent = (id) => navigate(`/registration?edit=${id}`);

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

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

        {/* CITY */}
        <p>
          City: {family.city || "Not set"}
          <button onClick={() => openFamilyEdit("city")} className="ml-2">✏️</button>
        </p>

        {/* NATIVE */}
        <p>
          Native: {family.native || "Not set"}
          <button onClick={() => openFamilyEdit("native")} className="ml-2">✏️</button>
        </p>

        {/* ADDRESS */}
        <p>
          Address: {family.address || "Not set"}
          <button onClick={() => openFamilyEdit("address")} className="ml-2">✏️</button>
        </p>
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
              <p className="font-medium">{student.name}</p>
              {student.education && (
                <p className="text-sm text-gray-500">{student.education}</p>
              )}
            </div>

            <div className="flex gap-2">
              {!student.email && student.mobile && (
                <button
                  onClick={() => inviteStudent(student)}
                  className="text-green-600 border px-2 rounded"
                >
                  📩 Invite
                </button>
              )}

              {student.email && (
                <span className="text-green-600">✅ Joined</span>
              )}

              <button onClick={() =>setEditingMember(student)}>✏️</button>
            </div>
          </div>
        ))}
      </div>

      {/* CONTACTS */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between mb-2">
          <h3>Family Contacts ({contacts.length})</h3>
          <button onClick={() => setShowAddMember(true)}>+ Add</button>
        </div>

        {contacts.map(contact => (
          <div key={contact.id} className="flex justify-between border-b py-2">
            <div>
              <p className="font-medium">
                {contact.name}
                {contact.relation && (
                  <span className="text-gray-500 ml-2">• {contact.relation}</span>
                )}
              </p>

              {contact.mobile && (
                <p className="text-sm text-gray-500">📱 {contact.mobile}</p>
              )}
            </div>

            <div className="flex gap-2">
              {!contact.email && contact.mobile && (
                <button
                  onClick={() => inviteMember(contact)}
                  className="text-green-600 border px-2 rounded"
                >
                  📩 Invite
                </button>
              )}

              {contact.email && (
                <span className="text-green-600">✅ Joined</span>
              )}

              <button onClick={() => setEditingMember(contact) }>✏️</button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT CONTACT MODAL */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-md">
            <h3 className="font-bold mb-3">
              {editingContact ? "Edit Contact" : "Add Contact"}
            </h3>

            <input
              placeholder="Name"
              value={newMember.name}
              onChange={e =>
                setNewMember({ ...newMember, name: e.target.value })
              }
              className="w-full border p-2 mb-2"
            />

            <input
              placeholder="Mobile"
              value={newMember.mobile}
              onChange={e =>
                setNewMember({ ...newMember, mobile: e.target.value })
              }
              className="w-full border p-2 mb-2"
            />

            <input
              placeholder="Email"
              value={newMember.email}
              onChange={e =>
                setNewMember({ ...newMember, email: e.target.value })
              }
              className="w-full border p-2 mb-2"
            />

            <div className="flex gap-2">
              <button onClick={saveMember}>Save</button>
              <button onClick={() => setShowAddMember(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT FAMILY FIELD MODAL */}
      {editFamilyField && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-md">
            <h3 className="font-bold mb-3">Edit {editFamilyField}</h3>

            <input
              value={familyFieldValue}
              onChange={e => setFamilyFieldValue(e.target.value)}
              className="w-full border p-2 mb-2"
            />

            <div className="flex gap-2">
              <button onClick={saveFamilyField}>Save</button>
              <button onClick={() => setEditFamilyField(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
<EditMemberModal
  open={!!editingMember}
  member={editingMember}
  familyId={familyId}
  onClose={() => {
    setEditingMember(null);
    loadFamily(); // refresh data
  }}
/>

    </div>
  );
}
