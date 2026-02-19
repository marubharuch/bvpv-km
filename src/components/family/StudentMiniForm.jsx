import StudentSkillsSection from "../StudentSkillsSection";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// DOBPicker (local copy — same as in StudentFormPage)
// ─────────────────────────────────────────────────────────────
function DOBPicker({ value, onChange, error }) {
  const [year, month, day] = (value || "--").split("-").map(Number);
  const currentYear = new Date().getFullYear();
  const years  = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const maxDay = (!month || !year) ? 31 : new Date(year, month, 0).getDate();
  const days   = Array.from({ length: maxDay }, (_, i) => i + 1);
  const emit   = (d, m, y) => {
    if (d && m && y) onChange(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
  };
  const cls = "flex-1 border-2 border-gray-200 rounded-xl px-2 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-white text-center";
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        Date of Birth <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-2">
        <select value={day||""} onChange={e=>emit(+e.target.value,month,year)} className={cls} aria-label="Day">
          <option value="">Day</option>
          {days.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <select value={month||""} onChange={e=>emit(day,+e.target.value,year)} className={cls} aria-label="Month">
          <option value="">Month</option>
          {months.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={year||""} onChange={e=>emit(day,month,+e.target.value)} className={cls} aria-label="Year">
          <option value="">Year</option>
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {error && <p className="text-red-600 text-sm mt-1">⚠ {error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// StudentMiniForm
//
// Collects additional data for one student.
// Name is already known from contacts — shown as header, not editable here.
//
// Props:
//   student        — member object { name, relation, gender, dob, mobile,
//                    skills, achievements, aboutMe, needsScholarship, supportType }
//   studentNumber  — 1-based display number (e.g. "Student 1 of 3")
//   totalStudents  — total count
//   onChange       — (field, value) => void
//   onNext         — go to next student or review
//   onBack         — go back
// ─────────────────────────────────────────────────────────────

const SUPPORT_TYPES = ["Kit", "Coaching", "Travel", "Equipment", "Scholarship"];

export default function StudentMiniForm({
  student,
  studentNumber,
  totalStudents,
  onChange,
  onNext,
  onBack,
}) {
  const [errors,   setErrors]   = useState({});
  const [touched,  setTouched]  = useState({});
  const [showSkills, setShowSkills] = useState(false);
  const [skillCardIdx, setSkillCardIdx] = useState(0);

  const validate = () => {
    const errs = {};
    if (!student.gender)    errs.gender = "Gender is required";
    if (!student.dob)       errs.dob    = "Birth date is required";
    if (student.mobile) {
      const digits = student.mobile.replace(/\D/g,"");
      const last10 = digits.slice(-10);
      if (!/^[6-9]\d{9}$/.test(last10)) errs.mobile = "Enter a valid 10-digit Indian mobile number";
    }
    setErrors(errs);
    setTouched({ gender: true, dob: true, mobile: true });
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  // Skills section uses StudentSkillsSection which has its own internal navigation
  if (showSkills) {
    return (
      <StudentSkillsSection
        student={student}
        update={onChange}
        cardIndex={skillCardIdx}
        setCardIndex={setSkillCardIdx}
        exitSkillsMode={() => setShowSkills(false)}
      />
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg p-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-1">
            Student {studentNumber} of {totalStudents}
          </p>
          <h2 className="text-xl font-black text-gray-900">{student.name}</h2>
          {student.relation && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">
              {student.relation}
            </span>
          )}
        </div>
        <div className="text-4xl">🎓</div>
      </div>

      <hr className="border-gray-100" />

      {/* Gender */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">
          Gender <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-3">
          {["Male", "Female", "Other"].map(g => (
            <button
              key={g}
              type="button"
              onClick={() => onChange("gender", g)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95
                ${student.gender === g
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                }`}
            >
              {g}
            </button>
          ))}
        </div>
        {touched.gender && errors.gender && (
          <p className="text-red-600 text-sm mt-1">⚠ {errors.gender}</p>
        )}
      </div>

      {/* DOB */}
      <DOBPicker
        value={student.dob}
        onChange={v => onChange("dob", v)}
        error={touched.dob ? errors.dob : ""}
      />

      {/* Mobile */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">
          Mobile Number
          <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="tel"
          inputMode="tel"
          value={student.mobile || ""}
          onChange={e => {
            if (/^[0-9+\s\-()]*$/.test(e.target.value)) onChange("mobile", e.target.value);
          }}
          placeholder="+91 XXXXX XXXXX"
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-indigo-500 focus:outline-none transition-colors"
        />
        {touched.mobile && errors.mobile && (
          <p className="text-red-600 text-sm mt-1">⚠ {errors.mobile}</p>
        )}
      </div>

      {/* Skills & Talents */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">Sports & Talents</label>
        {Object.entries(student.skills || {}).some(([, list]) => list.length > 0) ? (
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3 mb-2">
            {Object.entries(student.skills || {}).map(([cat, list]) =>
              list.length > 0 ? (
                <p key={cat} className="text-sm text-indigo-900">
                  <strong>{cat}:</strong> {list.join(", ")}
                </p>
              ) : null
            )}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => { setShowSkills(true); setSkillCardIdx(0); }}
          className="w-full border-2 border-indigo-200 text-indigo-600 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-50 transition-all active:scale-98"
        >
          {Object.entries(student.skills || {}).some(([, list]) => list.length > 0)
            ? "✏️ Edit Skills & Talents"
            : "🎯 Add Skills & Talents"
          }
        </button>
      </div>

      {/* Achievements */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">
          Achievements
          <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={student.achievements || ""}
          onChange={e => onChange("achievements", e.target.value)}
          placeholder="Awards, medals, certificates..."
          rows={3}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none transition-colors resize-none"
        />
      </div>

      {/* About Me */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">
          About {student.name.split(" ")[0]}
          <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          value={student.aboutMe || ""}
          onChange={e => onChange("aboutMe", e.target.value)}
          placeholder="Interests, goals, anything to share..."
          rows={3}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none transition-colors resize-none"
        />
      </div>

      {/* Scholarship / Support */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-700">
            Needs financial support?
          </label>
          <button
            type="button"
            onClick={() => onChange("needsScholarship", !student.needsScholarship)}
            className={`relative w-12 h-6 rounded-full transition-all ${
              student.needsScholarship ? "bg-indigo-600" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
              student.needsScholarship ? "left-6" : "left-0.5"
            }`} />
          </button>
        </div>

        {student.needsScholarship && (
          <div>
            <p className="text-xs text-gray-500 mb-2">What kind of support is needed?</p>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_TYPES.map(type => {
                const active = student.supportType?.[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange("supportType", {
                      ...student.supportType,
                      [type]: !active
                    })}
                    className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all active:scale-95
                      ${active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                      }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-50 transition-all active:scale-98"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-98 shadow-md"
        >
          {studentNumber < totalStudents ? `Next Student →` : "Go to Review →"}
        </button>
      </div>
    </div>
  );
}
