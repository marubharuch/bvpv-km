import { useState, useEffect, useCallback } from "react";
import { ref, update, push } from "firebase/database";
import { db } from "../../firebase";
import { saveCache, loadCache } from "../../utils/cache";
import {
  User, GraduationCap, Star, IndianRupee,
  ChevronRight, Check, X, Plus
} from "lucide-react";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const EMPTY_FORM = {
  name: "", countryCode: "+91", mobile: "", email: "", gender: "",
  dobDay: "", dobMonth: "", dobYear: "",
  married: false, stayAway: false, stayCity: "",
  isStudent: false, occupation: "",
  educationType: "", standard: "", stream: "", medium: "",
  year: "", degree: "", specialization: "", collegeName: "",
  courseName: "", courseStage: "", exam: "",
  indoorSports: [], outdoorSports: [], talents: [],
  creative: [], hobbies: [], funActivities: [],
  achievements: "", aboutMe: "",
  needsScholarship: false,   // ✅ FIX 2: false not null
  supportFees: false, supportBooks: false,
  supportCoaching: false, supportCounseling: false,
  helpRequired: "",
};

const TABS = [
  { id: "basic",     label: "Basic",   icon: User },
  { id: "education", label: "Study",   icon: GraduationCap },
  { id: "skills",    label: "Skills",  icon: Star },
  { id: "financial", label: "Support", icon: IndianRupee },
];

const EDUCATION_TYPES = [
  "School Student", "College Student", "Postgraduate",
  "Diploma / ITI", "Professional Course", "Competitive Prep"
];
const SCHOOL_STANDARDS = [
  "Nursery","Jr KG","Sr KG","1st","2nd","3rd","4th","5th",
  "6th","7th","8th","9th","10th","11th","12th"
];
const COLLEGE_YEARS        = ["1st Year","2nd Year","3rd Year","Final Year"];
const PG_YEARS             = ["PG Year 1","PG Final Year"];
const DIPLOMA_YEARS        = ["Year 1","Year 2","Year 3"];
const DEGREE_PROGRAMS      = ["BSc","BCom","BA","BBA","BE/BTech","MBBS","BDS","BPharma","Law","Other"];
const PROFESSIONAL_COURSES = ["CA","CS","CMA","CFA","Other"];
const PROFESSIONAL_STAGES  = ["Foundation","Inter","Final"];
const NEEDS_STREAM         = ["11th","12th"];

const COUNTRY_CODES = [
  { code: "+91",  flag: "🇮🇳", name: "India" },
  { code: "+1",   flag: "🇺🇸", name: "USA/Canada" },
  { code: "+44",  flag: "🇬🇧", name: "UK" },
  { code: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia" },
  { code: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "+81",  flag: "🇯🇵", name: "Japan" },
];

const SKILL_CATEGORIES = [
  { key: "indoorSports",  label: "Indoor Sports",  emoji: "🏓", options: ["Chess","Carrom","TT","Badminton (Indoor)","Snooker"] },
  { key: "outdoorSports", label: "Outdoor Sports", emoji: "🏏", options: ["Cricket","Badminton","Football","Kabaddi","Athletics"] },
  { key: "talents",       label: "Talents",        emoji: "🎤", options: ["Singing","Dancing","Anchoring","Acting","Public Speaking"] },
  { key: "creative",      label: "Creative",       emoji: "🎨", options: ["Reel Making","Content Writing","Photography","Drawing","Craft"] },
  { key: "hobbies",       label: "Hobbies",        emoji: "📖", options: ["Trekking","Reading","Gardening","Cooking","Travel"] },
  { key: "funActivities", label: "Fun",            emoji: "🎉", options: ["Antakshari","Quiz","One Minute Games","Dumb Charades"] },
];

// ✅ Normalize mobile — handles Indian and international numbers
function normalizeMobile(mobile) {
  if (!mobile) return "";
  const cleaned = String(mobile).trim();
  if (cleaned.startsWith("+")) {
    // International format — remove spaces, dashes, brackets only
    return cleaned.replace(/[\s\-\(\)]/g, "");
  }
  // No + prefix — assume India, strip to 10 digits
  return cleaned.replace(/\D/g, "").slice(-10);
}

// ─────────────────────────────────────────────
// REUSABLE UI PIECES
// ─────────────────────────────────────────────
function FieldLabel({ children }) {
  return <p className="text-xs font-semibold mb-1.5" style={{ color: "#7B1C2E" }}>{children}</p>;
}

function TextInput({ label, value, onChange, placeholder, type = "text", inputMode, maxLength, error }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        type={type} inputMode={inputMode} maxLength={maxLength}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontSize: 16,
          border: error ? "2px solid #ef4444" : "2px solid #f0e6e6",
          background: "#fff", color: "#3D0010",
        }}
        className="w-full rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function PillSelect({ label, value, onChange, options }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          const active = value === val;
          return (
            <button key={val} type="button" onClick={() => onChange(val)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
              style={active
                ? { background: "#7B1C2E", color: "#F0D080", borderColor: "#7B1C2E" }
                : { background: "#fff", color: "#7B1C2E", borderColor: "#f0e6e6" }
              }
            >{lbl}</button>
          );
        })}
      </div>
    </div>
  );
}

