// pages/FamilyRegistrationFlow.jsx
import { useState }    from "react";
import { useNavigate } from "react-router-dom";
import { useAuth }     from "../store/AuthContext";
import { registerFamily } from "../db/registrationDb";
import { useFamilyRegistration, STEPS } from "../hooks/useFamilyRegistration";
import { CityPicker }   from "../components/family/CityPicker";
import { ContactCollector } from "../components/family/ContactCollector";
import { ContactReorder }   from "../components/family/ContactReorder";
import { FamilyRegistrationSuccess } from "../components/family/FamilyRegistrationSuccess";
import LoadingOverlay   from "../components/ui/LoadingOverlay";

export default function FamilyRegistrationFlow() {
  const { user, refreshUser } = useAuth();
  const navigate   = useNavigate();
  const reg        = useFamilyRegistration();

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [result,     setResult]     = useState(null);

  const handleSubmit = async (orderedContacts) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await registerFamily({ city: reg.city, contacts: orderedContacts, user });
      reg.onSuccess();
      // Update AuthContext so user.familyId is truthy → BottomNavbar switches instantly
      await refreshUser();
      setResult(res);
      // ✅ setSubmitting(false) here — loading screen closes, success screen shows
      setSubmitting(false);
    } catch (e) {
      console.error(e);
      setSubmitting(false); // ✅ always close loading on error too
      if (e.message === "ALREADY_IN_FAMILY")
        setError("You are already registered in a family.");
      else
        setError(e.message || "Registration failed. Please try again.");
    }
  };

  // ── Show loading overlay ───────────────────────────────────────
  if (submitting) return <LoadingOverlay message="Registering your family…" />;

  // ── Show success screen ───────────────────────────────────────
  if (result) return (
    <FamilyRegistrationSuccess
      city={reg.city}
      familyPin={result.familyPin}
      memberCount={reg.contacts.length}
      onDone={() => navigate("/dashboard", { replace: true })}
    />
  );

  // ── Step: City picker ─────────────────────────────────────────
  if (reg.step === STEPS.CITY) return <CityPicker onSelect={reg.setCity} />;

  // ── Step: Reorder ─────────────────────────────────────────────
  if (reg.step === STEPS.REORDER) return (
    <ContactReorder
      contacts={reg.contacts}
      city={reg.city}
      onReorder={reg.reorder}
      onSubmit={handleSubmit}
      onBack={reg.goBack}
      submitting={false}
    />
  );

  // ── Step: Add contacts ────────────────────────────────────────
  return (
    <div>
      {error && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "#FDE8EC", color: "#7B1C2E" }}>
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
  );
}