// pages/FamilyRegistrationFlow.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate }           from "react-router-dom";
import { useAuth }               from "../store/AuthContext";
import { registerFamily }        from "../db/registrationDb";
import { getMobileIndex }        from "../db/mobileIndexDb";
import { linkUserToFamily, saveUserMobile } from "../db/userDb";  
import { rtdb }                  from "../db/rtdb";
import { memberDoc }             from "../db/schema";
import { toFullMobile, splitMobile } from "../lib/phone";
import { useFamilyRegistration, STEPS } from "../hooks/useFamilyRegistration";
import { CityPicker }            from "../components/family/CityPicker";
import { ContactCollector }      from "../components/family/ContactCollector";
import { ContactReorder }        from "../components/family/ContactReorder";
import { FamilyRegistrationSuccess } from "../components/family/FamilyRegistrationSuccess";
import LoadingOverlay            from "../components/ui/LoadingOverlay";
import MobileInput               from "../components/ui/MobileInput";
import PinInput                  from "../components/ui/PinInput";
import Spinner                   from "../components/ui/Spinner";
import { COLORS }                from "../constants/app";

// ── Bottom sheet: ask Google user for their mobile number ─────────────────
function MobilePromptSheet({ user, onFound, onNotFound, onSkip }) {
  const [rawInput, setRawInput] = useState("");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState("");

  // Parse whatever the user types:
  // - 10 digits only  → assume +91
  // - 12+ digits starting with country code digits (e.g. 919974...) → prepend +
  // - starts with +   → use as-is
  const parse = (raw) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return { full: "", countryCode: "+91", localDigits: "" };
    if (digits.length === 10) {
      return { full: `+91${digits}`, countryCode: "+91", localDigits: digits };
    }
    // 11+ digits — treat first part as country code
    const full = `+${digits}`;
    const { countryCode, digits: localDigits } = splitMobile(full);
    return { full, countryCode, localDigits };
  };

  const preview = () => {
    const { full, countryCode, localDigits } = parse(rawInput);
    if (!localDigits) return null;
    return `${countryCode} ${localDigits}`;
  };

  const handleCheck = async () => {
    const { full, countryCode, localDigits } = parse(rawInput);
    if (!localDigits || localDigits.length < 10) {
      setErr("Enter a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const data = await getMobileIndex(full).catch(() => null);
      const familyIds = Object.keys(data?.familyIds || {});
      if (familyIds.length > 0) {
        onFound({ full, countryCode, familyId: familyIds[0], mxData: data });
      } else {
        onNotFound({ full, countryCode, digits: localDigits });
      }
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const previewText = preview();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-md rounded-t-3xl p-6 space-y-5"
        style={{ background: COLORS.bg }}>
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: COLORS.border }} />

        {/* User greeting */}
        <div className="flex items-center gap-3">
          {user.photoURL && (
            <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full border-2"
              style={{ borderColor: COLORS.gold }} />
          )}
          <div>
            <p className="font-bold text-sm" style={{ color: COLORS.primaryDark }}>
              Welcome, {user.displayName?.split(" ")[0] || "there"}! 🙏
            </p>
            <p className="text-xs" style={{ color: COLORS.textSecondary }}>
              Enter your mobile 
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <input
            type="tel" inputMode="numeric"
            placeholder="Mobile number"
            value={rawInput}
            onChange={e => { setRawInput(e.target.value.replace(/[^\d+]/g, "")); setErr(""); }}
            className="w-full rounded-xl px-4 py-3 outline-none"
            style={{ border: `2px solid ${err ? COLORS.error : COLORS.border}`, fontSize: 16, color: COLORS.textPrimary }}
          />
          {/* Live preview / hint */}
          {previewText && !err && (
            <p className="text-xs px-1" style={{ color: COLORS.textSecondary }}>
              Will search as: <span className="font-bold" style={{ color: COLORS.primary }}>{previewText}</span>
            </p>
          )}
          {!previewText && !err && (
            <p className="text-xs px-1" style={{ color: COLORS.textMuted }}>
              Enter 10 digits for India (+91), or include country code (e.g. 447911123456 for UK)
            </p>
          )}
          {err && <p className="text-xs px-1 font-semibold" style={{ color: COLORS.error }}>{err}</p>}
        </div>

        <button onClick={handleCheck} disabled={busy || !rawInput.trim()}
          className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white disabled:opacity-50"
          style={{ background: COLORS.primary }}>
          {busy ? "Checking…" : "Find My Family →"}
        </button>

        <button onClick={onSkip}
          className="w-full text-xs font-semibold py-1 text-center"
          style={{ color: COLORS.textMuted }}>
          Skip — I'll register a new family
        </button>
      </div>
    </div>
  );
}