function BigToggle({ value, onChange, labelOn, labelOff }) {
  return (
    <button type="button" onClick={onChange}
      className="flex items-center justify-between w-full px-4 py-3 rounded-xl border-2 transition-all"
      style={{ borderColor: value ? "#C9A84C" : "#f0e6e6", background: value ? "#FDF0D0" : "#fff" }}
    >
      <span className="text-sm font-semibold" style={{ color: value ? "#7B5A00" : "#9B6060" }}>
        {value ? labelOn : labelOff}
      </span>
      <div className="w-12 h-6 rounded-full relative transition-colors"
        style={{ background: value ? "#C9A84C" : "#e5e7eb" }}>
        <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
          style={{ left: value ? "28px" : "4px" }} />
      </div>
    </button>
  );
}

function NativeSelect({ label, value, onChange, options }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="relative">
        <select value={value || ""} onChange={e => onChange(e.target.value)}
          style={{
            fontSize: 16, border: "2px solid #f0e6e6", background: "#fff",
            color: value ? "#3D0010" : "#9B6060",
            appearance: "none", WebkitAppearance: "none",
          }}
          className="w-full rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors pr-10"
        >
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none"
          style={{ color: "#9B6060" }} />
      </div>
    </div>
  );
}

function SkillChip({ label, selected, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all"
      style={selected
        ? { borderColor: "#7B1C2E", background: "#FDE8EC", color: "#7B1C2E" }
        : { borderColor: "#f0e6e6", background: "#fff", color: "#9B6060" }
      }
    >
      {selected && <Check size={11} strokeWidth={3} />}
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────
// TAB CONTENT
// ─────────────────────────────────────────────
function TabBasic({ form, update, errors }) {
  const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const MONTHS = [
    { v: "01", l: "Jan" }, { v: "02", l: "Feb" }, { v: "03", l: "Mar" },
    { v: "04", l: "Apr" }, { v: "05", l: "May" }, { v: "06", l: "Jun" },
    { v: "07", l: "Jul" }, { v: "08", l: "Aug" }, { v: "09", l: "Sep" },
    { v: "10", l: "Oct" }, { v: "11", l: "Nov" }, { v: "12", l: "Dec" },
  ];
  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-4 px-4 py-4">

      {/* Name */}
      <TextInput label="Full Name *" value={form.name} onChange={v => update("name", v)}
        placeholder="e.g. Ramesh Patel" error={errors.name} />

      {/* Mobile — country code + number split */}
      <div>
        <FieldLabel>Mobile Number</FieldLabel>
        <div className="flex gap-2">
          {/* Country code dropdown */}
          <div className="relative flex-shrink-0">
            <select
              value={form.countryCode || "+91"}
              onChange={e => update("countryCode", e.target.value)}
              style={{
                fontSize: 14,
                border: "2px solid #f0e6e6",
                background: "#fff",
                color: "#3D0010",
                appearance: "none",
                WebkitAppearance: "none",
                minWidth: 80,
              }}
              className="rounded-xl px-2 py-3 outline-none focus:border-[#C9A84C] transition-colors pr-6"
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <ChevronRight size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none"
              style={{ color: "#9B6060" }} />
          </div>
          {/* Number input */}
          <input
            type="tel"
            inputMode="numeric"
            value={form.mobile}
            onChange={e => update("mobile", e.target.value.replace(/\D/g, ""))}
            placeholder="Mobile number"
            maxLength={15}
            style={{
              fontSize: 16,
              border: errors.mobile ? "2px solid #ef4444" : "2px solid #f0e6e6",
              background: "#fff",
              color: "#3D0010",
            }}
            className="flex-1 rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors"
          />
        </div>
        {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
      </div>

      {/* Email */}
      <TextInput label="Email" value={form.email} onChange={v => update("email", v)}
        placeholder="email@example.com" type="email" />

      {/* Gender */}
      <PillSelect label="Gender" value={form.gender} onChange={v => update("gender", v)}
        options={["Male","Female","Other"]} />

      {/* DOB — split into Day / Month / Year */}
      <div>
        <FieldLabel>Date of Birth</FieldLabel>
        <div className="flex gap-2">
          {/* Day */}
          <div className="relative flex-1">
            <select value={form.dobDay || ""} onChange={e => update("dobDay", e.target.value)}
              style={{
                fontSize: 16, border: "2px solid #f0e6e6", background: "#fff",
                color: form.dobDay ? "#3D0010" : "#9B6060",
                appearance: "none", WebkitAppearance: "none",
              }}
              className="w-full rounded-xl px-3 py-3 outline-none focus:border-[#C9A84C] transition-colors pr-7">
              <option value="">Day</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none"
              style={{ color: "#9B6060" }} />
          </div>
          {/* Month */}
          <div className="relative flex-1">
            <select value={form.dobMonth || ""} onChange={e => update("dobMonth", e.target.value)}
              style={{
                fontSize: 16, border: "2px solid #f0e6e6", background: "#fff",
                color: form.dobMonth ? "#3D0010" : "#9B6060",
                appearance: "none", WebkitAppearance: "none",
              }}
              className="w-full rounded-xl px-3 py-3 outline-none focus:border-[#C9A84C] transition-colors pr-7">
              <option value="">Month</option>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none"
              style={{ color: "#9B6060" }} />
          </div>
          {/* Year — text input, faster than scrolling 100 years */}
          <input
            type="tel"
            inputMode="numeric"
            value={form.dobYear || ""}
            onChange={e => update("dobYear", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Year"
            maxLength={4}
            style={{
              fontSize: 16, border: "2px solid #f0e6e6",
              background: "#fff", color: "#3D0010",
            }}
            className="flex-1 rounded-xl px-3 py-3 outline-none focus:border-[#C9A84C] transition-colors"
          />
        </div>
      </div>

      <BigToggle value={form.married} onChange={() => update("married", !form.married)}
        labelOn="Married ✓" labelOff="Unmarried" />
      <BigToggle value={form.stayAway} onChange={() => update("stayAway", !form.stayAway)}
        labelOn="Stays away from home" labelOff="Stays at home" />
      {form.stayAway && (
        <TextInput label="Which city?" value={form.stayCity} onChange={v => update("stayCity", v)}
          placeholder="e.g. Ahmedabad, Surat" />
      )}
    </div>
  );
}

function TabEducation({ form, update }) {
  const isStudent     = form.isStudent;
  const isSchool      = form.educationType === "School Student";
  const isCollege     = form.educationType === "College Student";
  const isPG          = form.educationType === "Postgraduate";
  const isDiploma     = form.educationType === "Diploma / ITI";
  const isProfessional= form.educationType === "Professional Course";
  const isCompetitive = form.educationType === "Competitive Prep";
  const needsStream   = isSchool && NEEDS_STREAM.includes(form.standard); // ✅ FIX 5

  const handleEducationType = (v) => {
    update("educationType", v);
    ["standard","stream","medium","year","degree","specialization",
     "collegeName","courseName","courseStage","exam"].forEach(f => update(f, ""));
  };

  // ✅ FIX 4: reset student fields when turning student OFF
  const handleStudentToggle = () => {
    const turningOff = isStudent;
    update("isStudent", !isStudent);
    if (turningOff) {
      update("educationType", "");
      update("standard", ""); update("stream", ""); update("medium", "");
      update("year", ""); update("degree", ""); update("specialization", "");
      update("collegeName", ""); update("courseName", "");
      update("courseStage", ""); update("exam", "");
      update("needsScholarship", false);
      update("supportFees", false); update("supportBooks", false);
      update("supportCoaching", false); update("supportCounseling", false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <BigToggle value={isStudent} onChange={handleStudentToggle}
        labelOn="🎓 Is a Student" labelOff="Not a student" />

      {!isStudent && (
        <TextInput label="Occupation" value={form.occupation}
          onChange={v => update("occupation", v)} placeholder="e.g. Engineer, Teacher, Business" />
      )}

      {isStudent && (
        <>
          <NativeSelect label="Education Level" value={form.educationType}
            onChange={handleEducationType} options={EDUCATION_TYPES} />
          {isSchool && (
            <>
              <NativeSelect label="Class / Grade" value={form.standard}
                onChange={v => update("standard", v)} options={SCHOOL_STANDARDS} />
              {needsStream && (
                <PillSelect label="Stream" value={form.stream}
                  onChange={v => update("stream", v)} options={["Science","Commerce","Arts"]} />
              )}
              <PillSelect label="Medium" value={form.medium}
                onChange={v => update("medium", v)} options={["English","Gujarati","Hindi"]} />
            </>
          )}
          {isCollege && (
            <>
              <NativeSelect label="Year of Study" value={form.year} onChange={v => update("year", v)} options={COLLEGE_YEARS} />
              <NativeSelect label="Degree Program" value={form.degree} onChange={v => update("degree", v)} options={DEGREE_PROGRAMS} />
              <TextInput label="Branch / Major" value={form.specialization} onChange={v => update("specialization", v)} placeholder="e.g. Computer Science" />
              <TextInput label="College Name" value={form.collegeName} onChange={v => update("collegeName", v)} placeholder="College name" />
            </>
          )}
          {isPG && (
            <>
              <NativeSelect label="Year" value={form.year} onChange={v => update("year", v)} options={PG_YEARS} />
              <TextInput label="Major / Specialization" value={form.specialization} onChange={v => update("specialization", v)} placeholder="e.g. MBA Finance" />
            </>
          )}
          {isDiploma && (
            <>
              <NativeSelect label="Year" value={form.year} onChange={v => update("year", v)} options={DIPLOMA_YEARS} />
              <TextInput label="Branch / Trade" value={form.specialization} onChange={v => update("specialization", v)} placeholder="e.g. Electrical" />
            </>
          )}
          {isProfessional && (
            <>
              <NativeSelect label="Course" value={form.courseName} onChange={v => update("courseName", v)} options={PROFESSIONAL_COURSES} />
              <PillSelect label="Stage" value={form.courseStage} onChange={v => update("courseStage", v)} options={PROFESSIONAL_STAGES} />
            </>
          )}
          {isCompetitive && (
            <TextInput label="Exam Name" value={form.exam} onChange={v => update("exam", v)} placeholder="e.g. UPSC, JEE, NEET" />
          )}
        </>
      )}
    </div>
  );
}

function TabSkills({ form, update }) {
  const [customInputs, setCustomInputs] = useState({});

  const toggleSkill = (categoryKey, skill) => {
    const current = form[categoryKey] || [];
    const updated = current.includes(skill)
      ? current.filter(s => s !== skill)
      : [...current, skill];
    update(categoryKey, updated);
  };

  const addCustom = (categoryKey) => {
    const val = (customInputs[categoryKey] || "").trim();
    if (!val) return;
    toggleSkill(categoryKey, val);
    setCustomInputs(prev => ({ ...prev, [categoryKey]: "" }));
  };

  return (
    <div className="space-y-5 px-4 py-4">
      {SKILL_CATEGORIES.map(cat => {
        const selected = form[cat.key] || [];
        const customSkills = selected.filter(s => !cat.options.includes(s));
        return (
          <div key={cat.key}>
            <FieldLabel>{cat.emoji} {cat.label}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {cat.options.map(skill => (
                <SkillChip key={skill} label={skill}
                  selected={selected.includes(skill)}
                  onToggle={() => toggleSkill(cat.key, skill)} />
              ))}
              {customSkills.map(skill => (
                <SkillChip key={skill} label={skill} selected
                  onToggle={() => toggleSkill(cat.key, skill)} />
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customInputs[cat.key] || ""}
                onChange={e => setCustomInputs(prev => ({ ...prev, [cat.key]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addCustom(cat.key)}
                placeholder="Add other..."
                style={{ fontSize: 16, border: "2px solid #f0e6e6" }}
                className="flex-1 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A84C]"
              />
              <button type="button" onClick={() => addCustom(cat.key)}
                disabled={!(customInputs[cat.key] || "").trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
                style={{ background: "#7B1C2E" }}
              >
                <Plus size={16} color="#F0D080" />
              </button>
            </div>
          </div>
        );
      })}
      <div>
        <FieldLabel>🏆 Achievements</FieldLabel>
        <textarea value={form.achievements} onChange={e => update("achievements", e.target.value)}
          placeholder="Awards, competitions, certificates..." rows={3}
          style={{ fontSize: 16, border: "2px solid #f0e6e6" }}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none" />
      </div>
      <div>
        <FieldLabel>👤 About</FieldLabel>
        <textarea value={form.aboutMe} onChange={e => update("aboutMe", e.target.value)}
          placeholder="Personality, goals, interests..." rows={3}
          style={{ fontSize: 16, border: "2px solid #f0e6e6" }}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none" />
      </div>
    </div>
  );
}

function TabFinancial({ form, update }) {
  const ns = form.needsScholarship;
  const SUPPORT = [
    { key: "supportFees",       label: "Fees",       icon: "💳" },
    { key: "supportBooks",      label: "Books",      icon: "📚" },
    { key: "supportCoaching",   label: "Coaching",   icon: "🎯" },
    { key: "supportCounseling", label: "Counseling", icon: "🧠" },
  ];

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-2xl p-4"
        style={{ background: "linear-gradient(135deg, #FDF0D0, #FDE8EC)" }}>
        <p className="text-sm font-bold mb-1" style={{ color: "#5A1020" }}>📋 Educational Support</p>
        <p className="text-xs" style={{ color: "#9B6060" }}>Does this student need financial or academic help?</p>
      </div>

      <div>
        <FieldLabel>Need support?</FieldLabel>
        <div className="flex gap-3">
          {[
            { value: true,  label: "Yes, need help", icon: "🙋" },
            { value: false, label: "No, all good",   icon: "✅" },
          ].map(opt => (
            <button key={String(opt.value)} type="button"
              onClick={() => update("needsScholarship", opt.value)}
              className="flex-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all"
              style={ns === opt.value
                ? { borderColor: "#C9A84C", background: "#FDF0D0", color: "#7B5A00" }
                : { borderColor: "#f0e6e6", background: "#fff", color: "#9B6060" }
              }
            >
              <div className="text-xl mb-0.5">{opt.icon}</div>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {ns === true && (
        <div>
          <FieldLabel>What kind of support?</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORT.map(({ key, label, icon }) => {
              const checked = !!form[key];
              return (
                <button key={key} type="button" onClick={() => update(key, !checked)}
                  className="flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all"
                  style={checked
                    ? { borderColor: "#C9A84C", background: "#FDF0D0", color: "#7B5A00" }
                    : { borderColor: "#f0e6e6", background: "#fff", color: "#9B6060" }
                  }
                >
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-semibold">{label}</span>
                  {checked && <Check size={12} className="ml-auto" style={{ color: "#C9A84C" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <FieldLabel>Additional Notes</FieldLabel>
        <textarea value={form.helpRequired} onChange={e => update("helpRequired", e.target.value)}
          placeholder="Any specific help or notes..." rows={3}
          style={{ fontSize: 16, border: "2px solid #f0e6e6" }}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// REVIEW SCREEN
// ─────────────────────────────────────────────
function ReviewScreen({ form, onEdit, onSave, saving, isAdding }) {
  const rows = [
    { label: "Name",       value: form.name },
    { label: "Mobile",     value: form.mobile ? `${form.countryCode || "+91"} ${form.mobile}` : "" },
    { label: "Email",      value: form.email },
    { label: "Gender",     value: form.gender },
    { label: "DOB",        value: (form.dobDay && form.dobMonth && form.dobYear) ? `${form.dobDay}/${form.dobMonth}/${form.dobYear}` : "" },
    { label: "Status",     value: form.married ? "Married" : "Unmarried" },
    { label: "Stays",      value: form.stayAway ? `Away – ${form.stayCity || "?"}` : "At home" },
    { label: "Student",    value: form.isStudent ? "Yes" : "No" },
    { label: "Occupation", value: form.occupation },
    { label: "Education",  value: form.educationType },
    { label: "Grade/Year", value: form.standard || form.year },
    { label: "Degree",     value: form.degree },
    { label: "College",    value: form.collegeName },
    { label: "Support",    value: form.needsScholarship ? "Needs help" : "No support needed" },
  ].filter(r => r.value);

  const allSkills = SKILL_CATEGORIES
    .flatMap(cat => (form[cat.key] || []).map(s => `${cat.emoji} ${s}`));

  return (
    // ✅ FIX 3: flex-1 on scroll area so buttons stay visible
    <div className="flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl" style={{ background: "#FDE8EC" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: "#7B1C2E", color: "#F0D080" }}>
            {(form.name || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: "#5A1020" }}>{form.name || "—"}</p>
            <p className="text-xs" style={{ color: "#9B6060" }}>{form.educationType || form.occupation || "Member"}</p>
          </div>
        </div>

        {rows.map(r => (
          <div key={r.label} className="flex justify-between items-start py-2 border-b"
            style={{ borderColor: "#f0e6e6" }}>
            <span className="text-xs" style={{ color: "#9B6060" }}>{r.label}</span>
            <span className="text-xs font-semibold text-right max-w-[60%]"
              style={{ color: "#3D0010" }}>{r.value}</span>
          </div>
        ))}

        {allSkills.length > 0 && (
          <div className="py-2">
            <p className="text-xs mb-2" style={{ color: "#9B6060" }}>Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {allSkills.map(s => (
                <span key={s} className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "#FDE8EC", color: "#7B1C2E" }}>{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 px-4 pt-3 border-t"
        style={{
          borderColor: "#f0e6e6",
          paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        }}>
        <button onClick={onEdit}
          className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2"
          style={{ borderColor: "#f0e6e6", color: "#7B1C2E" }}>
          ← Edit
        </button>
        <button onClick={onSave} disabled={saving}
          className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
          style={{ background: "#7B1C2E" }}>
          {saving ? "Saving..." : isAdding ? "Add Member ✓" : "Save ✓"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────
export default function EditMemberModal({ open, mode = "edit", member = null, familyId, onClose }) {
  const isAdding = mode === "add";
  const draftKey = isAdding ? `memberDraft_new_${familyId}` : `memberDraft_${member?.id}`;

  const [form, setForm]             = useState(null);
  const [activeTab, setActiveTab]   = useState("basic");
  const [showReview, setShowReview] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState({});

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const draft = await loadCache(draftKey);
      if (draft && Object.keys(draft).length > 0) { setForm(draft); return; }
      if (isAdding) {
        setForm({ ...EMPTY_FORM });
      } else {
        if (!member) return;
        // Split stored mobile back into countryCode + number
        let countryCode = "+91";
        let mobileNum   = member.mobile || member.phone || "";
        if (mobileNum.startsWith("+")) {
          const match = COUNTRY_CODES.find(c => mobileNum.startsWith(c.code));
          if (match) { countryCode = match.code; mobileNum = mobileNum.slice(match.code.length); }
        }

        // Split stored dob "DD/MM/YYYY" back into parts
        const dobParts  = (member.dob || "").split("/");
        const dobDay    = dobParts[0] || "";
        const dobMonth  = dobParts[1] || "";
        const dobYear   = dobParts[2] || "";

        setForm({
          ...EMPTY_FORM,
          name:           member.name          || "",
          countryCode,
          mobile:         mobileNum,
          email:          member.email         || "",
          gender:         member.gender        || "",
          dobDay, dobMonth, dobYear,
          married:        member.married       || false,
          stayAway:       member.stayAway      || false,
          stayCity:       member.stayCity      || "",
          isStudent: member.isStudent || false, occupation: member.occupation || "",
          educationType: member.educationType || "", standard: member.standard || "",
          stream: member.stream || "", medium: member.medium || "",
          year: member.year || "", degree: member.degree || "",
          specialization: member.specialization || "", collegeName: member.collegeName || "",
          courseName: member.courseName || "", courseStage: member.courseStage || "",
          exam: member.exam || "",
          indoorSports: member.indoorSports || [], outdoorSports: member.outdoorSports || [],
          talents: member.talents || [], creative: member.creative || [],
          hobbies: member.hobbies || [], funActivities: member.funActivities || [],
          achievements: member.achievements || "", aboutMe: member.aboutMe || "",
          needsScholarship: member.needsScholarship ?? false, // ✅ FIX 2
          supportFees: member.supportFees || false, supportBooks: member.supportBooks || false,
          supportCoaching: member.supportCoaching || false, supportCounseling: member.supportCounseling || false,
          helpRequired: member.helpRequired || "",
        });
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdding, member?.id]);

  useEffect(() => {
    if (!open) { setForm(null); setActiveTab("basic"); setShowReview(false); setErrors({}); }
  }, [open]);

  useEffect(() => {
    if (!form || !open) return;
    const t = setTimeout(() => saveCache(draftKey, form), 600);
    return () => clearTimeout(t);
  }, [form, draftKey, open]);

  const updateField = useCallback((field, value) =>
    setForm(prev => ({ ...prev, [field]: value })), []);

  const validate = () => {
    const errs = {};
    if (!form?.name?.trim()) errs.name = "Name is required";
    if (form?.mobile) {
      const digits = form.mobile.replace(/\D/g, "");
      if (digits.length < 7) errs.mobile = "Enter a valid mobile number";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) { setActiveTab("basic"); return false; }
    return true;
  };

  const handleGoToReview = () => { if (validate()) setShowReview(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      // ── Assemble mobile: countryCode + number
      const assembledMobile = form.mobile?.trim()
        ? normalizeMobile(`${form.countryCode || "+91"}${form.mobile.trim()}`)
        : "";

      // ── Assemble DOB: DD/MM/YYYY
      const assembledDob = (form.dobDay && form.dobMonth && form.dobYear)
        ? `${form.dobDay}/${form.dobMonth}/${form.dobYear}`
        : "";

      // ── Name: proper case
      const assembledName = form.name?.trim()
        ? form.name.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
        : "";

      let education = "";
      if (form.isStudent) {
        if (form.educationType === "School Student")       education = form.standard;
        else if (form.educationType === "College Student") education = `${form.degree || ""} ${form.year || ""}`.trim();
        else if (form.educationType === "Postgraduate")    education = `PG ${form.year || ""}`.trim();
        else if (form.educationType === "Diploma / ITI")  education = `Diploma ${form.year || ""}`.trim();
        else if (form.educationType === "Professional Course") education = `${form.courseName || ""} ${form.courseStage || ""}`.trim();
        else if (form.educationType === "Competitive Prep")    education = form.exam;
      }

      const payload = {
        ...form,
        name:   assembledName,
        mobile: assembledMobile,
        dob:    assembledDob,
        education,
      };
      // Remove UI-only split fields from DB payload
      delete payload.countryCode;
      delete payload.dobDay;
      delete payload.dobMonth;
      delete payload.dobYear;

      if (isAdding) {
        const newMemberRef = push(ref(db, "members"));
        const memberId = newMemberRef.key;
        const ts = Date.now();
        const writes = {};
        writes[`members/${memberId}`] = { ...payload, familyId, createdAt: ts };
        writes[`families/${familyId}/members/${memberId}`] = true;
        if (payload.mobile?.trim()) {
          const mobile = normalizeMobile(payload.mobile); // ✅ FIX 1
          if (mobile) {
            writes[`mobileIndex/${mobile}/memberIds/${memberId}`] = true;
            writes[`mobileIndex/${mobile}/familyIds/${familyId}`] = true;
            writes[`mobileIndex/${mobile}/sources/manualAdd`] = true;
            writes[`mobileIndex/${mobile}/createdAt`] = ts;
          }
        }
        await update(ref(db), writes);
        await saveCache(draftKey, {});
        onClose(true, { id: memberId, familyId, ...payload });
      } else {
        await update(ref(db, `members/${member.id}`), { ...payload, updatedAt: Date.now() });
        await saveCache(draftKey, {});
        onClose(true, { ...member, ...payload });
      }
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !form) return null;

  const tabContent = {
    basic:     <TabBasic     form={form} update={updateField} errors={errors} />,
    education: <TabEducation form={form} update={updateField} />,
    skills:    <TabSkills    form={form} update={updateField} />,
    financial: <TabFinancial form={form} update={updateField} />,
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={() => onClose(false)} />

      <div className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-3xl overflow-hidden"
        style={{
          background: "#FDF6EC",
          maxHeight: "85vh",
          boxShadow: "0 -8px 40px rgba(90,16,32,0.25)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "#C9A84C" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
          <h2 className="text-base font-bold" style={{ color: "#5A1020" }}>
            {showReview ? "Review Details" : isAdding ? "Add Member" : "Edit Member"}
          </h2>
          <button onClick={() => onClose(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#FDE8EC" }}>
            <X size={16} style={{ color: "#7B1C2E" }} />
          </button>
        </div>

        {/* Tab bar */}
        {!showReview && (
          <div className="flex border-b flex-shrink-0 px-2" style={{ borderColor: "#f0e6e6" }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-all relative"
                  style={{ color: active ? "#7B1C2E" : "#C0A0A0" }}
                >
                  <Icon size={16} />
                  {tab.label}
                  {active && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      style={{ background: "#C9A84C" }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
          {showReview
            ? <ReviewScreen form={form} onEdit={() => setShowReview(false)}
                onSave={handleSave} saving={saving} isAdding={isAdding} />
            : (
              <>
                {tabContent[activeTab]}
                <div className="flex gap-3 px-4 pt-2 mt-2 border-t"
                  style={{
                    borderColor: "#f0e6e6",
                    paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
                  }}
                >
                  <button onClick={() => onClose(false)}
                    className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2"
                    style={{ borderColor: "#f0e6e6", color: "#7B1C2E" }}>
                    Cancel
                  </button>
                  <button onClick={handleGoToReview}
                    className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: "#7B1C2E" }}>
                    Review →
                  </button>
                </div>
              </>
            )
          }
        </div>
      </div>
    </>
  );
}