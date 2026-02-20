import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

import StudentSectionTitle from "../components/StudentSectionTitle";
import LoadingScreen from "../components/LoadingScreen";

import { useContactPicker } from "../hooks/useContactPicker";
import { useFamilySetup } from "../hooks/useFamilySetup";
import ContactPickerModal from "../components/contacts/ContactPickerModal";
import ConfirmedContactLabels from "../components/contacts/ConfirmedContactLabels";
import FamilyReorderList from "../components/family/FamilyReorderList";

import { submitFamilyRegistration } from "../services/studentSubmitService";

// Helpers
const englishOnly = (text) => /^[\x00-\x7F]*$/.test(text);

const validIndianMobile = (mobile) => {
  if (!mobile) return true;
  const digits = mobile.replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(digits);
};

export default function StudentFormPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [section, setSection] = useState("city");
  const [cityError, setCityError] = useState("");
  const [formError, setFormError] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactPicker = useContactPicker();
  const familySetup = useFamilySetup();

  // 🛑 Check if user already has a family
  useEffect(() => {
    const checkFamily = async () => {
      if (!user?.uid) return;

      const snap = await get(ref(db, `users/${user.uid}`));
      const famId = snap.val()?.familyId;

      if (famId) navigate("/dashboard");
    };

    checkFamily();
  }, [user, navigate]);

  useEffect(() => {
    if (user) familySetup.loadDraft();
  }, [user]);

  // STEP 1 → City
  const handleCityNext = () => {
    if (!familySetup.city.trim()) {
      setCityError("City is required");
      return;
    }
    if (!englishOnly(familySetup.city)) {
      setCityError("City must be in English only");
      return;
    }
    setCityError("");
    setSection("contacts");
    setShowContactModal(true);
  };

  // Contacts confirmed
  const handleConfirmContacts = () => {
    const confirmed = contactPicker.confirmContacts();
    if (confirmed) {
      familySetup.confirmContacts(confirmed);
      setShowContactModal(false);
    }
  };

  // Contacts → Arrange
  const goToArrange = () => {
    if (!familySetup.members.length) {
      setFormError("Please add at least one family member");
      return;
    }

    for (const m of familySetup.members) {
      if (!m.name?.trim()) {
        setFormError("All contacts must have a name");
        return;
      }
      if (!englishOnly(m.name)) {
        setFormError("Names must be in English only");
        return;
      }
      if (!validIndianMobile(m.mobile)) {
        setFormError(`Invalid mobile number for ${m.name}`);
        return;
      }
    }

    setFormError("");
    setSection("arrange");
  };

  // Submit
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!user) return alert("Please login first");

    setIsSubmitting(true);

    try {
      const result = await submitFamilyRegistration({
        city: familySetup.city.trim(),
        members: familySetup.members,
      });

      await familySetup.clearDraft();

      alert(`Family created!\nPIN: ${result.familyPin}`);

      navigate("/dashboard");
    } catch (err) {
      alert(err.message || "Submission failed");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">

      {isSubmitting && <LoadingScreen message="Saving family..." />}

      {/* STEP 1 */}
      {section === "city" && !isSubmitting && (
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <StudentSectionTitle title="Your City" />

          <input
            value={familySetup.city}
            onChange={e => { familySetup.setCity(e.target.value); setCityError(""); }}
            placeholder="Enter city name"
            className="w-full border p-3 rounded-xl"
          />

          {cityError && <p className="text-red-600">{cityError}</p>}

          <button onClick={handleCityNext}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl">
            Next: Add Members →
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {section === "contacts" && !isSubmitting && (
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <StudentSectionTitle title="Family Members" />

          {familySetup.members.length > 0 ? (
            <ConfirmedContactLabels
              contacts={familySetup.members}
              onEdit={() => setShowContactModal(true)}
            />
          ) : (
            <button onClick={() => setShowContactModal(true)}
              className="w-full border-dashed border-2 p-6 rounded-xl">
              Add Family Members
            </button>
          )}

          {formError && <p className="text-red-600">{formError}</p>}

          <div className="flex gap-2">
            <button onClick={() => setSection("city")} className="flex-1 border py-2 rounded">
              Back
            </button>
            <button onClick={goToArrange} className="flex-1 bg-indigo-600 text-white py-2 rounded">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {section === "arrange" && !isSubmitting && (
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <StudentSectionTitle title="Arrange Family Order" />

          <FamilyReorderList
            members={familySetup.members}
            onReorder={familySetup.reorderMembers}
          />

          <div className="flex gap-2">
            <button onClick={() => setSection("contacts")} className="flex-1 border py-2 rounded">
              Back
            </button>
            <button onClick={handleSubmit} className="flex-1 bg-green-600 text-white py-2 rounded">
              ✓ Submit
            </button>
          </div>
        </div>
      )}

      {/* Contact Modal */}
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

    </div>
  );
}