// ── PIN verify screen: mobile found in an existing family ─────────────────
function MobileFamilyPinScreen({ familyId, mobile, user, onSuccess, onRegisterNew }) {
  const [pin,  setPin]  = useState("");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    if (pin.trim().length !== 4) { setErr("Enter a 4-digit PIN."); return; }
    setBusy(true);
    setErr("");
    try {
      const storedFamilyId = await rtdb.get(`familiesByPin/${pin.trim()}`);
      if (storedFamilyId !== familyId) { setErr("Incorrect PIN. Try again."); setBusy(false); return; }

      const ts = Date.now();
      const { countryCode, digits } = splitMobile(mobile || "");
      const full = mobile ? toFullMobile(countryCode, digits) : "";

      const mxData    = full ? await getMobileIndex(full) : null;
      const memberIds = Object.keys(mxData?.memberIds || {});
      let memberId    = memberIds[0] || null;

      if (!memberId) {
        memberId = `MEM_${ts}`;
        await rtdb.set(`members/${memberId}`, memberDoc({
          name:        user.displayName || user.email || "Member",
          mobile:      full,
          countryCode: countryCode || "+91",
          email:       user.email  || "",
          photoURL:    user.photoURL || "",
          isSelf:      true,
          familyId,
          createdAt:   ts,
        }));
      }

      await linkUserToFamily({
        uid:         user.uid,
        familyId,
        memberId,
        fullMobile:  full,
        countryCode: countryCode || "+91",
        email:       user.email,
        ts,
      });

      onSuccess();
    } catch (e) {
      console.error(e);
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 pt-10 flex flex-col gap-6">
      <div className="text-center space-y-2">
        <div className="text-5xl">🏠</div>
        <h2 className="text-xl font-extrabold" style={{ color: COLORS.primaryDark }}>
          Your family is already registered!
        </h2>
        <p className="text-sm" style={{ color: COLORS.textSecondary }}>
          Your mobile number is linked to an existing family.
          Enter the family PIN to join it.
        </p>
      </div>

      <PinInput value={pin} onChange={setPin} onSubmit={handleVerify} error={err} />

      <button onClick={handleVerify} disabled={busy || pin.trim().length !== 4}
        className="w-full py-4 rounded-2xl text-base font-extrabold text-white disabled:opacity-50"
        style={{ background: COLORS.primary }}>
        {busy ? "Verifying…" : "Join My Family →"}
      </button>

      <button onClick={onRegisterNew}
        className="w-full text-sm font-semibold py-2"
        style={{ color: COLORS.textMuted }}>
        This isn't my family — Register new
      </button>
    </div>
  );
}

// ── Main flow ─────────────────────────────────────────────────────────────
export default function FamilyRegistrationFlow() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const reg      = useFamilyRegistration(user?.uid);

  // showMobilePrompt: true only for Google users (no mobile in profile)
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);
  const [checking,         setChecking]         = useState(true);
  const [linkedFamily,     setLinkedFamily]     = useState(null);
  const [resolvedMobile,   setResolvedMobile]   = useState(null); // mobile after prompt
  const [forceNew,         setForceNew]         = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState("");
  const [result,           setResult]           = useState(null);
  const seeded = useRef(false);

  // ── On mount ──────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const mobile = user?.mobile || "";

      if (!mobile) {
        // Google user — show mobile prompt before anything else
        setShowMobilePrompt(true);
        setChecking(false);
        return;
      }

      // Email user with mobile — check mobileIndex directly
      const { countryCode, digits } = splitMobile(mobile);
      const full = toFullMobile(countryCode, digits);
      const data = await getMobileIndex(full).catch(() => null);
      const familyIds = Object.keys(data?.familyIds || {});

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
    if (name || num) {
      reg.addContact(name, num, cc, true);
    }
  };

  // Called when Google user submits mobile and it IS in mobileIndex
  const handleMobileFound = ({ full, countryCode, familyId }) => {
    setResolvedMobile(full);
    setLinkedFamily(familyId);
    setShowMobilePrompt(false);
  };

  // Called when Google user submits mobile and it is NOT in mobileIndex
  const handleMobileNotFound = ({ full, countryCode, digits }) => {
    setShowMobilePrompt(false);
    seedSelfContact({ mobile: full, countryCode, digits });
    // Persist mobile to RTDB user node so prompt doesn't show again next login
    if (user?.uid) saveUserMobile(user.uid, full, countryCode).catch(console.error);
  };

  // Google user skips mobile prompt entirely
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
      setSubmitting(false);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
      if (e.message === "ALREADY_IN_FAMILY")
        setError("You are already registered in a family.");
      else
        setError(e.message || "Registration failed. Please try again.");
    }
  };

  // ── Render ────────────────────────────────────────────────────
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
      {/* Mobile prompt sheet — overlays the city picker for Google users */}
      {showMobilePrompt && (
        <MobilePromptSheet
          user={user}
          onFound={handleMobileFound}
          onNotFound={handleMobileNotFound}
          onSkip={handleSkip}
        />
      )}

      {reg.step === STEPS.CITY && <CityPicker onSelect={reg.setCity} />}

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

      {reg.step === STEPS.CONTACTS && (
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
      )}
    </>
  );
}