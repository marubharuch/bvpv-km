import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

export default function DashboardPage() {
  const [family, setFamily] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      const snap = await get(ref(db, "families"));

      snap.forEach(f => {
        if (f.child("members").hasChild(user.uid)) {
          const data = f.val();
          setFamily(data);
          setStudents(Object.values(data.students || {}));
        }
      });
    };

    fetchData();
  }, []);

  if (!family) return <p className="p-4">Loading...</p>;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      {/* Welcome */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-bold">Welcome 👋</h2>
        <p className="text-sm text-gray-600">
          Family PIN: <span className="font-semibold">{family.familyPin}</span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-100 p-3 rounded text-center">
          <p className="text-xl font-bold">{students.length}</p>
          <p className="text-sm">Students</p>
        </div>

        <div className="bg-green-100 p-3 rounded text-center">
          <p className="text-xl font-bold">
            {family.familyContacts?.length || 0}
          </p>
          <p className="text-sm">Family Contacts</p>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Students</h3>

        {students.length === 0 && (
          <p className="text-sm text-gray-500">No students added yet.</p>
        )}

        {students.map((s, i) => (
          <div key={i} className="border-b py-2">
            <p className="font-medium">{s.name}</p>
            <p className="text-sm text-gray-600">
              {s.standard || s.educationType}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <button className="w-full bg-blue-600 text-white p-2 rounded">
          Add Student
        </button>
        <button className="w-full bg-gray-200 p-2 rounded">
          Edit Family Info
        </button>
      </div>

    </div>
  );
}
