import { useState, useEffect, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword
} from "firebase/auth";

import StudentSectionTitle from "../components/StudentSectionTitle";
import LoadingScreen       from "../components/LoadingScreen";

import { useContactPicker }   from "../hooks/useContactPicker";
import { useFamilySetup }     from "../hooks/useFamilySetup";
import ContactPickerModal     from "../components/contacts/ContactPickerModal";
import ConfirmedContactLabels from "../components/contacts/ConfirmedContactLabels";
import FamilyReorderList      from "../components/family/FamilyReorderList";
import StudentMiniForm        from "../components/family/StudentMiniForm";

import { submitStudentRegistration } from "../services/studentSubmitService";

// ─────────────────────────────────────────────────────────────
// Progress bar header — replaces old dots
// ─────────────────────────────────────────────────────────────
function ProgressHeader({ label, stepNum, totalSteps }) {
  const pct = Math.round((stepNum / totalSteps) * 100);
  return (
    <div className="sticky top-0 bg-gradient-to-b from-blue-50 to-transparent pt-3 pb-4 z-40 -mx-4 px-4">
      <div className="bg-blue-100 border-2 border-blue-300 rounded-2xl p-3 mb-3 shadow-sm">
        <p className="text-sm text-blue-900 flex items-center gap-2 font-medium">
          <span className="text-xl">🔤</span>
          <span><strong>Important:</strong> Fill all information in English only</span>
        </p>
      </div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-base font-bold text-gray-800">{label}</h1>
        <span className="text-xs text-gray-500 font-semibold">Step {stepNum} of {totalSteps}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-indigo-500 to-green-500 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function StudentFormPage() {
  const { user }       = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const editId         = searchParams.get("edit");
  const navigate       = useNavigate();

  // section: "contacts" | "arrange" | "student-0" | "student-1" | ... | "review"
  const [section, setSection] = useState("contacts");
  const [cityError, setCityError] = useState("");

  const contactPicker = useContactPicker();
  const familySetup   = useFamilySetup();

  const [showContactModal, setShowContactModal] = useState(false);
  const [showRegisterChoice, setShowRegisterChoice] = useState(false);
  const [showEmailForm, setShowEmailForm]           = useState(false);
  const [regEmail, setRegEmail]   = useState("");
  const [regPass, setRegPass]     = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState({
    message: "Preparing...", progress: 0, stage: ""
  });

  const students   = familySetup.students;
  const totalSteps = 2 + students.length + 1; // contacts + arrange + Nx students + review

  const stepNumFor = (sec) => {
    if (sec === "contacts") return 1;
    if (sec === "arrange")  return 2;
    if (sec.startsWith("student-")) return 3 + parseInt(sec.split("-")[1]);
    if (sec === "review")   return totalSteps;
    return 1;
  };

  const labelFor = (sec) => {
    if (sec === "contacts") return "Family Contacts";
    if (sec === "arrange")  return "Arrange Family";
    if (sec.startsWith("student-")) {
      const idx = parseInt(sec.split("-")[1]);
      return students[idx] ? `${students[idx].name.split(" ")[0]}'s Profile` : "Student Info";
    }
    return "Review & Submit";
  };

  // Load draft on mount
  useEffect(() => { familySetup.loadDraft(); }, []);

  // ── Navigation ──
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const goNext = () => {
    scrollTop();
    if (section === "contacts") {
      if (!familySetup.members.length) return;
      if (!familySetup.city.trim()) { setCityError("City is required"); return; }
      setCityError("");
      setSection("arrange");
      return;
    }
    if (section === "arrange") {
      setSection(students.length > 0 ? "student-0" : "review");
      return;
    }
    if (section.startsWith("student-")) {
      const idx = parseInt(section.split("-")[1]);
      setSection(idx + 1 < students.length ? `student-${idx + 1}` : "review");
      return;
    }
  };

  const goBack = () => {
    scrollTop();
    if (section === "arrange")   { setSection("contacts"); return; }
    if (section === "student-0") { setSection("arrange");  return; }
    if (section.startsWith("student-")) {
      const idx = parseInt(section.split("-")[1]);
      setSection(`student-${idx - 1}`);
      return;
    }
    if (section === "review") {
      setSection(students.length > 0 ? `student-${students.length - 1}` : "arrange");
      return;
    }
  };

  // ── Contact modal ──
  const handleConfirmContacts = () => {
    const confirmed = contactPicker.confirmContacts();
    if (confirmed) {
      familySetup.confirmContacts(confirmed);
      setShowContactModal(false);
    }
  };

  // ── Submission ──
  const handleFinalSave = async () => {
    setIsSubmitting(true);
    setSubmissionProgress({ message: "Starting submission...", progress: 5, stage: "init" });
    try {
      const submissionData = {
        city:    familySetup.city,
        members: familySetup.members,
        students: students.map(s => ({
          memberIndex:      s.memberIndex,
          name:             s.name,
          relation:         s.relation,
          gender:           s.gender,
          dob:              s.dob,
          mobile:           s.mobile,
          skills:           s.skills,
          achievements:     s.achievements,
          aboutMe:          s.aboutMe,
          needsScholarship: s.needsScholarship,
          supportType:      s.supportType,
        })),
        registrationMode: students.length > 0 ? "family-with-students" : "family-only",
      };
      await submitStudentRegistration(submissionData, editId, p => setSubmissionProgress(p));
      setSubmissionProgress({ message: "Success! Redirecting...", progress: 100, stage: "complete" });
      await familySetup.clearDraft();
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (err) {
      console.error("Submission failed:", err);
      alert(err.message || "Failed to submit. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setAuthError("");
    setIsSubmitting(true);
    setSubmissionProgress({ message: "Connecting to Google...", progress: 10, stage: "auth" });
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      await handleFinalSave();
    } catch {
      setAuthError("Google sign-in failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleEmailRegister = async () => {
    setAuthError("");
    if (!regEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setAuthError("Please enter a valid email address."); return;
    }
    if (regPass.length < 6) {
      setAuthError("Password must be at least 6 characters."); return;
    }
    setIsSubmitting(true);
    setSubmissionProgress({ message: "Creating your account...", progress: 10, stage: "auth" });
    try {
      await createUserWithEmailAndPassword(auth, regEmail, regPass);
      await handleFinalSave();
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setAuthError("This email is already registered.");
      else if (err.code === "auth/weak-password")   setAuthError("Password too weak. Use at least 6 characters.");
      else setAuthError("Registration failed: " + err.message);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) { setShowRegisterChoice(true); return; }
    await handleFinalSave();
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 pb-24">
      <div className="max-w-md mx-auto px-4 py-5">

        {isSubmitting && (
          <LoadingScreen
            message={submissionProgress.message}
            progress={submissionProgress.progress}
            subMessage="Please don't close this window"
            showLogo={true}
          />
        )}

        <ProgressHeader
          label={labelFor(section)}
          stepNum={stepNumFor(section)}
          totalSteps={totalSteps}
        />

        {/* ══ SECTION: contacts ══ */}
        {section === "contacts" && !isSubmitting && (
          <div className="bg-white rounded-3xl shadow-lg p-5 space-y-5">
            <StudentSectionTitle title="Your Family Members" />

            {familySetup.members.length > 0 ? (
              <ConfirmedContactLabels
                contacts={familySetup.members}
                onEdit={() => setShowContactModal(true)}
              />
            ) : (
              <div>
                <p className="text-sm font-bold text-gray-800 mb-1">
                  Family Members <span className="text-red-500">*</span>
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Add everyone — you'll mark who are students in the next step
                </p>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all active:scale-98"
                >
                  <p className="text-3xl mb-2">👨‍👩‍👧</p>
                  <p className="text-base text-gray-700 font-semibold">Tap to add family members</p>
                  <p className="text-sm text-gray-400 mt-1">Pick from phone or add manually</p>
                </button>
              </div>
            )}

            <hr className="border-gray-100" />

            {/* City */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                City <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-gray-400">(English only)</span>
              </label>
              <input
                type="text"
                inputMode="text"
                autoComplete="address-level2"
                value={familySetup.city}
                onChange={e => { familySetup.setCity(e.target.value); setCityError(""); }}
                placeholder="Your city name"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-indigo-500 focus:outline-none transition-colors"
              />
              {cityError && <p className="text-red-600 text-sm mt-1">⚠ {cityError}</p>}
            </div>

            <button
              onClick={goNext}
              disabled={!familySetup.members.length || !familySetup.city.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 rounded-2xl font-bold text-base hover:shadow-lg disabled:opacity-40 transition-all active:scale-98 shadow-md"
            >
              Next: Arrange Family →
            </button>
          </div>
        )}

        {/* ══ SECTION: arrange ══ */}
        {section === "arrange" && !isSubmitting && (
          <div className="bg-white rounded-3xl shadow-lg p-5 space-y-5">
            <StudentSectionTitle title="Arrange & Mark Students" />

            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
              <p className="text-sm text-amber-800 font-medium">
                🔢 Drag to set order — Head first · Tap <strong>Student?</strong> to mark students
              </p>
            </div>

            <FamilyReorderList
              members={familySetup.members}
              onReorder={familySetup.reorderMembers}
              onToggleStudent={familySetup.toggleStudent}
            />

            {students.length > 0 ? (
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3">
                <p className="text-sm text-indigo-800 font-semibold">
                  🎓 {students.length} student{students.length > 1 ? "s" : ""} selected:
                  {" "}{students.map(s => s.name.split(" ")[0]).join(", ")}
                </p>
                <p className="text-xs text-indigo-600 mt-1">You'll fill their profiles next</p>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-3">
                <p className="text-sm text-gray-600">
                  No students marked — you can add student profiles later from the dashboard
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={goBack}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-50 transition-all active:scale-98">
                ← Back
              </button>
              <button onClick={goNext}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-98 shadow-md">
                {students.length > 0
                  ? `Next: ${students[0].name.split(" ")[0]}'s Info →`
                  : "Go to Review →"}
              </button>
            </div>
          </div>
        )}

        {/* ══ SECTION: student-N ══ */}
        {section.startsWith("student-") && !isSubmitting && (() => {
          const idx     = parseInt(section.split("-")[1]);
          const student = students[idx];
          if (!student) return null;
          return (
            <StudentMiniForm
              student={student}
              studentNumber={idx + 1}
              totalStudents={students.length}
              onChange={(field, value) =>
                familySetup.updateMember(student.memberIndex, field, value)
              }
              onNext={goNext}
              onBack={goBack}
            />
          );
        })()}

        {/* ══ SECTION: review ══ */}
        {section === "review" && !isSubmitting && (
          <div className="bg-white rounded-3xl shadow-lg p-5 space-y-5">
            <StudentSectionTitle title="Review & Submit" />

            {/* Family list */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-800">Family Members</p>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                  📍 {familySetup.city}
                </span>
              </div>
              {familySetup.members.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100">
                  <span className="text-xs font-black text-gray-400 w-4">{i + 1}</span>
                  <span className="text-sm font-bold text-gray-900 flex-1 truncate">{m.name}</span>
                  {m.relation && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                      {m.relation}
                    </span>
                  )}
                  {m.isStudent && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                      🎓
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Student profiles */}
            {students.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-bold text-gray-800">Student Profiles</p>
                {students.map((s, i) => (
                  <div key={i} className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-black text-indigo-900">{s.name}</span>
                      <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">
                        {s.relation}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
                      {s.gender && <p><span className="font-semibold">Gender:</span> {s.gender}</p>}
                      {s.dob    && <p><span className="font-semibold">DOB:</span> {s.dob}</p>}
                      {s.mobile && <p className="col-span-2"><span className="font-semibold">Mobile:</span> {s.mobile}</p>}
                    </div>
                    {Object.entries(s.skills || {}).some(([, l]) => l.length > 0) && (
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">Skills: </span>
                        {Object.entries(s.skills).flatMap(([cat, list]) =>
                          list.length ? [`${cat}: ${list.join(", ")}`] : []
                        ).join(" · ")}
                      </p>
                    )}
                    {s.achievements && (
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">Achievements:</span> {s.achievements}
                      </p>
                    )}
                    {s.needsScholarship && (
                      <p className="text-xs text-indigo-700 font-semibold">💰 Needs support:
                        {" "}{Object.entries(s.supportType || {}).filter(([,v])=>v).map(([k])=>k).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {students.length === 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                <p className="text-sm text-amber-800 font-medium">
                  ℹ️ No students marked — you can add student profiles from the dashboard after registration.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setSection("contacts"); scrollTop(); }}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-50 transition-all active:scale-98"
                disabled={isSubmitting}
              >← Edit</button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-2xl font-bold hover:shadow-lg disabled:opacity-50 transition-all active:scale-98 shadow-md"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "✓ Submit"}
              </button>
            </div>
          </div>
        )}

        {/* ══ CONTACT PICKER MODAL ══ */}
        {showContactModal && (
          <ContactPickerModal
            contacts={contactPicker.contacts}
            loading={contactPicker.loading}
            error={contactPicker.error}
            onPickFromDevice={contactPicker.pickFromDevice}
            onAddManual={contactPicker.addManual}
            onUpdateContact={contactPicker.updateContact}
            onRemoveContact={contactPicker.removeContact}
            onConfirm={handleConfirmContacts}
            onClose={() => { setShowContactModal(false); contactPicker.clearError(); }}
          />
        )}

        {/* ══ REGISTER: choose ══ */}
        {showRegisterChoice && !isSubmitting && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-5">
            <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold text-center text-gray-900">Create Account to Submit</h3>
              {authError && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-red-600 text-sm text-center">{authError}</p></div>}
              <button onClick={handleGoogleRegister} disabled={isSubmitting}
                className="w-full bg-red-500 text-white py-3 rounded-2xl hover:bg-red-600 font-semibold shadow-md active:scale-98 transition-all">
                <p className="text-base">Continue with Gmail</p>
                <span className="text-xs opacity-90">No password needed</span>
              </button>
              <button onClick={() => { setShowEmailForm(true); setShowRegisterChoice(false); setAuthError(""); }}
                className="w-full bg-blue-600 text-white py-3 rounded-2xl hover:bg-blue-700 font-semibold shadow-md active:scale-98 transition-all">
                Register with Email
              </button>
              <button onClick={() => { setShowRegisterChoice(false); setAuthError(""); }}
                className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-50 active:scale-98 transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ══ REGISTER: email ══ */}
        {showEmailForm && !isSubmitting && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-5">
            <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold text-center text-gray-900">Email Registration</h3>
              {authError && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-red-600 text-sm text-center">{authError}</p></div>}
              <input type="email" inputMode="email" placeholder="Email" value={regEmail}
                onChange={e => { setRegEmail(e.target.value); setAuthError(""); }}
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 text-base" />
              <input type="password" placeholder="Password (min 6 characters)" value={regPass}
                onChange={e => { setRegPass(e.target.value); setAuthError(""); }}
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 text-base" />
              <button onClick={handleEmailRegister}
                className="w-full bg-green-600 text-white py-3 rounded-2xl hover:bg-green-700 font-bold shadow-md active:scale-98 transition-all">
                Register &amp; Submit
              </button>
              <button onClick={() => { setShowEmailForm(false); setShowRegisterChoice(true); setAuthError(""); }}
                className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-50 active:scale-98 transition-all">
                Back
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .active\\:scale-98:active { transform: scale(0.98); }
        .active\\:scale-95:active { transform: scale(0.95); }
      `}</style>
    </div>
  );
}
