import { useContext, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { loadCache, saveCache } from "../utils/cache";
import { AuthContext } from "../context/AuthContext";

export default function FamilyDashboardPage() {
  const { user } = useContext(AuthContext);
  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // 🔹 LOAD FAMILY
  useEffect(() => {
    if (!user) return;
console.log("👤 User detected:", user.uid)  ;
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

      console.log("📊 Raw family data:", famData); // DEBUG
      console.log("👥 Students found:", famData?.students); // DEBUG

      setFamilyId(foundId);

      // Cache first
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
    console.log("📊 Refreshed family data:", data);
    console.log("👥 Refreshed students:", data?.students);
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
    await signOut(auth);
    navigate("/");
  };

  // 🔹 Helper to convert contacts object to array for display
  const getContactsArray = (contactsObj) => {
    if (!contactsObj) return [];
    if (Array.isArray(contactsObj)) return contactsObj;
    return Object.values(contactsObj);
  };

  // 🔹 CRITICAL FIX: Get ALL students as array
  const getStudentsArray = (studentsObj) => {
    if (!studentsObj) {
      console.log("⚠️ No students object found");
      return [];
    }
    
    // Log what we're getting
    console.log("🎓 Students object:", studentsObj);
    
    // Convert object to array with ALL entries
    const studentsArray = Object.entries(studentsObj).map(([id, data]) => ({
      id,
      ...data
    }));
    
    console.log(`✅ Found ${studentsArray.length} students:`, studentsArray.map(s => s.name));
    return studentsArray;
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

  const students = getStudentsArray(family.students);
  const contacts = getContactsArray(family.familyContacts);
const inviteMember = (contact) => {
  const mobile = contact.mobile || contact.phone;

  const message =
    `You are invited to join our family directory.\n` +
    `Family PIN: ${family.familyPin}\n` +
    `Register here: https://yourapp.com/register`;

  const url = `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
};

  // 🔹 MAIN UI
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <button 
          onClick={refreshFromFirebase} 
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          🔄 Refresh Data
        </button>
        <button 
          onClick={logout} 
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          Logout
        </button>
      </div>

      {/* Family Profile Card */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-bold">Family Profile</h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-gray-700">
            <span className="font-medium">PIN:</span> {family.familyPin}
          </p>
          <button 
            onClick={regeneratePin} 
            className="text-blue-600 text-xs hover:underline"
          >
            Regenerate
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-medium">Family ID:</span> {familyId}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Family Name:</span> {family.familyName}
        </p>
      </div>

      {/* Students Card */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2 flex justify-between">
          <span>Students ({students.length})</span>
        </h3>
        
        {students.length === 0 ? (
          <p className="text-gray-500 text-sm py-2">No students added yet.</p>
        ) : (
          students.map((student) => (
            <div key={student.id} className="border-b last:border-b-0 py-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{student.name || 'Unnamed'}</p>
                  <p className="text-sm text-gray-600">
                    {student.education || student.standard || 'Education not specified'} 
                    {student.dob && ` • DOB: ${student.dob}`}
                  </p>
                  {student.achievements && (
                    <p className="text-xs text-gray-500 mt-1">
                      🏆 {student.achievements.substring(0, 50)}
                      {student.achievements.length > 50 ? '...' : ''}
                    </p>
                  )}
                  {student.skills && Object.keys(student.skills).length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      ⚡ {Object.values(student.skills).flat().length} skills
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => navigate(`/registration?edit=${student.id}`)} 
                  className="text-blue-600 text-xs border border-blue-600 px-2 py-1 rounded hover:bg-blue-50"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}
        
        <button 
          onClick={() => navigate("/registration")} 
          className="w-full bg-blue-600 text-white p-2 rounded mt-3 hover:bg-blue-700"
        >
          + Add New Student
        </button>
      </div>

      {/* Family Members Card */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">
          Family Members ({contacts.length})
        </h3>
        
        {contacts.length === 0 ? (
          <p className="text-gray-500 text-sm py-2">No family contacts added.</p>
        ) : (
         contacts.map((contact, index) => (
  <div key={index} className="border-b last:border-b-0 py-2">
    <div className="flex justify-between items-start">
      
      <div>
        <p className="font-medium">{contact.name || 'Unknown'}</p>
        <div className="flex gap-3 text-sm text-gray-600">
          {contact.mobile || contact.phone ? (
            <span>📱 {contact.mobile || contact.phone}</span>
          ) : null}
          {contact.relation && <span>👤 {contact.relation}</span>}
          {contact.email && <span>📧 {contact.email}</span>}
        </div>
      </div>

      {/* 📩 Invite Button */}
      {(contact.mobile || contact.phone) && (
        <button
          onClick={() => inviteMember(contact)}
          className="text-blue-600 text-xs border border-blue-600 px-2 py-1 rounded hover:bg-blue-50"
        >
          Invite
        </button>
      )}

    </div>
  </div>
))

        )}
      </div>
      <button 
  onClick={() => navigate("/add-family-member")}
  className="w-full bg-green-600 text-white p-2 rounded mt-3 hover:bg-green-700"
>
  + Add Family Member
</button>


      {/* Owner Info */}
      {family.members && family.ownerUid && (
        <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
          <p>👑 Family Owner: {family.members[family.ownerUid]?.name || 'You'}</p>
          <p>📅 Created: {new Date(family.createdAt).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}