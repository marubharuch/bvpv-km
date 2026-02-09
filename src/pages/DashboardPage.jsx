import { useContext, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { loadCache, saveCache } from "../utils/cache";
import { AuthContext } from "../context/AuthContext";

export default function FamilyDashboardPage() {
  const { user } = useContext(AuthContext);   // ✅ get logged user
  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // 🔹 LOAD FAMILY (Scan families as you designed)
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
const famSnap = await get(ref(db, `families/${foundId}`));
const famData = famSnap.val();


      setFamilyId(foundId);

      // ⚡ Cache first
      const cached = await loadCache(`family_${foundId}`);
      if (cached) {
        setFamily(cached);
      } else {
        setFamily(famData);
        saveCache(`family_${foundId}`, famData);
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  // 🔄 Manual refresh
  const refreshFromFirebase = async () => {
    console.log("Refreshing from Firebase..."); 
    if (!familyId) return;
    const snap = await get(ref(db, `families/${familyId}`));
    const data = snap.val();
    setFamily(data);
    saveCache(`family_${familyId}`, data);
  };

  const regeneratePin = async () => {
    const newPin = Math.floor(1000 + Math.random() * 9000);
    await update(ref(db, `families/${familyId}`), { familyPin: newPin });

    const updated = { ...family, familyPin: newPin };
    setFamily(updated);
    saveCache(`family_${familyId}`, updated);
  };

  const logout = async () => {
    await signOut();
    navigate("/");
  };

  // 🔹 UI STATES
  if (!user) return <p className="p-4 text-center">Checking login...</p>;
  if (loading) return <p className="p-4 text-center">Loading...</p>;

  if (!family) {
    return (
      <div className="p-4 text-center">
        <p>No family data found.</p>
        <button
          onClick={refreshFromFirebase}
          className="mt-2 bg-blue-600 text-white px-3 py-1 rounded"
        >
          Load from server
        </button>
      </div>
    );
  }

  // 🔹 MAIN UI
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      <button onClick={refreshFromFirebase} className="bg-blue-600 text-white px-3 py-1 rounded">
        🔄 Refresh Data
      </button>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-bold">Family Profile</h2>
        <p>PIN: {family.familyPin}</p>
        <button onClick={regeneratePin} className="text-blue-600 text-xs">
          Regenerate PIN
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Students</h3>
        {Object.entries(family.students || {}).map(([id, s]) => (
          <div key={id} className="border-b py-2">
            <p className="font-medium">{s.name}</p>
            <p className="text-sm text-gray-600">{s.standard || s.educationType}</p>
            <button onClick={() => navigate(`/registration?edit=${id}`)} className="text-blue-600 text-xs">
              Edit
            </button>
          </div>
        ))}
        <button onClick={() => navigate("/registration")} className="w-full bg-blue-600 text-white p-2 rounded mt-2">
          Add Student
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Family Members</h3>
        {family.familyContacts?.map((c, i) => (
          <div key={i} className="border-b py-2">
            <p>{c.name}</p>
            <p className="text-sm">{c.phone} • {c.relation}</p>
          </div>
        ))}
      </div>

      <button onClick={logout} className="w-full bg-red-500 text-white p-2 rounded">
        Logout
      </button>
    </div>
  );
}
