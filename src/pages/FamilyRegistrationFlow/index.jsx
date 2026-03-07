// pages/FamilyRegistrationFlow/index.jsx
// Orchestrates the multi-step family registration flow.
// Sub-components extracted to their own files for clarity.

import { useState, useEffect, useRef }   from "react";
import { useNavigate }                   from "react-router-dom";
import { useAuth }                       from "../../store/AuthContext";
import { registerFamily }                from "../../db/registrationDb";
import { getMobileIndex }                from "../../db/mobileIndexDb";
import { saveUserMobile }                from "../../db/userDb";
import { toFullMobile, splitMobile }     from "../../lib/phone";
import { useFamilyRegistration, STEPS }  from "../../hooks/useFamilyRegistration";
import { COLORS }                        from "../../constants/app";

import MobilePromptSheet       from "./MobilePromptSheet";
import MobileFamilyPinScreen   from "./MobileFamilyPinScreen";
import { CityPicker }          from "../../components/family/CityPicker";
import { ContactCollector }    from "../../components/family/ContactCollector";
import { ContactReorder }      from "../../components/family/ContactReorder";
import { FamilyRegistrationSuccess } from "../../components/family/FamilyRegistrationSuccess";
import LoadingOverlay          from "../../components/ui/LoadingOverlay";
import Spinner                 from "../../components/ui/Spinner";

export default function FamilyRegistrationFlow() {
  const { user, refreshUser } = useAuth();
  const navigate              = useNavigate();
  const reg                   = useFamilyRegistration(user?.uid);
  const seeded                = useRef(false);

  const [showMobilePrompt, setShowMobilePrompt] = useState(false);
  const [checking,         setChecking]         = useState(true);
  const [linkedFamily,     setLinkedFamily]     = useState(null);
  const [resolvedMobile,   setResolvedMobile]   = useState(null);
  const [forceNew,         setForceNew]         = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState("");
  const [result,           setResult]           = useState(null);

  // ── On mount: decide which flow to show ──────────────────────
  useEffect(() => {
    const check = async () => {
      const mobile = user?.mobile || "";

      if (!mobile) {
        // Google user without mobile — show prompt first
        setShowMobilePrompt(true);
        setChecking(false);
        return;
      }

      const { countryCode, digits } = splitMobile(mobile);
      const full                    = toFullMobile(countryCode, digits);
      const data                    = await getMobileIndex(full).catch(() => null);
      const familyIds               = Object.keys(data?.familyIds || {});

      if (familyIds.length > 0) {
        setLinkedFamily(familyIds[0]);
        setResolvedMobile(full);
      } else {
        seedSelfContact({ mobile: full, countryCode });
      }
      setChecking(false);
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seedSelfContact = ({ mobile = "", countryCode = "+91", digits = "" } = {}) => {
    if (seeded.current) return;
    seeded.current = true;
    reg.reset();
    const name = user?.displayName || "";
    const num  = digits || splitMobile(mobile).digits;
    const cc   = countryCode || splitMobile(mobile).countryCode || "+91";
    if (name || num) reg.addContact(name, num, cc, true);
  };

  // Google user: mobile found in index → show PIN screen
  const handleMobileFound = ({ full, countryCode, familyId }) => {
    setResolvedMobile(full);
    setLinkedFamily(familyId);
    setShowMobilePrompt(false);
  };

  // Google user: mobile NOT in index → proceed to registration
  const handleMobileNotFound = ({ full, countryCode, digits }) => {
    setShowMobilePrompt(false);
    seedSelfContact({ mobile: full, countryCode, digits });
    if (user?.uid) saveUserMobile(user.uid, full, countryCode).catch(console.error);
  };

  const handleSkip = () => {
    setShowMobilePrompt(false);
    seedSelfContact();
  };

  const handlePinSuccess = async () => {
    await refreshUser();
    navigate("/dashboard", { replace: true });
  };

  const handleSubmit = async (orderedContacts) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await registerFamily({ city: reg.city, contacts: orderedContacts, user });
      reg.onSuccess();
      await refreshUser();
      setResult(res);
    } catch (e) {
      console.error(e);
      setError(
        e.message === "ALREADY_IN_FAMILY"
          ? "You are already registered in a family."
          : e.message || "Registration failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render states ────────────────────────────────────────────
  if (checking)   return <Spinner message="Checking your profile…" />;
  if (submitting) return <LoadingOverlay message="Registering your family…" />;

  if (result) return (
    <FamilyRegistrationSuccess
      city={reg.city}
      familyPin={result.familyPin}
      memberCount={reg.contacts.length}
      onDone={() => navigate("/dashboard", { replace: true })}
    />
  );

  if (linkedFamily && !forceNew) return (
    <MobileFamilyPinScreen
      familyId={linkedFamily}
      mobile={resolvedMobile}
      user={user}
      onSuccess={handlePinSuccess}
      onRegisterNew={() => {
        setForceNew(true);
        const { countryCode, digits } = splitMobile(resolvedMobile || "");
        seedSelfContact({ mobile: resolvedMobile, countryCode, digits });
      }}
    />
  );

  return (
    <>
      {/* Mobile prompt — overlays city picker for Google users */}
      {showMobilePrompt && (
        <MobilePromptSheet
          user={user}
          onFound={handleMobileFound}
          onNotFound={handleMobileNotFound}
          onSkip={handleSkip}
        />
      )}

      {reg.step === STEPS.CITY && <CityPicker onSelect={reg.setCity} />}

      {reg.step === STEPS.CONTACTS && (
        <div>
          {error && (
            <div className="mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "#FDE8EC", color: COLORS.primary }}>
              ⚠️ {error}
            </div>
          )}
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
        </div>
      )}

      {reg.step === STEPS.REORDER && (
        <ContactReorder
          contacts={reg.contacts}
          city={reg.city}
          onReorder={reg.reorder}
          onSubmit={handleSubmit}
          onBack={reg.goBack}
          submitting={false}
        />
      )}
    </>
  );
}
