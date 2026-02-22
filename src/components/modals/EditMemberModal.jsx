import { useState, useEffect } from "react";
import { ref, update, push, set } from "firebase/database";
import { db } from "../../firebase";
import StudentEducationSection from "../StudentEducationSection";
import StudentSkillsSection from "../StudentSkillsSection";
import StudentFinancialSection from "../StudentFinancialSection";
import { saveCache, loadCache } from "../../utils/cache";

/* ============================================================
   MemberModal — handles both ADD and EDIT in one component
   
   Usage (Edit):
     <MemberModal open={true} mode="edit" member={memberObj} familyId={famId} onClose={fn} />

   Usage (Add):
     <MemberModal open={true} mode="add" familyId={famId} onClose={fn} />

   onClose signature:
     onClose(saved: boolean, member?: MemberObject)
============================================================ */

const EMPTY_FORM = {
  name:             "",
  mobile:           "",
  email:            "",
  occupation:       "",
  married:          false,
  isStudent:        false,
  gender:           "",
  dob:              "",
  stayAway:         false,
  stayCity:         "",
  educationType:    "",
  standard:         "",
  stream:           "",
  medium:           "",
  year:             "",
  degree:           "",
  specialization:   "",
  collegeName:      "",
  courseName:       "",
  courseStage:      "",
  exam:             "",
  skills:           { indoorSports: [], outdoorSports: [], talents: [], creative: [], hobbies: [], funActivities: [] },
  helpRequired:     "",
  needsScholarship: null,
  supportType:      {},
};

const FIELD_LABELS = {
  name:             "Name",
  mobile:           "Mobile",
  email:            "Email",
  occupation:       "Occupation",
  married:          "Married",
  isStudent:        "Is Student",
  gender:           "Gender",
  dob:              "Date of Birth",
  stayAway:         "Stays Away",
  stayCity:         "Stay City",
  educationType:    "Education Level",
  standard:         "Class / Grade",
  stream:           "Stream",
  medium:           "Medium",
  year:             "Year",
  degree:           "Degree",
  specialization:   "Specialization",
  collegeName:      "College Name",
  courseName:       "Course Name",
  courseStage:      "Course Stage",
  exam:             "Exam",
  helpRequired:     "Help Required",
  needsScholarship: "Needs Scholarship",
  supportType:      "Support Needed",
  education:        "Education Summary",
};

const SKIP_IN_REVIEW = new Set(["skills"]);

