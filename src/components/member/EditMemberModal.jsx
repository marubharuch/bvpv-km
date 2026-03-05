// components/member/EditMemberModal.jsx
// All tab content reads from constants/app.js — no duplication.

import { useState, useRef, useEffect } from "react";
import { User, GraduationCap, Star, IndianRupee, Award, ChevronRight, Check, X, Plus } from "lucide-react";
import { useMemberForm }   from "../../hooks/useMemberForm";
import { COLORS, SKILL_CATEGORIES, HONORARY_ORGS, POST_SUGGESTIONS,
         EDUCATION_TYPES, SCHOOL_STANDARDS, COLLEGE_YEARS, PG_YEARS,
         DIPLOMA_YEARS, DEGREE_PROGRAMS, PROFESSIONAL_COURSES,
         PROFESSIONAL_STAGES, STREAM_STANDARDS } from "../../constants/app";

const TABS = [
  { id: "basic",     label: "Basic",   Icon: User },
  { id: "education", label: "Study",   Icon: GraduationCap },
  { id: "skills",    label: "Skills",  Icon: Star },
  { id: "financial", label: "Support", Icon: IndianRupee },
  { id: "honorary",  label: "હોદ્દો",   Icon: Award },
];

// ── Shared field primitives ────────────────────────────────────────
const FieldLabel = ({ children }) => (
  <p className="text-xs font-semibold mb-1.5" style={{ color: COLORS.primary }}>{children}</p>
);

function TextInput({ label, value, onChange, placeholder, type = "text", inputMode, maxLength, error }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input type={type} inputMode={inputMode} maxLength={maxLength} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ fontSize: 16, border: `2px solid ${error ? COLORS.error : COLORS.border}`, background: "#fff", color: COLORS.textPrimary }}
        className="w-full rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors" />
      {error && <p className="text-xs mt-1" style={{ color: COLORS.error }}>{error}</p>}
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
          const on  = value === val;
          return (
            <button key={val} type="button" onClick={() => onChange(val)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
              style={on ? { background: COLORS.primary, color: COLORS.goldLight, borderColor: COLORS.primary }
                        : { background: "#fff", color: COLORS.primary, borderColor: COLORS.border }}>
              {lbl}
            </button>
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
      style={{ borderColor: value ? COLORS.gold : COLORS.border, background: value ? COLORS.goldFaint : "#fff" }}>
      <span className="text-sm font-semibold" style={{ color: value ? "#7B5A00" : COLORS.textSecondary }}>
        {value ? labelOn : labelOff}
      </span>
      <div className="w-12 h-6 rounded-full relative transition-colors" style={{ background: value ? COLORS.gold : "#e5e7eb" }}>
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
          style={{ fontSize: 16, border: `2px solid ${COLORS.border}`, background: "#fff",
                   color: value ? COLORS.textPrimary : COLORS.textSecondary,
                   appearance: "none", WebkitAppearance: "none" }}
          className="w-full rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors pr-10">
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none"
          style={{ color: COLORS.textSecondary }} />
      </div>
    </div>
  );
}

function SkillChip({ label, selected, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all"
      style={selected ? { borderColor: COLORS.primary, background: "#FDE8EC", color: COLORS.primary }
                      : { borderColor: COLORS.border,  background: "#fff",    color: COLORS.textSecondary }}>
      {selected && <Check size={11} strokeWidth={3} />}
      {label}
    </button>
  );
}

