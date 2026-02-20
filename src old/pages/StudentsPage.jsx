import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function StudentsPage() {
  const [familyId, setFamilyId] = useState(null);
  const [students, setStudents] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadStudents = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      const snap = await get(ref(db, "families"));

      snap.forEach(f => {
        if (f.child("members").hasChild(user.uid)) {
          setFamilyId(f.key);
          setStudents(f.val().students || {});
        }
      });
    };

    loadStudents();
  }, []);

  const deleteStudent = async (id) => {
    const updated = { ...students };
    delete updated[id];

    await update(ref(db, `families/${familyId}/students`), updated);
    setStudents(updated);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      <h2 className="text-lg font-bold">Students</h2>

      {Object.keys(students).length === 0 && (
        <p className="text-gray-500 text-sm">No students found.</p>
      )}

      {Object.entries(students).map(([id, s]) => (
        <div key={id} className="bg-white p-3 rounded shadow relative">

          <button
            onClick={() => deleteStudent(id)}
            className="absolute top-2 right-2 text-red-500 text-sm"
          >
            ✕
          </button>

          <p className="font-semibold">{s.name}</p>
          <p className="text-sm text-gray-600">{s.educationType}</p>
          <p className="text-sm text-gray-600">
            {s.standard || s.year || s.degree}
          </p>

          <button
            onClick={() => navigate(`/registration?edit=${id}`)}
            className="text-blue-600 text-xs mt-1"
          >
            Edit
          </button>
        </div>
      ))}

      <button
        onClick={() => navigate("/registration")}
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        Add Student
      </button>

    </div>
  );
}
