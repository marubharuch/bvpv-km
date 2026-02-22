import { useState, useEffect } from "react";
import { ref, update } from "firebase/database";
import { db } from "../../firebase";
import StudentEducationSection from "../StudentEducationSection";
import StudentSkillsSection from "../StudentSkillsSection";
import StudentFinancialSection from "../StudentFinancialSection";
import { saveCache, loadCache } from "../../utils/cache";

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
  member
}) {
  /* ================= STATE ================= */

  const [form, setForm] = useState(null);
  const [showSkills, setShowSkills] = useState(false);
  const [skillCardIdx, setSkillCardIdx] = useState(0);
  const [showReview, setShowReview] = useState(false);

  /* ================= LOAD MEMBER ================= */

  useEffect(() => {
    if (!member) return;

    const loadDraftOrMember = async () => {
      const draft = await loadCache(`memberDraft_${member.id}`);

      if (draft) {
        setForm(draft);
      } else {
        setForm({
          name: member.name || "",
          mobile: member.mobile || member.phone || "",
          email: member.email || "",
          occupation: member.occupation || "",
          married: member.married || false,
          isStudent: member.isStudent || false,
          gender: member.gender || "",
          dob: member.dob || "",
          stayAway: member.stayAway || false,
          stayCity: member.stayCity || "",
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
      }
    };

    loadDraftOrMember();
  }, [member]);

  /* ================= AUTO SAVE DRAFT (debounced 600ms) ================= */

  useEffect(() => {
    if (!form || !member) return;
    const timer = setTimeout(() => {
      saveCache(`memberDraft_${member.id}`, form);
    }, 600);
    return () => clearTimeout(timer);
  }, [form, member]);

  /* ================= HELPERS ================= */

  const updateField = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const getEducationSummary = () => {
    if (!form?.isStudent) return "";

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
    await update(ref(db, `members/${member.id}`), {
      ...form,
      education: getEducationSummary(),
      updatedAt: Date.now()
    });

    await saveCache(`memberDraft_${member.id}`, null);
    const updatedData = { ...form, education: getEducationSummary() };
    onClose(true, { ...member, ...updatedData }); // ✅ pass updated member back
  };

  /* ================= GUARDS ================= */

  if (!open || !member || !form) return null;

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

  /* ================= REVIEW MODE ================= */

  if (showReview) {
    const reviewData = {
      ...form,
      education: getEducationSummary()
    };

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">

          <h2 className="text-lg font-bold mb-4">
            Review Member Details
          </h2>

          <div className="text-xl font-semibold text-center mb-4">
            {form.name}
          </div>

          <div className="space-y-2">
            {Object.entries(reviewData).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b py-1">
                <span className="font-medium text-gray-600">
                  {key}
                </span>

                <span className="text-right">
                  {Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 text-white py-2 rounded"
            >
              Submit
            </button>

            <button
  onClick={() => onClose(false)}
  className="flex-1 border py-2 rounded"
>
  Cancel
</button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= MAIN EDIT UI ================= */

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">

        <h2 className="text-lg font-bold mb-4">Edit Member</h2>

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

        <label className="flex items-center gap-2 my-3">
          <input
            type="checkbox"
            checked={form.isStudent}
            onChange={e => updateField("isStudent", e.target.checked)}
          />
          Student
        </label>

        {form.isStudent && (
          <>
            <StudentEducationSection student={form} update={updateField} />

            <button
              onClick={() => {
                setSkillCardIdx(0);
                setShowSkills(true);
              }}
              className="w-full border-2 border-indigo-200 text-indigo-600 py-2 rounded mb-2"
            >
              🎯 Skills & Talents
            </button>

            <StudentFinancialSection student={form} update={updateField} />
          </>
        )}

        {!form.isStudent && (
          <>
            <input
              className="w-full border p-2 rounded mb-2"
              placeholder="Occupation"
              value={form.occupation}
              onChange={e => updateField("occupation", e.target.value)}
            />

            <label className="flex items-center gap-2 my-2">
              <input
                type="checkbox"
                checked={form.married}
                onChange={e => updateField("married", e.target.checked)}
              />
              Married
            </label>
          </>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowReview(true)}
            className="flex-1 bg-blue-600 text-white py-2 rounded"
          >
            Save
          </button>

          <button
            onClick={() => onClose(false)}
            className="flex-1 border py-2 rounded"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}