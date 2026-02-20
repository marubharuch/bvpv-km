import { useEffect, useState, useContext } from "react";
import { signOut } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function FamilyDashboardPage() {
  const { user } = useContext(AuthContext);   // ✅ from global auth
  const [familyId, setFamilyId] = useState(null);
  const [family, setFamily] = useState(null);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", phone: "", relation: "" });

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const loadFamily = async () => {
      const snap = await get(ref(db, "families"));
      snap.forEach(f => {
        if (f.child("members").hasChild(user.uid)) {
          setFamilyId(f.key);
          setFamily(f.val());
        }
      });
    };

    loadFamily();
  }, [user]);

  if (!family) return <p className="p-4">Loading...</p>;

  const invite = () => {
    const msg = `Join our family.\nLink: ${window.location.origin}/join?familyId=${familyId}\nPIN: ${family.familyPin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  const regeneratePin = async () => {
    const newPin = Math.floor(1000 + Math.random() * 9000);
    await update(ref(db, `families/${familyId}`), { familyPin: newPin });
    setFamily(prev => ({ ...prev, familyPin: newPin }));
  };

  const logout = async () => {
    await signOut();
    window.location.href = "/";
  };

  const deleteStudent = async (id) => {
    const updated = { ...family.students };
    delete updated[id];
    await update(ref(db, `families/${familyId}/students`), updated);
    setFamily(prev => ({ ...prev, students: updated }));
  };

  const deleteMember = async (index) => {
    const updated = family.familyContacts.filter((_, i) => i !== index);
    await update(ref(db, `families/${familyId}/familyContacts`), updated);
    setFamily(prev => ({ ...prev, familyContacts: updated }));
  };

  const pickContact = async () => {
    setShowAddChoice(false);

    if (!("contacts" in navigator && "ContactsManager" in window)) {
      alert("Not supported on this device");
      return;
    }

    const contacts = await navigator.contacts.select(["name", "tel"], { multiple: true });

    const mapped = contacts.map(c => ({
      name: c.name?.[0] || "",
      phone: c.tel?.[0]?.replace(/\D/g, "") || "",
      relation: ""
    }));

    const updated = [...(family.familyContacts || []), ...mapped];
    await update(ref(db, `families/${familyId}/familyContacts`), updated);
    setFamily(prev => ({ ...prev, familyContacts: updated }));
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-bold">Family Profile</h2>
        <p className="text-sm">PIN: <span className="font-semibold">{family.familyPin}</span></p>
        <button onClick={regeneratePin} className="text-xs text-blue-600 underline mt-1">
          Regenerate PIN
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Students</h3>

        {Object.entries(family.students || {}).map(([id, s]) => (
          <div key={id} className="flex justify-between items-center border-b py-2">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gray-600">{s.standard || s.educationType}</p>
              <button onClick={() => navigate(`/registration?edit=${id}`)} className="text-blue-600 text-xs">Edit</button>
            </div>

            <div className="text-right">
              <button onClick={invite} className="text-green-600 text-xs block">Invite</button>
              <button onClick={() => deleteStudent(id)} className="text-red-500 text-xs">Delete</button>
            </div>
          </div>
        ))}

        <button onClick={() => navigate("/registration")} className="w-full bg-blue-600 text-white p-2 rounded mt-2">
          Add Student
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Family Members</h3>

        {family.familyContacts?.map((c, i) => (
          <div key={i} className="flex justify-between items-center border-b py-2">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-600">{c.phone} • {c.relation}</p>
            </div>

            <div className="text-right">
              <button onClick={invite} className="text-green-600 text-xs block">Invite</button>
              <button onClick={() => deleteMember(i)} className="text-red-500 text-xs">Delete</button>
            </div>
          </div>
        ))}

        <button onClick={() => setShowAddChoice(true)} className="w-full bg-gray-200 p-2 rounded mt-2">
          Add Family Member
        </button>
      </div>

      <button onClick={logout} className="w-full bg-red-500 text-white p-2 rounded">
        Logout
      </button>

      {/* Add Member Choice & Manual Add — unchanged below */}
      {showAddChoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-72 space-y-2 text-center">
            <button onClick={pickContact} className="w-full bg-blue-600 text-white p-2 rounded">Pick from Contacts</button>
            <button onClick={() => { setManualMode(true); setShowAddChoice(false); }} className="w-full border p-2 rounded">Enter Manually</button>
            <button onClick={() => setShowAddChoice(false)} className="text-sm text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      {manualMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-72 space-y-2">
            <input placeholder="Name" className="border w-full p-1"
              value={newMember.name}
              onChange={(e)=>setNewMember({...newMember, name:e.target.value})} />
            <input placeholder="Mobile" inputMode="numeric" className="border w-full p-1"
              value={newMember.phone}
              onChange={(e)=>setNewMember({...newMember, phone:e.target.value.replace(/\D/g,"")})} />
            <select className="border w-full p-1"
              value={newMember.relation}
              onChange={(e)=>setNewMember({...newMember, relation:e.target.value})}>
              <option value="">Relation</option>
              <option>Father</option><option>Mother</option><option>Guardian</option>
            </select>

            <button onClick={async ()=>{
              if(!newMember.name||!newMember.phone||!newMember.relation) return alert("Fill all");
              const updated=[...(family.familyContacts||[]), newMember];
              await update(ref(db,`families/${familyId}/familyContacts`),updated);
              setFamily(prev=>({...prev,familyContacts:updated}));
              setManualMode(false);
            }} className="w-full bg-blue-600 text-white p-2 rounded">Save</button>

            <button onClick={()=>setManualMode(false)} className="text-sm text-gray-500 w-full">Cancel</button>
          </div>
        </div>
      )}

    </div>
  );
}
