import { useState,useEffect } from "react";
import { useSearchParams,useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase";

import { AnimatePresence, motion } from "framer-motion";
import StudentFlipPage from "../components/StudentFlipPage";
import StudentPaperField from "../components/StudentPaperField";
import StudentPaperPhoto from "../components/StudentPaperPhoto";
import StudentSectionTitle from "../components/StudentSectionTitle";
//import { saveStudentDraft } from "../utils/studentStorage";
import StudentCityField from "../components/StudentCityField";
import StudentEducationSection from "../components/StudentEducationSection";
import StudentFamilySection from "../components/StudentFamilySection";
import StudentMobileField from "../components/StudentMobileField";
import { saveStudentDraft, loadStudentDraft } from "../utils/studentStorage";
import { submitStudentRegistration } from "../services/studentSubmitService";

export default function StudentFormPage() {
const [searchParams] = useSearchParams();
const editId = searchParams.get("edit");  // STU_1

const navigate = useNavigate();


  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [student, setStudent] = useState({});

  const update = (k, v) => {
    const updated = { ...student, [k]: v };
    setStudent(updated);
    saveStudentDraft(updated);
  };

  const paginate = (newDir) => {
    const nextPage = page + newDir;
    if (nextPage >= 0 && nextPage < pages.length) {
      setDirection(newDir);
      setPage(nextPage);
    }
  };

  const handleSubmit = async () => {
  try {
    const res = await submitStudentRegistration(student, editId);

    if (res.mode === "new") {
      alert(`Registration complete!\nFamily PIN: ${res.familyPin}`);
      navigate("/dashboard");
    }

    if (res.mode === "added") {
      alert("Student added successfully");
      navigate("/students");
    }

    if (res.mode === "updated") {
      alert("Student updated successfully");
      navigate("/students");
    }

  } catch (err) {
    alert(err.message);
  }
};



useEffect(() => {
  const loadData = async () => {
    const user = getAuth().currentUser;

    if (editId && user) {
      const snap = await get(ref(db, "families"));

      snap.forEach(f => {
        if (f.child("members").hasChild(user.uid)) {
          const stu = f.val().students?.[editId];
          if (stu) setStudent(stu);
        }
      });

    } else {
      const draft = await loadStudentDraft();
      setStudent(draft);
    }
  };

  loadData();
}, [editId]);




  const pages = [
    // PAGE 1 — BASIC
    <StudentFlipPage key="p1" direction={direction}>
      <StudentSectionTitle title="Basic Information" />

      <div className="flex gap-3">
        <StudentPaperPhoto photo={student.photo} onChange={(v)=>update("photo", v)} />

        <div>
          <StudentPaperField
            label="Full Name:"
            value={student.name}
            onSave={(v)=>update("name", v)}
          />

          <div className="flex items-center gap-2 mb-2">
            <span>Gender:</span>
            <select
              value={student.gender || ""}
              onChange={(e)=>update("gender", e.target.value)}
              className="border-b border-black bg-transparent"
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span>Birth Date:</span>
        <input
          type="date"
          value={student.dob || ""}
          onChange={(e)=>update("dob", e.target.value)}
          className="border-b border-black bg-transparent"
        />
      </div>

      {/* ✅ Clean mobile component */}
      <StudentMobileField
        value={student.mobile}
        onSave={(v)=>update("mobile", v)}
      />

      <StudentEducationSection student={student} update={update} />
    </StudentFlipPage>,

    // PAGE 2 — FAMILY
    <StudentFlipPage key="p2" direction={direction}>
      <StudentSectionTitle title="Family & Location" />
      <StudentFamilySection student={student} update={update} />
     <div className="flex items-center gap-2 mb-2">
  <span>Email:</span>
  <input
    type="email"
    value={student.email || ""}
    onChange={(e)=>update("email", e.target.value)}
    className="border-b border-black bg-transparent"
    placeholder="Enter email"
  />
</div>

<p className="text-xs text-gray-500 mb-2">
  If using Gmail, no password needed. Other emails require password.
</p>

     
      <StudentCityField label="City:" value={student.city} onSave={(v)=>update("city", v)} />
    </StudentFlipPage>,

    // PAGE 3 — ACADEMIC
    <StudentFlipPage key="p3" direction={direction}>
      <StudentSectionTitle title="Academic Details" />
      <StudentEducationSection student={student} update={update} />
      <button
  onClick={handleSubmit}
  className="w-full bg-green-600 text-white p-3 mt-4 rounded"
>
  {editId ? "Update Student" : "Submit Registration"}
</button>


    </StudentFlipPage>
  ];

  return (
    <div className="max-w-md mx-auto p-4 bg-[#ece9e1] min-h-screen">
      <AnimatePresence mode="wait">
        <motion.div key={page}>
          {pages[page]}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-center gap-6 mt-4">
        <button onClick={() => paginate(-1)} disabled={page===0}>⬅</button>
        <span className="text-sm">Page {page+1} of {pages.length}</span>
        <button onClick={() => paginate(1)} disabled={page===pages.length-1}>➡</button>
      </div>
    </div>
  );
}
