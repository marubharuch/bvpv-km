import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { useFamilyRegistration, STEPS } from "../hooks/useFamilyRegistration";
import { CityPicker } from "../components/family/CityPicker";
import { ContactCollector } from "../components/family/ContactCollector";
import { ContactReorder } from "../components/family/ContactReorder";
import { FamilyRegistrationSuccess } from "../components/family/FamilyRegistrationSuccess";
import { submitFamilyRegistration } from "../services/familyRegistrationService";
import ProgressBar from "../components/ui/ProgressBar";
import ErrorBanner from "../components/ui/ErrorBanner";

const STEP_PCT = {
  [STEPS.CITY]:     33,
  [STEPS.CONTACTS]: 66,
  [STEPS.REORDER]:  100,
};

export default function FamilyRegistrationFlow({ onDone }) {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [submitting,           setSubmitting]           = useState(false);
  const [submitErr,            setSubmitErr]            = useState(null);
  const [result,               setResult]               = useState(null);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [alreadyRegistered,    setAlreadyRegistered]    = useState(false);

  const reg = useFamilyRegistration();

  useEffect(() => {
    if (!isLoading && !user) navigate("/login", { replace: true });
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    get(ref(db, `users/${user.uid}`))
      .then(snap => { if (snap.exists() && snap.val()?.familyId) setAlreadyRegistered(true); })
      .catch(e => console.error("Registration check failed:", e))
      .finally(() => setCheckingRegistration(false));
  }, [user]);
  // Pre-seed the user's own contact as the first entry (only if no draft exists)
useEffect(() => {
  if (!user?.uid || reg.contacts.length > 0) return;

  get(ref(db, `users/${user.uid}/mobile`))
    .then(snap => {
      const mobile = snap.val() || "";
      const name   = user.displayName || "";
      if (mobile || name) {
        reg.addContacts([{ name, phone: mobile, isSelf: true }]);
      }
    })
    .catch(() => {});
}, [user?.uid, reg.contacts.length]);// eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || checkingRegistration) return <div>Loading...</div>;
  if (!user) return null;

  async function handleSubmit(orderedContacts) {
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const res = await submitFamilyRegistration({ city: reg.city, contacts: orderedContacts, user });
      setResult(res);
      reg.onSuccess();
    } catch (e) {
      console.error("Family registration error:", e);
      setSubmitErr(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack()  { setSubmitErr(null); reg.goBack(); }
  function handleClose() {
    if (submitting) return;
    onDone ? onDone() : navigate("/onboarding", { replace: true });
  }

  if (alreadyRegistered) {
    return (
      <div className="fixed inset-0 top-16 z-50 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 text-center">
          <div className="text-4xl mb-3">🏠</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Already Registered</h2>
          <p className="text-sm text-gray-500 mb-6">Your family is already registered.</p>
          <button onClick={() => navigate("/dashboard", { replace: true })}
            className="w-full bg-green-600 text-white py-2 rounded-xl font-semibold">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 z-50 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">

        {!result && (
          <div className="flex justify-end px-4 pt-4">
            <button onClick={handleClose} disabled={submitting}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-40 text-xl font-bold leading-none">✕</button>
          </div>
        )}

        {!result && reg.step !== STEPS.SUCCESS && (
          <ProgressBar pct={STEP_PCT[reg.step] ?? 100} className="rounded-t-3xl" />
        )}

        {result && (
          <FamilyRegistrationSuccess
            city={reg.city} contacts={reg.contacts}
            familyId={result.familyId} familyPin={result.familyPin} onDone={onDone}
          />
        )}

        {!result && reg.step === STEPS.CITY && <CityPicker onSelect={reg.setCity} />}

        {!result && reg.step === STEPS.CONTACTS && (
          <ContactCollector
            city={reg.city} contacts={reg.contacts}
            onAdd={reg.addContact} onAddMany={reg.addContacts}
            onUpdate={reg.updateContact} onRemove={reg.removeContact}
            onConfirm={reg.goToReorder} onBack={handleBack}
          />
        )}

        {!result && reg.step === STEPS.REORDER && (
          <>
            <ErrorBanner message={submitErr} />
            <ContactReorder
              contacts={reg.contacts} city={reg.city}
              onReorder={reg.reorder} onSubmit={handleSubmit}
              onBack={handleBack} submitting={submitting}
            />
          </>
        )}
      </div>
    </div>
  );
}