// ── Tab: Basic ─────────────────────────────────────────────────────
function TabBasic({ form, update, errors }) {
  const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const MONTHS = [
    {v:"01",l:"Jan"},{v:"02",l:"Feb"},{v:"03",l:"Mar"},{v:"04",l:"Apr"},{v:"05",l:"May"},{v:"06",l:"Jun"},
    {v:"07",l:"Jul"},{v:"08",l:"Aug"},{v:"09",l:"Sep"},{v:"10",l:"Oct"},{v:"11",l:"Nov"},{v:"12",l:"Dec"},
  ];

  const age = (() => {
    const { dobDay: d, dobMonth: m, dobYear: y } = form;
    if (!d || !m || !y || String(y).length < 4) return null;
    const dt = new Date(`${y}-${m}-${d}`);
    return isNaN(dt) ? null : Math.floor((Date.now() - dt) / (365.25 * 24 * 60 * 60 * 1000));
  })();

  const MARITAL_OPTIONS = [
    { value: "Single",   en: "Unmarried", gu: "અપરિણીત"    },
    { value: "Engaged",  en: "Engaged",   gu: "સગાઈ થઈ"    },
    { value: "Married",  en: "Married",   gu: "પરણેલા"      },
    { value: "Divorced", en: "Divorced",  gu: "છૂટાછેડા"    },
    { value: "Widowed",  en: "Widowed",   gu: "વિધવા/વિધુર" },
  ];

  return (
    <div className="space-y-4 px-4 py-4">
      <TextInput label="Full Name *" value={form.name} onChange={v => update("name", v)}
        placeholder="e.g. Ramesh Patel" error={errors.name} />

      <div>
        <FieldLabel>Mobile Number</FieldLabel>
        <div className="flex gap-2">
          <input type="tel" inputMode="numeric" value={form.countryCode || "+91"}
            onChange={e => { let v = e.target.value; if (!v.startsWith("+")) v = "+" + v.replace(/\+/g, ""); update("countryCode", v); }}
            maxLength={5}
            style={{ fontSize: 14, border: `2px solid ${COLORS.border}`, background: "#fff", color: COLORS.textPrimary, minWidth: 70, textAlign: "center" }}
            className="rounded-xl px-2 py-3 outline-none focus:border-[#C9A84C] transition-colors" />
          <input type="tel" inputMode="numeric" value={form.mobile}
            onChange={e => update("mobile", e.target.value.replace(/\D/g, ""))}
            placeholder="Mobile number" maxLength={15}
            style={{ fontSize: 16, border: `2px solid ${errors.mobile ? COLORS.error : COLORS.border}`, background: "#fff", color: COLORS.textPrimary }}
            className="flex-1 rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors" />
        </div>
        {errors.mobile && <p className="text-xs mt-1" style={{ color: COLORS.error }}>{errors.mobile}</p>}
      </div>

      <TextInput label="Email" value={form.email} onChange={v => update("email", v)} placeholder="email@example.com" type="email" />
      <PillSelect label="Gender" value={form.gender} onChange={v => update("gender", v)} options={["Male","Female"]} />

      <div>
        <FieldLabel>Date of Birth</FieldLabel>
        <div className="flex gap-3">
          <div className="relative w-24">
            <select value={form.dobDay || ""} onChange={e => update("dobDay", e.target.value)}
              className="w-full h-14 rounded-2xl px-4 pr-9 text-base outline-none border-2 border-[#f0e6e6] focus:border-[#C9A84C] appearance-none bg-white"
              style={{ color: form.dobDay ? COLORS.textPrimary : COLORS.textSecondary }}>
              <option value="">Day</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" style={{ color: COLORS.textSecondary }} />
          </div>
          <div className="relative flex-1">
            <select value={form.dobMonth || ""} onChange={e => update("dobMonth", e.target.value)}
              className="w-full h-14 rounded-2xl px-4 pr-9 text-base outline-none border-2 border-[#f0e6e6] focus:border-[#C9A84C] appearance-none bg-white"
              style={{ color: form.dobMonth ? COLORS.textPrimary : COLORS.textSecondary }}>
              <option value="">Month</option>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" style={{ color: COLORS.textSecondary }} />
          </div>
          <input type="tel" inputMode="numeric" value={form.dobYear || ""}
            onChange={e => update("dobYear", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Year" className="w-28 h-14 rounded-2xl px-4 text-base outline-none border-2 border-[#f0e6e6] focus:border-[#C9A84C]"
            style={{ color: COLORS.textPrimary }} />
        </div>
      </div>

      {(age === null || age >= 20) && (
        <div>
          <FieldLabel>Marital Status / વૈવાહિક સ્થિતિ</FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            {MARITAL_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => update("maritalStatus", opt.value)}
                className="py-4 rounded-2xl text-sm font-semibold border-2 transition-all"
                style={form.maritalStatus === opt.value
                  ? { background: COLORS.primary, borderColor: COLORS.primary, color: COLORS.goldLight }
                  : { background: "#fff", borderColor: COLORS.border, color: COLORS.textSecondary }}>
                <div>{opt.en}</div><div className="text-xs opacity-75">{opt.gu}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <BigToggle value={form.stayAway} onChange={() => update("stayAway", !form.stayAway)}
        labelOn="Stays away from home" labelOff="Stays at home" />
      {form.stayAway && (
        <TextInput label="Which city?" value={form.stayCity} onChange={v => update("stayCity", v)} placeholder="e.g. Ahmedabad, Surat" />
      )}
    </div>
  );
}

// ── Tab: Education ─────────────────────────────────────────────────
function TabEducation({ form, update }) {
  const isStudent     = form.isStudent;
  const isSchool      = form.educationType === "School Student";
  const isCollege     = form.educationType === "College Student";
  const isPG          = form.educationType === "Postgraduate";
  const isDiploma     = form.educationType === "Diploma / ITI";
  const isProfessional= form.educationType === "Professional Course";
  const isCompetitive = form.educationType === "Competitive Prep";
  const needsStream   = isSchool && STREAM_STANDARDS.includes(form.standard);

  const clearEducation = () =>
    ["educationType","standard","stream","medium","year","degree","specialization","collegeName","courseName","courseStage","exam"]
      .forEach(f => update(f, ""));

  return (
    <div className="space-y-4 px-4 py-4">
      <BigToggle value={isStudent} onChange={() => { update("isStudent", !isStudent); if (isStudent) clearEducation(); }}
        labelOn="🎓 Is a Student" labelOff="Not a student" />

      {!isStudent && (
        <TextInput label="Occupation" value={form.occupation} onChange={v => update("occupation", v)}
          placeholder="e.g. Engineer, Teacher, Business" />
      )}

      {isStudent && (
        <>
          <NativeSelect label="Education Level" value={form.educationType}
            onChange={v => { update("educationType", v); clearEducation(); update("educationType", v); }}
            options={EDUCATION_TYPES} />
          {isSchool && (
            <>
              <NativeSelect label="Class / Grade" value={form.standard} onChange={v => update("standard", v)} options={SCHOOL_STANDARDS} />
              {needsStream && <PillSelect label="Stream" value={form.stream} onChange={v => update("stream", v)} options={["Science","Commerce","Arts"]} />}
              <PillSelect label="Medium" value={form.medium} onChange={v => update("medium", v)} options={["English","Gujarati","Hindi"]} />
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

// ── Tab: Skills ────────────────────────────────────────────────────
function TabSkills({ form, update }) {
  const [custom, setCustom] = useState({});

  const toggle = (key, skill) => {
    const arr = form[key] || [];
    update(key, arr.includes(skill) ? arr.filter(s => s !== skill) : [...arr, skill]);
  };
  const addCustom = key => {
    const v = (custom[key] || "").trim();
    if (!v) return;
    toggle(key, v);
    setCustom(p => ({ ...p, [key]: "" }));
  };

  return (
    <div className="space-y-5 px-4 py-4">
      {SKILL_CATEGORIES.map(cat => {
        const selected = form[cat.key] || [];
        const extras   = selected.filter(s => !cat.options.includes(s));
        return (
          <div key={cat.key}>
            <FieldLabel>{cat.emoji} {cat.label}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {cat.options.map(s => (
                <SkillChip key={s} label={s} selected={selected.includes(s)} onToggle={() => toggle(cat.key, s)} />
              ))}
              {extras.map(s => (
                <SkillChip key={s} label={s} selected onToggle={() => toggle(cat.key, s)} />
              ))}
            </div>
            <div className="flex gap-2">
              <input value={custom[cat.key] || ""} onChange={e => setCustom(p => ({ ...p, [cat.key]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addCustom(cat.key)}
                placeholder="Add other..." style={{ fontSize: 16, border: `2px solid ${COLORS.border}` }}
                className="flex-1 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A84C]" />
              <button type="button" onClick={() => addCustom(cat.key)} disabled={!(custom[cat.key] || "").trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
                style={{ background: COLORS.primary }}>
                <Plus size={16} color={COLORS.goldLight} />
              </button>
            </div>
          </div>
        );
      })}
      <div>
        <FieldLabel>🏆 Achievements</FieldLabel>
        <textarea value={form.achievements} onChange={e => update("achievements", e.target.value)}
          placeholder="Awards, competitions..." rows={3}
          style={{ fontSize: 16, border: `2px solid ${COLORS.border}` }}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none" />
      </div>
      <div>
        <FieldLabel>👤 About Me</FieldLabel>
        <textarea value={form.aboutMe} onChange={e => update("aboutMe", e.target.value)}
          placeholder="Personality, goals..." rows={3}
          style={{ fontSize: 16, border: `2px solid ${COLORS.border}` }}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none" />
      </div>
    </div>
  );
}

// ── Tab: Financial Support ─────────────────────────────────────────
function TabFinancial({ form, update }) {
  if (!form.isStudent) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-4xl">🎓</span>
      <p className="text-sm font-medium" style={{ color: COLORS.textSecondary }}>Enable "Is a Student" in Study tab first</p>
    </div>
  );

  const ns      = form.needsScholarship;
  const SUPPORT = [
    { key: "supportFees",       label: "Fees",       icon: "💳" },
    { key: "supportBooks",      label: "Books",      icon: "📚" },
    { key: "supportCoaching",   label: "Coaching",   icon: "🎯" },
    { key: "supportCounseling", label: "Counseling", icon: "🧠" },
  ];

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg,#FDF0D0,#FDE8EC)" }}>
        <p className="text-sm font-bold mb-1" style={{ color: COLORS.primaryDark }}>📋 Educational Support</p>
        <p className="text-xs" style={{ color: COLORS.textSecondary }}>Does this student need financial or academic help?</p>
      </div>
      <div>
        <FieldLabel>Need support?</FieldLabel>
        <div className="flex gap-3">
          {[{ value: true, label: "Yes, need help", icon: "🙋" },{ value: false, label: "No, all good", icon: "✅" }].map(opt => (
            <button key={String(opt.value)} type="button" onClick={() => update("needsScholarship", opt.value)}
              className="flex-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all"
              style={ns === opt.value
                ? { borderColor: COLORS.gold, background: COLORS.goldFaint, color: "#7B5A00" }
                : { borderColor: COLORS.border, background: "#fff", color: COLORS.textSecondary }}>
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
            {SUPPORT.map(({ key, label, icon }) => (
              <button key={key} type="button" onClick={() => update(key, !form[key])}
                className="flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all"
                style={form[key]
                  ? { borderColor: COLORS.gold, background: COLORS.goldFaint, color: "#7B5A00" }
                  : { borderColor: COLORS.border, background: "#fff", color: COLORS.textSecondary }}>
                <span className="text-lg">{icon}</span>
                <span className="text-xs font-semibold">{label}</span>
                {form[key] && <Check size={12} className="ml-auto" style={{ color: COLORS.gold }} />}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <FieldLabel>Additional Notes</FieldLabel>
        <textarea value={form.helpRequired} onChange={e => update("helpRequired", e.target.value)}
          placeholder="Any specific help..." rows={3}
          style={{ fontSize: 16, border: `2px solid ${COLORS.border}` }}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none" />
      </div>
    </div>
  );
}

// ── Tab: Honorary ──────────────────────────────────────────────────
function TabHonorary({ form, update }) {
  const orgs      = form.honoraryOrgs || [];
  const hasOrg    = id  => orgs.some(o => o.orgId === id);
  const toggleOrg = id  => hasOrg(id)
    ? update("honoraryOrgs", orgs.filter(o => o.orgId !== id))
    : update("honoraryOrgs", [...orgs, { orgId: id, post: "", name: "" }]);
  const setField  = (id, field, val) =>
    update("honoraryOrgs", orgs.map(o => o.orgId === id ? { ...o, [field]: val } : o));
  const getOrg    = id  => orgs.find(o => o.orgId === id);

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg,#FDF0D0,#FDE8EC)" }}>
        <p className="text-sm font-bold mb-1" style={{ color: COLORS.primaryDark }}>🏅 સામાજિક હોદ્દો</p>
        <p className="text-xs" style={{ color: COLORS.textSecondary }}>આ સભ્ય કઈ સંસ્થામાં કોઈ હોદ્દો ધરાવે છે?</p>
      </div>
      <div className="space-y-3">
        {HONORARY_ORGS.map(org => {
          const selected = hasOrg(org.id);
          const entry    = getOrg(org.id);
          return (
            <div key={org.id}>
              <button type="button" onClick={() => toggleOrg(org.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
                style={selected
                  ? { background: "#FDE8EC", borderColor: COLORS.primary }
                  : { background: "#fff",    borderColor: COLORS.border }}>
                <span className="text-sm font-semibold" style={{ color: selected ? COLORS.primary : COLORS.textSecondary }}>
                  {org.label}
                </span>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={selected ? { background: COLORS.primary, borderColor: COLORS.primary } : { background: "#fff", borderColor: "#ccc" }}>
                  {selected && <Check size={11} color={COLORS.goldLight} strokeWidth={3} />}
                </div>
              </button>
              {selected && entry && (
                <div className="mt-2 ml-3 space-y-2 pl-3 border-l-2" style={{ borderColor: COLORS.gold }}>
                  {org.askName && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: COLORS.primary }}>સંસ્થાનું નામ</p>
                      <input type="text" value={entry.name || ""} onChange={e => setField(org.id, "name", e.target.value)}
                        placeholder="સંસ્થાનું નામ..."
                        style={{ fontSize: 16, border: `2px solid ${COLORS.border}`, background: "#fff", color: COLORS.textPrimary }}
                        className="w-full rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C]" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: COLORS.primary }}>હોદ્દો / Post</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {POST_SUGGESTIONS.map(p => (
                        <button key={p} type="button" onClick={() => setField(org.id, "post", entry.post === p ? "" : p)}
                          className="px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all"
                          style={entry.post === p
                            ? { background: COLORS.primary, borderColor: COLORS.primary, color: COLORS.goldLight }
                            : { background: "#fff", borderColor: COLORS.border, color: COLORS.primary }}>
                          {p}
                        </button>
                      ))}
                    </div>
                    {(!entry.post || !POST_SUGGESTIONS.includes(entry.post)) && (
                      <input type="text" value={POST_SUGGESTIONS.includes(entry.post) ? "" : (entry.post || "")}
                        onChange={e => setField(org.id, "post", e.target.value)}
                        placeholder="અથવા હોદ્દો લખો..."
                        style={{ fontSize: 16, border: `2px solid ${COLORS.border}`, background: "#fff", color: COLORS.textPrimary }}
                        className="w-full rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C]" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Review screen ──────────────────────────────────────────────────
function ReviewScreen({ form, onEdit, onSave, saving, isAdding }) {
  const rows = [
    { label: "Name",       value: form.name },
    { label: "Mobile",     value: form.mobile ? `${form.countryCode || "+91"} ${form.mobile}` : "" },
    { label: "Email",      value: form.email },
    { label: "Gender",     value: form.gender },
    { label: "DOB",        value: (form.dobDay && form.dobMonth && form.dobYear) ? `${form.dobDay}/${form.dobMonth}/${form.dobYear}` : "" },
    { label: "Status",     value: form.maritalStatus },
    { label: "Student",    value: form.isStudent ? "Yes" : "No" },
    { label: "Occupation", value: form.occupation },
    { label: "Education",  value: form.educationType },
    { label: "Support",    value: form.needsScholarship ? "Needs help" : "" },
  ].filter(r => r.value);

  const allSkills = SKILL_CATEGORIES.flatMap(cat => (form[cat.key] || []).map(s => `${cat.emoji} ${s}`));

  return (
    <div className="flex flex-col" style={{ minHeight: 0 }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl" style={{ background: "#FDE8EC" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: COLORS.primary, color: COLORS.goldLight }}>
            {(form.name || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: COLORS.primaryDark }}>{form.name || "—"}</p>
            <p className="text-xs" style={{ color: COLORS.textSecondary }}>{form.educationType || form.occupation || "Member"}</p>
          </div>
        </div>
        {rows.map(r => (
          <div key={r.label} className="flex justify-between items-start py-2 border-b" style={{ borderColor: COLORS.border }}>
            <span className="text-xs" style={{ color: COLORS.textSecondary }}>{r.label}</span>
            <span className="text-xs font-semibold text-right max-w-[60%]" style={{ color: COLORS.textPrimary }}>{r.value}</span>
          </div>
        ))}
        {allSkills.length > 0 && (
          <div className="py-2">
            <p className="text-xs mb-2" style={{ color: COLORS.textSecondary }}>Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {allSkills.map(s => (
                <span key={s} className="text-xs px-2 py-1 rounded-full" style={{ background: "#FDE8EC", color: COLORS.primary }}>{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3 px-4 pt-3 pb-6 border-t" style={{ borderColor: COLORS.border }}>
        <button onClick={onEdit} className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2"
          style={{ borderColor: COLORS.border, color: COLORS.primary }}>← Edit</button>
        <button onClick={onSave} disabled={saving}
          className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
          style={{ background: COLORS.primary }}>
          {saving ? "Saving..." : isAdding ? "Add Member ✓" : "Save ✓"}
        </button>
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────
export default function EditMemberModal({ open, mode = "edit", member = null, familyId, onClose }) {
  const { form, errors, saving, update, validate, handleSave, isAdding } =
    useMemberForm({ open, mode, member, familyId, onClose });

  const [activeTab,  setActiveTab]  = useState("basic");
  const [showReview, setShowReview] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [activeTab]);
  useEffect(() => { if (!open) { setActiveTab("basic"); setShowReview(false); } }, [open]);

  if (!open || !form) return null;

  const tabIds    = TABS.map(t => t.id);
  const tabIdx    = tabIds.indexOf(activeTab);
  const isFirst   = tabIdx === 0;
  const isLast    = tabIdx === tabIds.length - 1;

  const goNext = () => isLast ? (validate() && setShowReview(true)) : setActiveTab(tabIds[tabIdx + 1]);
  const goBack = () => showReview ? setShowReview(false) : !isFirst && setActiveTab(tabIds[tabIdx - 1]);

  const content = {
    basic:     <TabBasic     form={form} update={update} errors={errors} />,
    education: <TabEducation form={form} update={update} />,
    skills:    <TabSkills    form={form} update={update} />,
    financial: <TabFinancial form={form} update={update} />,
    honorary:  <TabHonorary  form={form} update={update} />,
  };

  return (
    <>
      <div className="fixed inset-0 z-[199]" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => onClose(false)} />
      <div className="fixed left-0 right-0 top-0 z-[200] flex flex-col rounded-b-3xl"
        style={{ background: COLORS.bg, maxHeight: "92vh", boxShadow: "0 8px 40px rgba(90,16,32,0.25)", overflow: "hidden", paddingTop: "env(safe-area-inset-top,0px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <h2 className="text-base font-bold" style={{ color: COLORS.primaryDark }}>
            {showReview ? "Review Details" : isAdding ? "Add Member" : "Edit Member"}
          </h2>
          <button onClick={() => onClose(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#FDE8EC" }}>
            <X size={16} style={{ color: COLORS.primary }} />
          </button>
        </div>

        {/* Tab bar */}
        {!showReview && (
          <div className="flex flex-shrink-0 px-2" style={{ borderBottom: `2px solid ${COLORS.border}`, background: COLORS.bg }}>
            {TABS.map((tab, idx) => {
              const active = activeTab === tab.id;
              const done   = idx < tabIdx;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-all relative"
                  style={{ color: active ? COLORS.primary : done ? COLORS.gold : COLORS.textMuted }}>
                  <div className="relative">
                    <tab.Icon size={16} />
                    {done && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: COLORS.gold }}>
                        <Check size={8} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  {tab.label}
                  {active && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: COLORS.gold }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
          {showReview
            ? <ReviewScreen form={form} onEdit={() => setShowReview(false)} onSave={handleSave} saving={saving} isAdding={isAdding} />
            : content[activeTab]}
        </div>

        {/* Bottom nav */}
        {!showReview && (
          <div className="flex gap-3 px-4 py-3 flex-shrink-0"
            style={{ borderTop: `1px solid ${COLORS.border}`, paddingBottom: "calc(12px + env(safe-area-inset-bottom,0px))" }}>
            {!isFirst && (
              <button onClick={goBack} className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2"
                style={{ borderColor: COLORS.border, color: COLORS.primary }}>← Back</button>
            )}
            <button onClick={goNext} className="py-3.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: COLORS.primary, flex: 1 }}>
              {isLast ? "Review →" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
