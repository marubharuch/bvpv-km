import { useState, useEffect } from "react";
import { ref, update } from "firebase/database";
import { db } from "../../firebase";
import StudentEducationSection from "../StudentEducationSection";
import StudentSkillsSection from "../StudentSkillsSection";

export default function EditMemberModal({
  open,
  onClose,
  member,
  familyId
}) {
 const [form, setForm] = useState({
  name: "",
  mobile: "",
  email: "",
  gender: "",
  dob: "",
  education: "",
  occupation: "",
  married: false,
  isStudent: false,
  skills: [],
  helpRequired: ""
});

const [showSkills, setShowSkills] = useState(false);
const [skillCardIdx, setSkillCardIdx] = useState(0);

  // Load member into form
  useEffect(() => {
    if (member) {
      setForm({
        name: member.name || "",
        mobile: member.mobile || "",
        email: member.email || "",
        gender: member.gender || "",
        dob: member.dob || "",
        occupation: member.occupation || "",
        married: member.married || false,
        isStudent: member.isStudent || false,

        // Student fields
        educationType: member.educationType || "",
        standard: member.standard || "",
        stream: member.stream || "",
        medium: member.medium || "",
        year: member.year || "",
        degree: member.degree || "",
        specialization: member.specialization || "",
        collegeName: member.collegeName || "",
        courseName: member.courseName || "",
        courseStage: member.courseStage || "",
        exam: member.exam || "",

        skills: member.skills || "",
        helpRequired: member.helpRequired || ""
      });
    }
  }, [member]);

  if (!open || !member) return null;

  // Update helper for education component
  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };


  // Save changes to RTDB
  const handleSave = async () => {
    try {
      await update(
        ref(db, `families/${familyId}/members/${member.id}`),
        {
          ...form,
          updatedAt: Date.now()
        }
      );

      onClose();

    } catch (err) {
      alert("Save failed");
      console.error(err);
    }
  };
  if (showSkills) {
  return (
    <StudentSkillsSection
      student={form}
      update={updateField}
      cardIndex={skillCardIdx}
      setCardIndex={setSkillCardIdx}
      exitSkillsMode={() => setShowSkills(false)}
    />
  );
}


  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">

        <h2 className="text-lg font-bold mb-4">
          Edit Member
        </h2>

        {/* BASIC INFO */}

        <input
          className="w-full border p-2 rounded mb-2"
          placeholder="Name"
          value={form.name}
          onChange={e => updateField("name", e.target.value)}
        />

        <input
          className="w-full border p-2 rounded mb-2"
          placeholder="Mobile"
          value={form.mobile}
          onChange={e => updateField("mobile", e.target.value)}
        />

        <input
          className="w-full border p-2 rounded mb-2"
          placeholder="Email"
          value={form.email}
          onChange={e => updateField("email", e.target.value)}
        />

        {/* STUDENT TOGGLE */}

        <label className="flex items-center gap-2 my-3">
          <input
            type="checkbox"
            checked={form.isStudent}
            onChange={e =>
              updateField("isStudent", e.target.checked)
            }
          />
          Student
        </label>

        {/* ⭐ STUDENT EDUCATION SECTION */}

        {form.isStudent && (
          <>
            <StudentEducationSection
              student={form}
              update={updateField}
            />

           <button
  onClick={() => {
    setSkillCardIdx(0);
    setShowSkills(true);
  }}
  className="w-full border-2 border-indigo-200 text-indigo-600 py-2 rounded mb-2"
>
  🎯 Skills & Talents
</button>


            <input
              className="w-full border p-2 rounded mb-2"
              placeholder="Help Required"
              value={form.helpRequired}
              onChange={e =>
                updateField("helpRequired", e.target.value)
              }
            />
          </>
        )}

        {/* MEMBER FIELDS */}

        {!form.isStudent && (
          <>
            <input
              className="w-full border p-2 rounded mb-2"
              placeholder="Occupation"
              value={form.occupation}
              onChange={e =>
                updateField("occupation", e.target.value)
              }
            />

            <label className="flex items-center gap-2 my-2">
              <input
                type="checkbox"
                checked={form.married}
                onChange={e =>
                  updateField("married", e.target.checked)
                }
              />
              Married
            </label>
          </>
        )}

        {/* BUTTONS */}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white py-2 rounded"
          >
            Save
          </button>

          <button
            onClick={onClose}
            className="flex-1 border py-2 rounded"
          >
            Cancel
          </button>
        </div>

      </div>

      
      
    </div>
  );
}