// Reusable toggle switch
function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer">
      <div
        onClick={onChange}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? "bg-blue-500" : "bg-gray-300"}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? "left-6" : "left-1"}`} />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
  );
}

export default function EditMemberModal({
  open,
  mode = "edit",      // "edit" | "add"
  member = null,      // required for edit, null for add
  familyId,           // required for add (to link new member to family)
  onClose,
}) {
  const isAdding = mode === "add";

  const [form, setForm] = useState(null);
  const [showSkills, setShowSkills] = useState(false);
  const [skillCardIdx, setSkillCardIdx] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Draft key differs for add vs edit
  const draftKey = isAdding
    ? `memberDraft_new_${familyId}`
    : `memberDraft_${member?.id}`;

  /* ================= LOAD FORM ================= */

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      const draft = await loadCache(draftKey);
      const hasDraft = draft && typeof draft === "object" && Object.keys(draft).length > 0;

      if (hasDraft) {
        setForm(draft);
        return;
      }

      if (isAdding) {
        // Add mode — start with empty form
        setForm({ ...EMPTY_FORM });
      } else {
        // Edit mode — populate from existing member
        if (!member) return;
        setForm({
          name:             member.name             || "",
          mobile:           member.mobile           || member.phone || "",
          email:            member.email            || "",
          occupation:       member.occupation       || "",
          married:          member.married          || false,
          isStudent:        member.isStudent        || false,
          gender:           member.gender           || "",
          dob:              member.dob              || "",
          stayAway:         member.stayAway         || false,
          stayCity:         member.stayCity         || "",
          educationType:    member.educationType    || "",
          standard:         member.standard         || "",
          stream:           member.stream           || "",
          medium:           member.medium           || "",
          year:             member.year             || "",
          degree:           member.degree           || "",
          specialization:   member.specialization   || "",
          collegeName:      member.collegeName      || "",
          courseName:       member.courseName       || "",
          courseStage:      member.courseStage      || "",
          exam:             member.exam             || "",
          skills:           member.skills           || { ...EMPTY_FORM.skills },
          helpRequired:     member.helpRequired     || "",
          needsScholarship: member.needsScholarship ?? null,
          supportType:      member.supportType      || {},
        });
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdding, member?.id]);

  /* ================= RESET ON CLOSE ================= */

  useEffect(() => {
    if (!open) {
      setForm(null);
      setShowSkills(false);
      setShowReview(false);
      setErrors({});
      setSkillCardIdx(0);
    }
  }, [open]);

  /* ================= AUTO SAVE DRAFT (debounced 600ms) ================= */

  useEffect(() => {
    if (!form || !open) return;
    const timer = setTimeout(() => {
      saveCache(draftKey, form);
    }, 600);
    return () => clearTimeout(timer);
  }, [form, draftKey, open]);

  /* ================= HELPERS ================= */

  const updateField = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const getEducationSummary = () => {
    if (!form?.isStudent) return "";
    if (form.educationType === "School Student")      return form.standard;
    if (form.educationType === "College Student")     return `${form.degree || ""} ${form.year || ""}`.trim();
    if (form.educationType === "Postgraduate")        return `PG ${form.year || ""}`.trim();
    if (form.educationType === "Diploma / ITI")       return `Diploma ${form.year || ""}`.trim();
    if (form.educationType === "Professional Course") return `${form.courseName || ""} ${form.courseStage || ""}`.trim();
    if (form.educationType === "Competitive Prep")    return form.exam;
    return "";
  };

  /* ================= VALIDATION ================= */

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = "Name is required";
    if (form.mobile && !/^\d{10}$/.test(form.mobile.trim())) {
      errs.mobile = "Enter a valid 10-digit mobile number";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGoToReview = () => {
    if (validate()) setShowReview(true);
  };

  /* ================= SAVE ================= */

  const handleSave = async () => {
    setSaving(true);
    try {
      const education = getEducationSummary();
      const payload = { ...form, education };

      if (isAdding) {
        // ── ADD: push new member, then link to family ──
        const newMemberRef = push(ref(db, "members"));
        await set(newMemberRef, {
          ...payload,
          familyId,
          createdAt: Date.now(),
        });
        // Link member ID into family node
        await update(ref(db, `families/${familyId}/members`), {
          [newMemberRef.key]: true,
        });

        await saveCache(draftKey, {});
        onClose(true, { id: newMemberRef.key, familyId, ...payload });

      } else {
        // ── EDIT: update existing member ──
        await update(ref(db, `members/${member.id}`), {
          ...payload,
          updatedAt: Date.now(),
        });

        await saveCache(draftKey, {});
        onClose(true, { ...member, ...payload });
      }

    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  /* ================= GUARDS ================= */

  if (!open || !form) return null;

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
    const reviewData = { ...form, education: getEducationSummary() };

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

          <div className="sticky top-0 bg-white border-b px-5 py-4 rounded-t-2xl">
            <h2 className="text-lg font-bold text-gray-800">Review Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">Please confirm before saving</p>
          </div>

          <div className="px-5 py-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 mx-auto mb-1">
                {(form.name || "?")[0].toUpperCase()}
              </div>
              <p className="font-semibold text-gray-800">{form.name || "—"}</p>
            </div>

            <div className="space-y-1">
              {Object.entries(reviewData)
                .filter(([key]) => !SKIP_IN_REVIEW.has(key))
                .map(([key, value]) => {
                  if (value === "" || value === null || value === undefined) return null;
                  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return null;

                  const label = FIELD_LABELS[key] || key;
                  let display = "";
                  if (Array.isArray(value))       display = value.join(", ");
                  else if (typeof value === "boolean") display = value ? "Yes" : "No";
                  else if (typeof value === "object") {
                    display = Object.entries(value)
                      .filter(([, v]) => v)
                      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
                      .join(", ") || "None";
                  }
                  else display = String(value);

                  return (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-xs font-medium text-gray-800 text-right max-w-[55%]">{display}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t px-5 py-4 flex gap-2 rounded-b-2xl">
            <button
              onClick={() => setShowReview(false)}
              className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-medium text-gray-600"
            >
              ← Edit
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Saving..." : isAdding ? "Add Member ✓" : "Confirm & Save"}
            </button>
          </div>

        </div>
      </div>
    );
  }

  /* ================= MAIN FORM UI ================= */

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {isAdding ? "Add Member" : "Edit Member"}
            </h2>
            {isAdding && (
              <p className="text-xs text-gray-400 mt-0.5">Fill in the new member's details</p>
            )}
          </div>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-gray-600">Name *</label>
            <input
              className={`w-full border rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.name ? "border-red-400" : "border-gray-200"}`}
              placeholder="Full name"
              value={form.name}
              onChange={e => updateField("name", e.target.value)}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Mobile */}
          <div>
            <label className="text-xs font-medium text-gray-600">Mobile</label>
            <input
              className={`w-full border rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.mobile ? "border-red-400" : "border-gray-200"}`}
              placeholder="10-digit mobile number"
              value={form.mobile}
              inputMode="numeric"
              maxLength={10}
              onChange={e => updateField("mobile", e.target.value)}
            />
            {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Email address"
              value={form.email}
              onChange={e => updateField("email", e.target.value)}
            />
          </div>

          {/* Is Student */}
          <Toggle
            value={form.isStudent}
            onChange={() => updateField("isStudent", !form.isStudent)}
            label="Is a Student"
          />

          {/* STUDENT FIELDS */}
          {form.isStudent && (
            <>
              <StudentEducationSection student={form} update={updateField} />

              <button
                onClick={() => { setSkillCardIdx(0); setShowSkills(true); }}
                className="w-full border-2 border-indigo-200 text-indigo-600 py-2.5 rounded-xl text-sm font-medium"
              >
                🎯 Skills & Talents
              </button>

              <StudentFinancialSection student={form} update={updateField} />
            </>
          )}

          {/* NON-STUDENT FIELDS */}
          {!form.isStudent && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600">Occupation</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g. Engineer, Teacher, Business"
                  value={form.occupation}
                  onChange={e => updateField("occupation", e.target.value)}
                />
              </div>

              <Toggle
                value={form.married}
                onChange={() => updateField("married", !form.married)}
                label="Married"
              />
            </>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-5 py-4 flex gap-2 rounded-b-2xl">
          <button
            onClick={() => onClose(false)}
            className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-medium text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleGoToReview}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold"
          >
            {isAdding ? "Review & Add →" : "Review & Save →"}
          </button>
        </div>

      </div>
    </div>
  );
}