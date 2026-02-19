import { useState, useEffect } from "react";
import { ref, update } from "firebase/database";
import { db } from "../../firebase";
import StudentEducationSection from "../StudentEducationSection";
import StudentSkillsSection from "../StudentSkillsSection";
import StudentFinancialSection from "../StudentFinancialSection";
const EMPTY_SKILLS = {
  indoorSports: [],
  outdoorSports: [],
  talents: [],
  creative: [],
  hobbies: [],
  funActivities: []
};

export default function EditMemberModal({
  open,
  onClose,
  member,
  familyId
}) {
  const [form, setForm] = useState(null);
  const [showSkills, setShowSkills] = useState(false);
  const [skillCardIdx, setSkillCardIdx] = useState(0);

  /* ================= LOAD MEMBER ================= */

  useEffect(() => {
    if (!member) return;

    setForm({
      name: member.name || "",
      mobile: member.mobile || "",
      email: member.email || "",
      occupation: member.occupation || "",
      married: member.married || false,
      isStudent: member.isStudent || false,

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

      skills: member.skills || EMPTY_SKILLS,
      helpRequired: member.helpRequired || ""
    });
  }, [member]);

  if (!open || !member || !form) return null;

  /* ================= HELPERS ================= */

  const updateField = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const getEducationSummary = () => {
    if (!form.isStudent) return "";

    if (form.educationType === "School Student")
      return form.standard;

    if (form.educationType === "College Student")
      return `${form.degree || ""} ${form.year || ""}`;

    if (form.educationType === "Postgraduate")
      return `PG ${form.year || ""}`;

    if (form.educationType === "Diploma / ITI")
      return `Diploma ${form.year || ""}`;

    if (form.educationType === "Professional Course")
      return `${form.courseName || ""} ${form.courseStage || ""}`;

    if (form.educationType === "Competitive Prep")
      return form.exam;

    return "";
  };

  /* ================= SAVE ================= */

  const handleSave = async () => {
    await update(
      ref(db, `families/${familyId}/members/${member.id}`),
      {
        ...form,
        education: getEducationSummary(),
        updatedAt: Date.now()
      }
    );

    onClose();
  };

  /* ================= SKILLS MODE ================= */

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

  /* ================= UI ================= */

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">

        <h2 className="text-lg font-bold mb-4">Edit Member</h2>

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
            onChange={e => updateField("isStudent", e.target.checked)}
          />
          Student
        </label>

        {/* STUDENT SECTION */}

        {form.isStudent && (
  <>
    {/* Gender */}
    <label className="block text-sm font-medium mt-3">
      Gender
    </label>
    <select
      className="w-full border p-2 rounded mb-2"
      value={form.gender}
      onChange={e => updateField("gender", e.target.value)}
    >
      <option value="">Select</option>
      <option>Male</option>
      <option>Female</option>
      <option>Other</option>
    </select>

    {/* Birth Date */}
    <label className="block text-sm font-medium">
      Birth Date
    </label>
    <input
      type="date"
      className="w-full border p-2 rounded mb-2"
      value={form.dob}
      onChange={e => updateField("dob", e.target.value)}
    />

    {/* Stay Away Toggle */}
    <label className="flex items-center gap-2 my-2">
      <input
        type="checkbox"
        checked={form.stayAway || false}
        onChange={e =>
          updateField("stayAway", e.target.checked)
        }
      />
      Staying away from family
    </label>

    {/* Stay City */}
    {form.stayAway && (
      <input
        className="w-full border p-2 rounded mb-2"
        placeholder="City where staying"
        value={form.stayCity || ""}
        onChange={e =>
          updateField("stayCity", e.target.value)
        }
      />
    )}

    {/* Existing Education Section */}
    <StudentEducationSection
      student={form}
      update={updateField}
    />

    {/* Skills Button */}
    <button
      onClick={() => {
        setSkillCardIdx(0);
        setShowSkills(true);
      }}
      className="w-full border-2 border-indigo-200 text-indigo-600 py-2 rounded mb-2"
    >
      🎯 Skills & Talents
    </button>

    {/* Financial Support Section */}
    <StudentFinancialSection
      student={form}
      update={updateField}
    />
  </>
)}


        {/* MEMBER SECTION */}

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
