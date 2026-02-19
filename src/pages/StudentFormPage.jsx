import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";

import StudentSectionTitle from "../components/StudentSectionTitle";
import LoadingScreen from "../components/LoadingScreen";

import { useContactPicker } from "../hooks/useContactPicker";
import { useFamilySetup } from "../hooks/useFamilySetup";
import ContactPickerModal from "../components/contacts/ContactPickerModal";
import ConfirmedContactLabels from "../components/contacts/ConfirmedContactLabels";
import FamilyReorderList from "../components/family/FamilyReorderList";

import { submitFamilyRegistration } from "../services/studentSubmitService";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const englishOnly = (text) => /^[\x00-\x7F]*$/.test(text);

const validIndianMobile = (mobile) => {
  if (!mobile) return true; // optional
  const digits = mobile.replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(digits);
};

// ─────────────────────────────────────────────────────────────
// RegisterModal — only shown if user not logged in at submit
// ─────────────────────────────────────────────────────────────
function RegisterModal({ onSuccess, onClose }) {
  const [mode, setMode]         = useState("choose"); // "choose" | "email"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      onSuccess();
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address."); return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err) {
      if (err.code === "auth/email-already-in-use")
        setError("Email already registered. Please log in.");
      else if (err.code === "auth/weak-password")
        setError("Password too weak. Use at least 6 characters.");
      else
        setError("Registration failed: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-5">
      <div className="bg-white p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
        <h3 className="text-xl font-bold text-center">Create Account to Submit</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        {mode === "choose" && (
          <>
            <button onClick={handleGoogle} disabled={loading}
              className="w-full bg-red-500 text-white py-3 rounded-2xl font-semibold disabled:opacity-50">
              <p>Continue with Gmail</p>
              <span className="text-xs opacity-80">No password needed</span>
            </button>
            <button onClick={() => setMode("email")} disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-2xl font-semibold disabled:opacity-50">
              Register with Email
            </button>
            <button onClick={onClose}
              className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold">
              Cancel
            </button>
          </>
        )}

        {mode === "email" && (
          <>
            <input type="email" inputMode="email" placeholder="Email" value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 text-base" />
            <input type="password" placeholder="Password (min 6 chars)" value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 text-base" />
            <button onClick={handleEmail} disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-2xl font-bold disabled:opacity-50">
              {loading ? "Creating account..." : "Register & Submit"}
            </button>
            <button onClick={() => { setMode("choose"); setError(""); }}
              className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold">
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function StudentFormPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // FIX 2: start on "city", not "contacts"
  const [section, setSection]     = useState("city");
  const [cityError, setCityError] = useState("");
  const [formError, setFormError] = useState("");

  const contactPicker = useContactPicker();
  const familySetup   = useFamilySetup();

  const [showContactModal, setShowContactModal]   = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isSubmitting, setIsSubmitting]           = useState(false);

  useEffect(() => { familySetup.loadDraft(); }, []);

  // ── STEP 1: City validated → move to contacts then open modal
  const handleCityNext = () => {
    if (!familySetup.city.trim()) {
      setCityError("City is required"); return;
    }
    if (!englishOnly(familySetup.city)) {
      setCityError("City must be in English only"); return;
    }
    setCityError("");
    // FIX 2: section changes first, then modal opens
    // User now has a back button if they close modal
    setSection("contacts");
    setShowContactModal(true);
  };

  // ── Contacts confirmed in modal
  const handleConfirmContacts = () => {
    const confirmed = contactPicker.confirmContacts();
    if (confirmed) {
      familySetup.confirmContacts(confirmed);
      setShowContactModal(false);
      // already on "contacts" section — stay here so user sees the list
    }
  };

  // ── Contacts → Arrange (with validation)
  const goToArrange = () => {
    if (!familySetup.members.length) {
      setFormError("Please add at least one family member"); return;
    }
    for (const m of familySetup.members) {
      if (!m.name?.trim()) {
        setFormError("All contacts must have a name"); return;
      }
      // FIX 1: sanitizeName removed — it was defined but never used
      if (!englishOnly(m.name)) {
        setFormError("Names must be in English only"); return;
      }
      if (!validIndianMobile(m.mobile)) {
        setFormError(`Invalid mobile number for ${m.name}`); return;
      }
    }
    setFormError("");
    setSection("arrange");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit (with auth gate)
  const handleSubmit = () => {
    // FIX 3: check auth before submitting
    if (!user) { setShowRegisterModal(true); return; }
    doSubmit();
  };

  const doSubmit = async () => {
    setShowRegisterModal(false);
    setIsSubmitting(true);
    try {
      await submitFamilyRegistration({
        city:    familySetup.city,
        members: familySetup.members,
      });
      await familySetup.clearDraft();
      navigate("/dashboard");
    } catch (err) {
      alert(err.message || "Submission failed");
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      {isSubmitting && <LoadingScreen message="Saving family..." />}

      {/* ── STEP 1: City ── */}
      {section === "city" && !isSubmitting && (
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <StudentSectionTitle title="Your City" />

          <input
            type="text"
            inputMode="text"
            autoComplete="address-level2"
            value={familySetup.city}
            onChange={e => { familySetup.setCity(e.target.value); setCityError(""); }}
            placeholder="Enter city name (English only)"
            className="w-full border-2 border-gray-300 p-3 rounded-xl focus:border-indigo-500 focus:outline-none text-base"
          />

          {cityError && <p className="text-red-600 text-sm font-medium">⚠ {cityError}</p>}

          <button
            onClick={handleCityNext}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all active:scale-95"
          >
            Next: Add Family Members →
          </button>
        </div>
      )}

      {/* ── STEP 2: Contacts ── */}
      {section === "contacts" && !isSubmitting && (
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <StudentSectionTitle title="Family Members" />

          {familySetup.members.length > 0 ? (
            <ConfirmedContactLabels
              contacts={familySetup.members}
              onEdit={() => setShowContactModal(true)}
            />
          ) : (
            <button
              onClick={() => setShowContactModal(true)}
              className="w-full border-dashed border-2 border-gray-300 p-6 rounded-xl text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all"
            >
              <p className="text-2xl mb-1">👨‍👩‍👧</p>
              <p className="text-sm font-semibold text-gray-700">Add Family Members</p>
              <p className="text-xs text-gray-400 mt-1">Pick from phone or add manually</p>
            </button>
          )}

          {formError && <p className="text-red-600 text-sm font-medium">⚠ {formError}</p>}

          <div className="flex gap-2">
            <button onClick={() => setSection("city")}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all">
              ← Back
            </button>
            <button onClick={goToArrange}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all">
              Next: Arrange →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Arrange ── */}
      {section === "arrange" && !isSubmitting && (
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <StudentSectionTitle title="Arrange Family Order" />

          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-800 font-medium">
              🔢 Drag to set order — Head of family first
            </p>
          </div>

          {/* FIX 4: no onToggleStudent prop — student classification is in dashboard */}
          <FamilyReorderList
            members={familySetup.members}
            onReorder={familySetup.reorderMembers}
          />

          <div className="flex gap-2">
            <button onClick={() => setSection("contacts")}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all">
              ← Back
            </button>
            <button onClick={handleSubmit}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-all">
              ✓ Submit
            </button>
          </div>
        </div>
      )}

      {/* ── Contact Picker Modal ── */}
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
          onClose={() => setShowContactModal(false)}
        />
      )}

      {/* ── Register Modal ── */}
      {showRegisterModal && (
        <RegisterModal
          onSuccess={doSubmit}
          onClose={() => setShowRegisterModal(false)}
        />
      )}
    </div>
  );
}
