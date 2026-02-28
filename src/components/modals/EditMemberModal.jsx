import { useState, useEffect, useCallback, useRef } from "react";
import { ref, push } from "firebase/database";
import { db } from "../../firebase";
import { batchWrite } from "../../services/rtdbService";
import { saveCache, loadCache } from "../../utils/cache";
import {
  User, GraduationCap, Star, IndianRupee, Award,
  ChevronRight, Check, X, Plus
} from "lucide-react";

const EMPTY_FORM = {
  name: "", countryCode: "+91", mobile: "", email: "", gender: "",
  dobDay: "", dobMonth: "", dobYear: "",
  maritalStatus: "", remarriage: "", stayAway: false, stayCity: "",
  isStudent: false, occupation: "",
  educationType: "", standard: "", stream: "", medium: "",
  year: "", degree: "", specialization: "", collegeName: "",
  courseName: "", courseStage: "", exam: "",
  indoorSports: [], outdoorSports: [], talents: [],
  creative: [], hobbies: [], funActivities: [],
  achievements: "", aboutMe: "",
  needsScholarship: false,
  supportFees: false, supportBooks: false,
  supportCoaching: false, supportCounseling: false,
  helpRequired: "",
  honoraryOrgs: [],
};

const TABS = [
  { id: "basic",     label: "Basic",   icon: User },
  { id: "education", label: "Study",   icon: GraduationCap },
  { id: "skills",    label: "Skills",  icon: Star },
  { id: "financial", label: "Support", icon: IndianRupee },
  { id: "honorary",  label: "હોદ્દો",   icon: Award },
];

const TAB_IDS = TABS.map(t => t.id);
const LAST_TAB = TAB_IDS[TAB_IDS.length - 1];

const EDUCATION_TYPES = ["School Student","College Student","Postgraduate","Diploma / ITI","Professional Course","Competitive Prep"];
const SCHOOL_STANDARDS = ["Nursery","Jr KG","Sr KG","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
const COLLEGE_YEARS    = ["1st Year","2nd Year","3rd Year","Final Year"];
const PG_YEARS         = ["PG Year 1","PG Final Year"];
const DIPLOMA_YEARS    = ["Year 1","Year 2","Year 3"];
const DEGREE_PROGRAMS  = ["BSc","BCom","BA","BBA","BE/BTech","MBBS","BDS","BPharma","Law","Other"];
const PROFESSIONAL_COURSES = ["CA","CS","CMA","CFA","Other"];
const PROFESSIONAL_STAGES  = ["Foundation","Inter","Final"];
const NEEDS_STREAM     = ["11th","12th"];

const COUNTRY_CODES = [
  { code: "+91",  flag: "🇮🇳" }, { code: "+1",   flag: "🇺🇸" },
  { code: "+44",  flag: "🇬🇧" }, { code: "+61",  flag: "🇦🇺" },
  { code: "+971", flag: "🇦🇪" }, { code: "+974", flag: "🇶🇦" },
  { code: "+965", flag: "🇰🇼" }, { code: "+968", flag: "🇴🇲" },
  { code: "+60",  flag: "🇲🇾" }, { code: "+65",  flag: "🇸🇬" },
  { code: "+49",  flag: "🇩🇪" }, { code: "+81",  flag: "🇯🇵" },
];

const SKILL_CATEGORIES = [
  { key: "indoorSports",  label: "Indoor Sports",  emoji: "🏓", options: ["Chess","Carrom","TT","Badminton (Indoor)","Snooker"] },
  { key: "outdoorSports", label: "Outdoor Sports", emoji: "🏏", options: ["Cricket","Badminton","Football","Kabaddi","Athletics"] },
  { key: "talents",       label: "Talents",        emoji: "🎤", options: ["Singing","Dancing","Anchoring","Acting","Public Speaking"] },
  { key: "creative",      label: "Creative",       emoji: "🎨", options: ["Reel Making","Content Writing","Photography","Drawing","Craft"] },
  { key: "hobbies",       label: "Hobbies",        emoji: "📖", options: ["Trekking","Reading","Gardening","Cooking","Travel"] },
  { key: "funActivities", label: "Fun",            emoji: "🎉", options: ["Antakshari","Quiz","One Minute Games","Dumb Charades"] },
];

const ALL_ORG_IDS = ["kadavani","seva","suraksha","sthanik","other"];

const KNOWN_ORGS = [
  { id: "kadavani",  label: "કેળવણી મંડળ",    askName: false },
  { id: "seva",      label: "સેવા સમાજ",       askName: false },
  { id: "suraksha",  label: "સુરક્ષા ટ્રસ્ટ",  askName: false },
  { id: "sthanik",   label: "સ્થાનિક સમાજ",    askName: true  },
  { id: "other",     label: "અન્ય સંસ્થા",      askName: true  },
];

const POST_SUGGESTIONS = ["પ્રમુખ","ઉપ-પ્રમુખ","મંત્રી","સહ-મંત્રી","ખજાનચી","ટ્રસ્ટી","કારોબારી સભ્ય","સંયોજક"];

function normalizeMobile(mobile) {
  if (!mobile) return "";
  const cleaned = String(mobile).trim();
  if (cleaned.startsWith("+")) return cleaned.replace(/[\s\-\(\)]/g, "");
  return cleaned.replace(/\D/g, "").slice(-10);
}

// ── UI PIECES ──
function FieldLabel({ children }) {
  return <p className="text-xs font-semibold mb-1.5" style={{ color: "#7B1C2E" }}>{children}</p>;
}
function TextInput({ label, value, onChange, placeholder, type="text", inputMode, maxLength, error }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input type={type} inputMode={inputMode} maxLength={maxLength} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ fontSize:16, border: error ? "2px solid #ef4444" : "2px solid #f0e6e6", background:"#fff", color:"#3D0010" }}
        className="w-full rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors" />
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
          const val = typeof opt==="object" ? opt.value : opt;
          const lbl = typeof opt==="object" ? opt.label : opt;
          const active = value === val;
          return (
            <button key={val} type="button" onClick={() => onChange(val)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
              style={active ? {background:"#7B1C2E",color:"#F0D080",borderColor:"#7B1C2E"} : {background:"#fff",color:"#7B1C2E",borderColor:"#f0e6e6"}}
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
      style={{ borderColor: value ? "#C9A84C" : "#f0e6e6", background: value ? "#FDF0D0" : "#fff" }}>
      <span className="text-sm font-semibold" style={{ color: value ? "#7B5A00" : "#9B6060" }}>{value ? labelOn : labelOff}</span>
      <div className="w-12 h-6 rounded-full relative transition-colors" style={{ background: value ? "#C9A84C" : "#e5e7eb" }}>
        <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all" style={{ left: value ? "28px" : "4px" }} />
      </div>
    </button>
  );
}
function NativeSelect({ label, value, onChange, options }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="relative">
        <select value={value||""} onChange={e => onChange(e.target.value)}
          style={{ fontSize:16, border:"2px solid #f0e6e6", background:"#fff", color: value ? "#3D0010" : "#9B6060", appearance:"none", WebkitAppearance:"none" }}
          className="w-full rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors pr-10">
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" style={{ color:"#9B6060" }} />
      </div>
    </div>
  );
}
function SkillChip({ label, selected, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all"
      style={selected ? {borderColor:"#7B1C2E",background:"#FDE8EC",color:"#7B1C2E"} : {borderColor:"#f0e6e6",background:"#fff",color:"#9B6060"}}>
      {selected && <Check size={11} strokeWidth={3} />}
      {label}
    </button>
  );
}

