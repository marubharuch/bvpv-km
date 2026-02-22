// src/pages/FamilyRegistrationFlow.jsx

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";   // ✅ ADD
import { useFamilyRegistration, STEPS } from "../hooks/useFamilyRegistration";
import { CityPicker } from "../components/family/CityPicker";
import { ContactCollector } from "../components/family/ContactCollector";
import { ContactReorder } from "../components/family/ContactReorder";
import { FamilyRegistrationSuccess } from "../components/family/FamilyRegistrationSuccess";
import { submitFamilyRegistration } from "../services/familyRegistrationService";

const STEP_PCT = {
  [STEPS.CITY]: 33,
  [STEPS.CONTACTS]: 66,
  [STEPS.REORDER]: 100,
};

export default function FamilyRegistrationFlow({  onDone }) {
   const navigate = useNavigate(); // ✅ ADD
    const { user, isLoading } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);
  const [result, setResult] = useState(null);

  const reg = useFamilyRegistration();

  // ✅ REDIRECT IF NO USER
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

if (isLoading) return <div>Loading...</div>;   // wait for auth

  async function handleSubmit(orderedContacts) {
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const res = await submitFamilyRegistration({
        city: reg.city,
        contacts: orderedContacts,
        user,
      });
      setResult(res);
      reg.onSuccess();
    } catch (e) {
      console.error("Family registration error:", e);
      setSubmitErr(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Optional: don't render anything while redirecting
  if (!user) return null;

  return (
    <div className="fixed inset-0 top-16 z-50 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm">
     
      <div className="bg-white w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">

        {!result && reg.step !== STEPS.SUCCESS && (
          <div className="h-1 bg-gray-100 rounded-t-3xl overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${STEP_PCT[reg.step] ?? 100}%` }}
            />
          </div>
        )}

        {result && (
          <FamilyRegistrationSuccess
            city={reg.city}
            contacts={reg.contacts}
            familyId={result.familyId}
            familyPin={result.familyPin}
            onDone={onDone}
          />
        )}

        {!result && reg.step === STEPS.CITY && (
          <CityPicker onSelect={reg.setCity} />
        )}

        {!result && reg.step === STEPS.CONTACTS && (
          <ContactCollector
            city={reg.city}
            contacts={reg.contacts}
            onAdd={reg.addContact}
            onAddMany={reg.addContacts}
            onUpdate={reg.updateContact}
            onRemove={reg.removeContact}
            onConfirm={reg.goToReorder}
            onBack={reg.goBack}
          />
        )}

        {!result && reg.step === STEPS.REORDER && (
          <>
            {submitErr && (
              <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                ⚠️ {submitErr}
              </div>
            )}
            <ContactReorder
              contacts={reg.contacts}
              city={reg.city}
              onReorder={reg.reorder}
              onSubmit={handleSubmit}
              onBack={reg.goBack}
              submitting={submitting}
            />
          </>
        )}
      </div>
    </div>
  );
}