// ── MARITAL STATUS ──
function MaritalStatus({ form, update }) {
  const getAge = (day, month, year) => {
    if (!day || !month || !year || String(year).length < 4) return null;
    const d = new Date(`${year}-${month}-${day}`);
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d) / (365.25 * 24 * 60 * 60 * 1000));
  };
  const age = getAge(form.dobDay, form.dobMonth, form.dobYear);
  if (age !== null && age < 20) return null;
  const ms = form.maritalStatus || "";
  const step1 = ms==="Married" ? "Married" : ms==="Engaged" ? "Engaged" : ms!=="" ? "Unmarried" : "";
  const showStep2 = step1 === "Unmarried";
  const showStep3 = (ms==="Divorced"||ms==="Widowed") && age!==null && age>=22 && age<=50;
  const btn = (active) => active
    ? {background:"#7B1C2E",borderColor:"#7B1C2E",color:"#F0D080"}
    : {background:"#fff",borderColor:"#f0e6e6",color:"#9B6060"};
  return (
    <div className="space-y-3">
      <FieldLabel>
        Marital Status / વૈવાહિક સ્થિતિ
        {age===null && <span className="ml-1 font-normal" style={{color:"#C0A0A0"}}>(DOB ઉમેરો — ૨૦ નીચે છુપાશે)</span>}
      </FieldLabel>
      <div className="flex gap-2">
        {[{key:"Married",en:"Married",gu:"પરણેલા",emoji:"👫"},{key:"Engaged",en:"Engaged",gu:"સગાઈ થઈ",emoji:"💍"},{key:"Unmarried",en:"Unmarried",gu:"અપરિણીત",emoji:"🙍"}].map(opt => (
          <button key={opt.key} type="button"
            onClick={() => { update("maritalStatus", opt.key==="Unmarried" ? (ms==="Single"||ms==="Divorced"||ms==="Widowed" ? ms : "Single") : opt.key); update("remarriage",""); }}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all" style={btn(step1===opt.key)}>
            <span className="block text-base">{opt.emoji}</span>
            <span className="block">{opt.en}</span>
            <span className="block text-xs opacity-80">{opt.gu}</span>
          </button>
        ))}
      </div>
      {showStep2 && (
        <div className="rounded-xl p-3 space-y-2" style={{background:"#FDF0D0"}}>
          <p className="text-xs font-semibold" style={{color:"#7B5A00"}}>Unmarried Type / અપરિણીત પ્રકાર</p>
          <div className="flex gap-2">
            {[{value:"Single",en:"Single",gu:"કુંવારા"},{value:"Divorced",en:"Divorced",gu:"છૂટાછેડા"},{value:"Widowed",en:"Widowed",gu:"વિધવા/વિધુર"}].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => { update("maritalStatus",opt.value); update("remarriage",""); }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all" style={btn(ms===opt.value)}>
                <span className="block">{opt.en}</span>
                <span className="block text-xs opacity-75">{opt.gu}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {showStep3 && (
        <div className="rounded-xl p-3 space-y-2" style={{background:"#FDE8EC"}}>
          <p className="text-xs font-semibold" style={{color:"#7B1C2E"}}>Interested in Remarriage? / પુનઃ લગ્નમાં રસ?</p>
          <div className="flex gap-2">
            {[{value:"Yes",en:"Yes, Open to It",gu:"હા, વિચારીશું"},{value:"No",en:"Not Looking",gu:"ના, રસ નથી"}].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => update("remarriage", form.remarriage===opt.value ? "" : opt.value)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all"
                style={form.remarriage===opt.value
                  ? {background: opt.value==="Yes" ? "#15803d" : "#374151", borderColor: opt.value==="Yes" ? "#15803d" : "#374151", color:"#fff"}
                  : {background:"#fff",borderColor:"#f0e6e6",color:"#9B6060"}}>
                <span className="block">{opt.en}</span>
                <span className="block text-xs opacity-75">{opt.gu}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB BASIC ──
function TabBasic({ form, update, errors }) {
  const DAYS   = Array.from({length:31},(_,i) => String(i+1).padStart(2,"0"));
  const MONTHS = [{v:"01",l:"Jan"},{v:"02",l:"Feb"},{v:"03",l:"Mar"},{v:"04",l:"Apr"},{v:"05",l:"May"},{v:"06",l:"Jun"},{v:"07",l:"Jul"},{v:"08",l:"Aug"},{v:"09",l:"Sep"},{v:"10",l:"Oct"},{v:"11",l:"Nov"},{v:"12",l:"Dec"}];
  return (
    <div className="space-y-4 px-4 py-4">
      <TextInput label="Full Name *" value={form.name} onChange={v => update("name",v)} placeholder="e.g. Ramesh Patel" error={errors.name} />
      <div>
        <FieldLabel>Mobile Number</FieldLabel>
        <div className="flex gap-2">
        
<input
  type="tel"
  inputMode="numeric"
  value={form.countryCode || "+91"}
  onChange={e => {
    let val = e.target.value;
    if (!val.startsWith("+")) val = "+" + val.replace(/\+/g, "");
    update("countryCode", val);
  }}
  maxLength={5}
  style={{
    fontSize: 14,
    border: "2px solid #f0e6e6",
    background: "#fff",
    color: "#3D0010",
    minWidth: 70,
    textAlign: "center"
  }}
  className="rounded-xl px-2 py-3 outline-none focus:border-[#C9A84C] transition-colors"
/>
          <input type="tel" inputMode="numeric" value={form.mobile}
            onChange={e => update("mobile",e.target.value.replace(/\D/g,""))} placeholder="Mobile number" maxLength={15}
            style={{fontSize:16,border: errors.mobile ? "2px solid #ef4444" : "2px solid #f0e6e6",background:"#fff",color:"#3D0010"}}
            className="flex-1 rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors" />
        </div>
        {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
      </div>
      <TextInput label="Email" value={form.email} onChange={v => update("email",v)} placeholder="email@example.com" type="email" />
      <div>
        <FieldLabel>Gender / લિંગ</FieldLabel>
        <div className="flex gap-2">
          {[{value:"Male",en:"Male",gu:"પુરુષ",emoji:"👨"},{value:"Female",en:"Female",gu:"સ્ત્રી",emoji:"👩"}].map(g => (
            <button key={g.value} type="button" onClick={() => update("gender", form.gender===g.value ? "" : g.value)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
              style={form.gender===g.value
                ? {background: g.value==="Male" ? "#7B1C2E" : "#ec4899", borderColor: g.value==="Male" ? "#7B1C2E" : "#ec4899", color:"#fff"}
                : {background:"#fff",borderColor:"#f0e6e6",color:"#9B6060"}}>
              <span className="block">{g.emoji} {g.en}</span>
              <span className="block text-xs opacity-80">{g.gu}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Date of Birth</FieldLabel>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select value={form.dobDay||""} onChange={e => update("dobDay",e.target.value)}
              style={{fontSize:16,border:"2px solid #f0e6e6",background:"#fff",color: form.dobDay ? "#3D0010" : "#9B6060",appearance:"none",WebkitAppearance:"none"}}
              className="w-full rounded-xl px-3 py-3 outline-none focus:border-[#C9A84C] transition-colors pr-7">
              <option value="">Day</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" style={{color:"#9B6060"}} />
          </div>
          <div className="relative flex-1">
            <select value={form.dobMonth||""} onChange={e => update("dobMonth",e.target.value)}
              style={{fontSize:16,border:"2px solid #f0e6e6",background:"#fff",color: form.dobMonth ? "#3D0010" : "#9B6060",appearance:"none",WebkitAppearance:"none"}}
              className="w-full rounded-xl px-3 py-3 outline-none focus:border-[#C9A84C] transition-colors pr-7">
              <option value="">Month</option>
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <ChevronRight size={12} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" style={{color:"#9B6060"}} />
          </div>
          <input type="tel" inputMode="numeric" value={form.dobYear||""}
            onChange={e => update("dobYear",e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="Year" maxLength={4}
            style={{fontSize:16,border:"2px solid #f0e6e6",background:"#fff",color:"#3D0010"}}
            className="flex-1 rounded-xl px-3 py-3 outline-none focus:border-[#C9A84C] transition-colors" />
        </div>
      </div>
      <MaritalStatus form={form} update={update} />
      <BigToggle value={form.stayAway} onChange={() => update("stayAway",!form.stayAway)} labelOn="Stays away from home" labelOff="Stays at home" />
      {form.stayAway && <TextInput label="Which city?" value={form.stayCity} onChange={v => update("stayCity",v)} placeholder="e.g. Ahmedabad, Surat" />}
    </div>
  );
}

// ── TAB EDUCATION ──
function TabEducation({ form, update }) {
  const isStudent=form.isStudent, isSchool=form.educationType==="School Student",
    isCollege=form.educationType==="College Student", isPG=form.educationType==="Postgraduate",
    isDiploma=form.educationType==="Diploma / ITI", isProfessional=form.educationType==="Professional Course",
    isCompetitive=form.educationType==="Competitive Prep",
    needsStream=isSchool && NEEDS_STREAM.includes(form.standard);
  const handleEducationType = (v) => { update("educationType",v); ["standard","stream","medium","year","degree","specialization","collegeName","courseName","courseStage","exam"].forEach(f => update(f,"")); };
  const handleStudentToggle = () => {
    const off=isStudent; update("isStudent",!isStudent);
    if(off){["educationType","standard","stream","medium","year","degree","specialization","collegeName","courseName","courseStage","exam"].forEach(f=>update(f,""));
      ["needsScholarship","supportFees","supportBooks","supportCoaching","supportCounseling"].forEach(f=>update(f,false));}
  };
  return (
    <div className="space-y-4 px-4 py-4">
      <BigToggle value={isStudent} onChange={handleStudentToggle} labelOn="🎓 Is a Student" labelOff="Not a student" />
      {!isStudent && <TextInput label="Occupation" value={form.occupation} onChange={v=>update("occupation",v)} placeholder="e.g. Engineer, Teacher, Business" />}
      {isStudent && (<>
        <NativeSelect label="Education Level" value={form.educationType} onChange={handleEducationType} options={EDUCATION_TYPES} />
        {isSchool && (<><NativeSelect label="Class / Grade" value={form.standard} onChange={v=>update("standard",v)} options={SCHOOL_STANDARDS} />
          {needsStream && <PillSelect label="Stream" value={form.stream} onChange={v=>update("stream",v)} options={["Science","Commerce","Arts"]} />}
          <PillSelect label="Medium" value={form.medium} onChange={v=>update("medium",v)} options={["English","Gujarati","Hindi"]} /></>)}
        {isCollege && (<><NativeSelect label="Year of Study" value={form.year} onChange={v=>update("year",v)} options={COLLEGE_YEARS} />
          <NativeSelect label="Degree Program" value={form.degree} onChange={v=>update("degree",v)} options={DEGREE_PROGRAMS} />
          <TextInput label="Branch / Major" value={form.specialization} onChange={v=>update("specialization",v)} placeholder="e.g. Computer Science" />
          <TextInput label="College Name" value={form.collegeName} onChange={v=>update("collegeName",v)} placeholder="College name" /></>)}
        {isPG && (<><NativeSelect label="Year" value={form.year} onChange={v=>update("year",v)} options={PG_YEARS} />
          <TextInput label="Major / Specialization" value={form.specialization} onChange={v=>update("specialization",v)} placeholder="e.g. MBA Finance" /></>)}
        {isDiploma && (<><NativeSelect label="Year" value={form.year} onChange={v=>update("year",v)} options={DIPLOMA_YEARS} />
          <TextInput label="Branch / Trade" value={form.specialization} onChange={v=>update("specialization",v)} placeholder="e.g. Electrical" /></>)}
        {isProfessional && (<><NativeSelect label="Course" value={form.courseName} onChange={v=>update("courseName",v)} options={PROFESSIONAL_COURSES} />
          <PillSelect label="Stage" value={form.courseStage} onChange={v=>update("courseStage",v)} options={PROFESSIONAL_STAGES} /></>)}
        {isCompetitive && <TextInput label="Exam Name" value={form.exam} onChange={v=>update("exam",v)} placeholder="e.g. UPSC, JEE, NEET" />}
      </>)}
    </div>
  );
}

// ── TAB SKILLS ──
function TabSkills({ form, update }) {
  const [customInputs, setCustomInputs] = useState({});
  const toggleSkill = (k,skill) => { const c=form[k]||[]; update(k, c.includes(skill) ? c.filter(s=>s!==skill) : [...c,skill]); };
  const addCustom = (k) => { const v=(customInputs[k]||"").trim(); if(!v)return; toggleSkill(k,v); setCustomInputs(p=>({...p,[k]:""})); };
  return (
    <div className="space-y-5 px-4 py-4">
      {SKILL_CATEGORIES.map(cat => {
        const selected=form[cat.key]||[], custom=selected.filter(s=>!cat.options.includes(s));
        return (
          <div key={cat.key}>
            <FieldLabel>{cat.emoji} {cat.label}</FieldLabel>
            <div className="flex flex-wrap gap-2 mb-2">
              {cat.options.map(s => <SkillChip key={s} label={s} selected={selected.includes(s)} onToggle={()=>toggleSkill(cat.key,s)} />)}
              {custom.map(s => <SkillChip key={s} label={s} selected onToggle={()=>toggleSkill(cat.key,s)} />)}
            </div>
            <div className="flex gap-2">
              <input value={customInputs[cat.key]||""} onChange={e=>setCustomInputs(p=>({...p,[cat.key]:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&addCustom(cat.key)} placeholder="Add other..."
                style={{fontSize:16,border:"2px solid #f0e6e6"}}
                className="flex-1 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#C9A84C]" />
              <button type="button" onClick={()=>addCustom(cat.key)} disabled={!(customInputs[cat.key]||"").trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30" style={{background:"#7B1C2E"}}>
                <Plus size={16} color="#F0D080" />
              </button>
            </div>
          </div>
        );
      })}
      <div><FieldLabel>🏆 Achievements</FieldLabel>
        <textarea value={form.achievements} onChange={e=>update("achievements",e.target.value)} placeholder="Awards, competitions, certificates..." rows={3}
          style={{fontSize:16,border:"2px solid #f0e6e6"}} className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none" /></div>
      <div><FieldLabel>👤 About</FieldLabel>
        <textarea value={form.aboutMe} onChange={e=>update("aboutMe",e.target.value)} placeholder="Personality, goals, interests..." rows={3}
          style={{fontSize:16,border:"2px solid #f0e6e6"}} className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none" /></div>
    </div>
  );
}

// ── TAB HONORARY ──
function TabHonorary({ form, update }) {
  const orgs=form.honoraryOrgs||[];
  const hasOrg=(id)=>orgs.some(o=>o.orgId===id);
  const toggleOrg=(orgId)=>{ if(hasOrg(orgId)){update("honoraryOrgs",orgs.filter(o=>o.orgId!==orgId));}else{update("honoraryOrgs",[...orgs,{orgId,post:"",name:""}]);} };
  const updateOrg=(orgId,field,value)=>update("honoraryOrgs",orgs.map(o=>o.orgId===orgId?{...o,[field]:value}:o));
  const getOrg=(orgId)=>orgs.find(o=>o.orgId===orgId);
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-2xl p-4" style={{background:"linear-gradient(135deg,#FDF0D0,#FDE8EC)"}}>
        <p className="text-sm font-bold mb-1" style={{color:"#5A1020"}}>🏅 સામાજિક હોદ્દો</p>
        <p className="text-xs" style={{color:"#9B6060"}}>આ સભ્ય કઈ સંસ્થામાં કોઈ હોદ્દો ધરાવે છે?</p>
      </div>
      <div className="space-y-3">
        {KNOWN_ORGS.map(org => {
          const selected=hasOrg(org.id), entry=getOrg(org.id);
          return (
            <div key={org.id}>
              <button type="button" onClick={()=>toggleOrg(org.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
                style={selected?{background:"#FDE8EC",borderColor:"#7B1C2E"}:{background:"#fff",borderColor:"#f0e6e6"}}>
                <span className="text-sm font-semibold" style={{color:selected?"#7B1C2E":"#9B6060"}}>{org.label}</span>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={selected?{background:"#7B1C2E",borderColor:"#7B1C2E"}:{background:"#fff",borderColor:"#ccc"}}>
                  {selected && <Check size={11} color="#F0D080" strokeWidth={3} />}
                </div>
              </button>
              {selected && entry && (
                <div className="mt-2 ml-3 space-y-2 pl-3 border-l-2" style={{borderColor:"#C9A84C"}}>
                  {org.askName && (
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{color:"#7B1C2E"}}>સંસ્થાનું નામ / Organisation Name</p>
                      <input type="text" value={entry.name||""} onChange={e=>updateOrg(org.id,"name",e.target.value)} placeholder="સંસ્થાનું નામ લખો..."
                        style={{fontSize:16,border:"2px solid #f0e6e6",background:"#fff",color:"#3D0010"}}
                        className="w-full rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C] transition-colors" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold mb-1.5" style={{color:"#7B1C2E"}}>હોદ્દો / Post</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {POST_SUGGESTIONS.map(p => (
                        <button key={p} type="button" onClick={()=>updateOrg(org.id,"post",entry.post===p?"":p)}
                          className="px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all"
                          style={entry.post===p?{background:"#7B1C2E",borderColor:"#7B1C2E",color:"#F0D080"}:{background:"#fff",borderColor:"#f0e6e6",color:"#7B1C2E"}}>
                          {p}
                        </button>
                      ))}
                    </div>
                    {(!entry.post || !POST_SUGGESTIONS.includes(entry.post)) && (
                      <input type="text" value={POST_SUGGESTIONS.includes(entry.post)?"" : (entry.post||"")}
                        onChange={e=>updateOrg(org.id,"post",e.target.value)} placeholder="અથવા હોદ્દો લખો..."
                        style={{fontSize:16,border:"2px solid #f0e6e6",background:"#fff",color:"#3D0010"}}
                        className="w-full rounded-xl px-3 py-2.5 outline-none focus:border-[#C9A84C] transition-colors" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {orgs.length > 0 && (
        <div className="rounded-xl p-3 space-y-1.5" style={{background:"#FDF0D0"}}>
          <p className="text-xs font-bold mb-2" style={{color:"#7B5A00"}}>📋 પસંદ કરેલ હોદ્દા</p>
          {orgs.map(o => {
            const org=KNOWN_ORGS.find(k=>k.id===o.orgId), name=org?.askName&&o.name?`(${o.name})`:"";
            return <p key={o.orgId} className="text-xs" style={{color:"#5A1020"}}>• {org?.label} {name} {o.post?`— ${o.post}`:""}</p>;
          })}
        </div>
      )}
    </div>
  );
}

// ── TAB FINANCIAL ──
function TabFinancial({ form, update }) {
  const ns=form.needsScholarship;
  const SUPPORT=[{key:"supportFees",label:"Fees",icon:"💳"},{key:"supportBooks",label:"Books",icon:"📚"},{key:"supportCoaching",label:"Coaching",icon:"🎯"},{key:"supportCounseling",label:"Counseling",icon:"🧠"}];
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-2xl p-4" style={{background:"linear-gradient(135deg,#FDF0D0,#FDE8EC)"}}>
        <p className="text-sm font-bold mb-1" style={{color:"#5A1020"}}>📋 Educational Support</p>
        <p className="text-xs" style={{color:"#9B6060"}}>Does this student need financial or academic help?</p>
      </div>
      <div>
        <FieldLabel>Need support?</FieldLabel>
        <div className="flex gap-3">
          {[{value:true,label:"Yes, need help",icon:"🙋"},{value:false,label:"No, all good",icon:"✅"}].map(opt => (
            <button key={String(opt.value)} type="button" onClick={()=>update("needsScholarship",opt.value)}
              className="flex-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all"
              style={ns===opt.value?{borderColor:"#C9A84C",background:"#FDF0D0",color:"#7B5A00"}:{borderColor:"#f0e6e6",background:"#fff",color:"#9B6060"}}>
              <div className="text-xl mb-0.5">{opt.icon}</div>{opt.label}
            </button>
          ))}
        </div>
      </div>
      {ns===true && (
        <div>
          <FieldLabel>What kind of support?</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORT.map(({key,label,icon}) => { const checked=!!form[key]; return (
              <button key={key} type="button" onClick={()=>update(key,!checked)}
                className="flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all"
                style={checked?{borderColor:"#C9A84C",background:"#FDF0D0",color:"#7B5A00"}:{borderColor:"#f0e6e6",background:"#fff",color:"#9B6060"}}>
                <span className="text-lg">{icon}</span>
                <span className="text-xs font-semibold">{label}</span>
                {checked && <Check size={12} className="ml-auto" style={{color:"#C9A84C"}} />}
              </button>
            );})}
          </div>
        </div>
      )}
      <div><FieldLabel>Additional Notes</FieldLabel>
        <textarea value={form.helpRequired} onChange={e=>update("helpRequired",e.target.value)} placeholder="Any specific help or notes..." rows={3}
          style={{fontSize:16,border:"2px solid #f0e6e6"}} className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none" />
      </div>
    </div>
  );
}

// ── REVIEW SCREEN ──
function ReviewScreen({ form, onEdit, onSave, saving, isAdding }) {
  const rows = [
    {label:"Name",value:form.name},{label:"Mobile",value:form.mobile?`${form.countryCode||"+91"} ${form.mobile}`:""},
    {label:"Email",value:form.email},{label:"Gender",value:form.gender},
    {label:"DOB",value:(form.dobDay&&form.dobMonth&&form.dobYear)?`${form.dobDay}/${form.dobMonth}/${form.dobYear}`:""},
    {label:"Status",value:form.maritalStatus||""},{label:"Remarriage",value:form.remarriage||""},
    {label:"Stays",value:form.stayAway?`Away – ${form.stayCity||"?"}`:"At home"},
    {label:"Student",value:form.isStudent?"Yes":"No"},{label:"Occupation",value:form.occupation},
    {label:"Education",value:form.educationType},{label:"Grade/Year",value:form.standard||form.year},
    {label:"Degree",value:form.degree},{label:"College",value:form.collegeName},
    {label:"Support",value:form.needsScholarship?"Needs help":"No support needed"},
    ...(form.honoraryOrgs||[]).map(o=>{
      const orgMap={kadavani:"કડવાણી મંડળ",seva:"સેવા સમાજ",suraksha:"સુરક્ષા ટ્રસ્ટ",sthanik:"સ્થાનિક સમાજ",other:"અન્ય"};
      return {label:orgMap[o.orgId]||o.orgId, value:[o.name,o.post].filter(Boolean).join(" — ")||"—"};
    }),
  ].filter(r=>r.value);
  const allSkills=SKILL_CATEGORIES.flatMap(cat=>(form[cat.key]||[]).map(s=>`${cat.emoji} ${s}`));
  return (
    <div className="flex flex-col" style={{minHeight:0}}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl" style={{background:"#FDE8EC"}}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0" style={{background:"#7B1C2E",color:"#F0D080"}}>
            {(form.name||"?")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-base" style={{color:"#5A1020"}}>{form.name||"—"}</p>
            <p className="text-xs" style={{color:"#9B6060"}}>{form.educationType||form.occupation||"Member"}</p>
          </div>
        </div>
        {rows.map(r => (
          <div key={r.label} className="flex justify-between items-start py-2 border-b" style={{borderColor:"#f0e6e6"}}>
            <span className="text-xs" style={{color:"#9B6060"}}>{r.label}</span>
            <span className="text-xs font-semibold text-right max-w-[60%]" style={{color:"#3D0010"}}>{r.value}</span>
          </div>
        ))}
        {allSkills.length>0 && (
          <div className="py-2">
            <p className="text-xs mb-2" style={{color:"#9B6060"}}>Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {allSkills.map(s=><span key={s} className="text-xs px-2 py-1 rounded-full" style={{background:"#FDE8EC",color:"#7B1C2E"}}>{s}</span>)}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3 px-4 pt-3 pb-6 border-t" style={{borderColor:"#f0e6e6"}}>
        <button onClick={onEdit} className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2" style={{borderColor:"#f0e6e6",color:"#7B1C2E"}}>← Edit</button>
        <button onClick={onSave} disabled={saving} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{background:"#7B1C2E"}}>
          {saving ? "Saving..." : isAdding ? "Add Member ✓" : "Save ✓"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────
export default function EditMemberModal({ open, mode="edit", member=null, familyId, onClose }) {
  const isAdding = mode === "add";
  const draftKey = isAdding ? `memberDraft_new_${familyId}` : `memberDraft_${member?.id}`;

  const [form, setForm]             = useState(null);
  const [activeTab, setActiveTab]   = useState("basic");
  const [showReview, setShowReview] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState({});

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeTab]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const draft = await loadCache(draftKey);
      if (draft && Object.keys(draft).length > 0) { setForm(draft); return; }
      if (isAdding) {
        setForm({ ...EMPTY_FORM });
      } else {
        if (!member) return;
        let countryCode = "+91";
        let mobileNum   = member.mobile || member.phone || "";
        if (mobileNum.startsWith("+")) {
          const match = COUNTRY_CODES.find(c => mobileNum.startsWith(c.code));
          if (match) { countryCode = match.code; mobileNum = mobileNum.slice(match.code.length); }
        }
        const dobParts = (member.dob || "").split("/");
        setForm({
          ...EMPTY_FORM,
          name:          member.name          || "",
          countryCode,   mobile:        mobileNum,
          email:         member.email         || "",
          gender:        member.gender        || "",
          dobDay:        dobParts[0]          || "",
          dobMonth:      dobParts[1]          || "",
          dobYear:       dobParts[2]          || "",
          maritalStatus: member.maritalStatus || (member.married===true ? "Married" : ""),
          remarriage:    member.remarriage    || "",
          stayAway:      member.stayAway      || false,
          stayCity:      member.stayCity      || "",
          isStudent:     member.isStudent     || false,
          occupation:    member.occupation    || "",
          educationType: member.educationType || "", standard:      member.standard      || "",
          stream:        member.stream        || "", medium:        member.medium        || "",
          year:          member.year          || "", degree:        member.degree        || "",
          specialization:member.specialization|| "", collegeName:   member.collegeName   || "",
          courseName:    member.courseName    || "", courseStage:   member.courseStage   || "",
          exam:          member.exam          || "",
          indoorSports:  member.indoorSports  || [], outdoorSports: member.outdoorSports || [],
          talents:       member.talents       || [], creative:      member.creative      || [],
          hobbies:       member.hobbies       || [], funActivities: member.funActivities || [],
          achievements:  member.achievements  || "", aboutMe:       member.aboutMe       || "",
          needsScholarship:  member.needsScholarship  ?? false,
          supportFees:       member.supportFees       || false,
          supportBooks:      member.supportBooks      || false,
          supportCoaching:   member.supportCoaching   || false,
          supportCounseling: member.supportCounseling || false,
          helpRequired:      member.helpRequired      || "",
          honoraryOrgs:      member.honoraryOrgs      || [],
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

  // ── Tab navigation ──
  const currentTabIndex = TAB_IDS.indexOf(activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab  = activeTab === LAST_TAB;

  const goNext = () => {
    if (isLastTab) {
      if (validate()) setShowReview(true);
    } else {
      setActiveTab(TAB_IDS[currentTabIndex + 1]);
    }
  };
  const goBack = () => {
    if (showReview) { setShowReview(false); return; }
    if (!isFirstTab) setActiveTab(TAB_IDS[currentTabIndex - 1]);
  };

  // ─────────────────────────────────────────────
  // ✅ handleSave
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const assembledMobile = form.mobile?.trim()
        ? normalizeMobile(`${form.countryCode || "+91"}${form.mobile.trim()}`) : "";
      const assembledDob = (form.dobDay && form.dobMonth && form.dobYear)
        ? `${form.dobDay}/${form.dobMonth}/${form.dobYear}` : "";
      const assembledName = form.name?.trim()
        ? form.name.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "";

      let education = "";
      if (form.isStudent) {
        if      (form.educationType === "School Student")        education = form.standard;
        else if (form.educationType === "College Student")       education = `${form.degree||""} ${form.year||""}`.trim();
        else if (form.educationType === "Postgraduate")          education = `PG ${form.year||""}`.trim();
        else if (form.educationType === "Diploma / ITI")         education = `Diploma ${form.year||""}`.trim();
        else if (form.educationType === "Professional Course")   education = `${form.courseName||""} ${form.courseStage||""}`.trim();
        else if (form.educationType === "Competitive Prep")      education = form.exam;
      }

      const payload = {
        ...form,
        name: assembledName, mobile: assembledMobile, dob: assembledDob, education,
        married: form.maritalStatus === "Married" || form.maritalStatus === "Engaged",
      };
      delete payload.countryCode;
      delete payload.dobDay; delete payload.dobMonth; delete payload.dobYear;

      const memberId = isAdding ? push(ref(db, "members")).key : member.id;
      const ts       = Date.now();
      const writes   = {};

      if (isAdding) {
        writes[`members/${memberId}`]                    = { ...payload, familyId, createdAt: ts };
        writes[`families/${familyId}/members/${memberId}`] = true;
      } else {
        writes[`members/${memberId}`] = { ...member,...payload, updatedAt: ts };
      }

      if (assembledMobile) {
        const mob = normalizeMobile(assembledMobile);
        if (mob) {
          writes[`mobileIndex/${mob}/memberIds/${memberId}`]   = true;
          writes[`mobileIndex/${mob}/familyIds/${familyId}`]   = true;
          writes[`mobileIndex/${mob}/sources/manualAdd`]       = true;
          writes[`mobileIndex/${mob}/createdAt`]               = ts;
        }
      }

      ALL_ORG_IDS.forEach(orgId => {
        writes[`honoraryIndex/${orgId}/${memberId}`] = null;
      });
      (payload.honoraryOrgs || []).forEach(entry => {
        if (!entry.orgId || !entry.post) return;
        writes[`honoraryIndex/${entry.orgId}/${memberId}`] = {
          memberId, familyId,
          memberName: assembledName,
          mobile:     assembledMobile,
          photoURL:   payload.photoURL || "",
          post:       entry.post,
          orgName:    entry.name || "",
          updatedAt:  ts,
        };
      });

      await batchWrite(writes);
      await saveCache(draftKey, {});
      onClose(true, isAdding
        ? { id: memberId, familyId, ...payload }
        : { ...member, ...payload }
      );

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
    honorary:  <TabHonorary  form={form} update={updateField} />,
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{background:"rgba(0,0,0,0.5)"}} onClick={()=>onClose(false)} />

      {/* Modal — slides from TOP */}
      <div
        className="fixed left-0 right-0 top-0 z-50 flex flex-col rounded-b-3xl"
        style={{
          background: "#FDF6EC",
          maxHeight: "92vh",
          boxShadow: "0 8px 40px rgba(90,16,32,0.25)",
          overflow: "hidden",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{borderBottom:"1px solid #f0e6e6"}}>
          <h2 className="text-base font-bold" style={{color:"#5A1020"}}>
            {showReview ? "Review Details" : isAdding ? "Add Member" : "Edit Member"}
          </h2>
          <button onClick={()=>onClose(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:"#FDE8EC"}}>
            <X size={16} style={{color:"#7B1C2E"}} />
          </button>
        </div>

        {/* ── Tab Bar (always visible, fixed below header) ── */}
        {!showReview && (
          <div className="flex flex-shrink-0 px-2" style={{borderBottom:"2px solid #f0e6e6", background:"#FDF6EC"}}>
            {TABS.map((tab, idx) => {
              const Icon   = tab.icon;
              const active = activeTab === tab.id;
              const done   = idx < currentTabIndex;
              return (
                <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-all relative"
                  style={{color: active ? "#7B1C2E" : done ? "#C9A84C" : "#C0A0A0"}}>
                  <div className="relative">
                    <Icon size={16} />
                    {done && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center" style={{background:"#C9A84C"}}>
                        <Check size={8} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  {tab.label}
                  {active && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{background:"#C9A84C"}} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Scrollable Content ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0" style={{WebkitOverflowScrolling:"touch"}}>
          {showReview
            ? <ReviewScreen form={form} onEdit={()=>setShowReview(false)} onSave={handleSave} saving={saving} isAdding={isAdding} />
            : tabContent[activeTab]
          }
        </div>

        {/* ── Bottom Nav: Back | Next/Review ── */}
        {!showReview && (
          <div className="flex gap-3 px-4 py-3 flex-shrink-0" style={{borderTop:"1px solid #f0e6e6", paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))"}}>
            {!isFirstTab && (
              <button onClick={goBack}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2"
                style={{borderColor:"#f0e6e6", color:"#7B1C2E"}}>
                ← Back
              </button>
            )}
            <button onClick={goNext}
              className="py-3.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{background:"#7B1C2E", flex: isFirstTab ? 1 : 1}}>
              {isLastTab ? "Review →" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}