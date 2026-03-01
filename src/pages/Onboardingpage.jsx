/**
 * pages/OnboardingPage.jsx
 * New user flow after login when no familyId exists:
 * 1. Get mobile from RTDB → or user.phoneNumber → or ask user
 * 2. Check mobileIndex/{mobile}
 * 3a. Found with familyId → show family summary + PIN entry → link
 * 3b. Not found → go to /registration
 */

import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { checkMobileIndex, registerMobileForUser } from "../services/mobileIndexService";
import { linkUserToFamily } from "../services/userService";
import Card from "../components/ui/Card";
import Spinner from "../components/ui/Spinner";
import MobileInput from "../components/ui/MobileInput";
import PinInput from "../components/ui/PinInput";
import { normalizeMobile } from "../utils/normalizePhone";

const STAGE = {
  LOADING:      "loading",
  ASK_MOBILE:   "ask_mobile",
  CHECKING:     "checking",
  FAMILY_FOUND: "family_found",
  LINKING:      "linking",
  NOT_FOUND:    "not_found",
};

export default function OnboardingPage() {
  const { user } = useContext(AuthContext);
  const navigate  = useNavigate();

  const [stage,       setStage]       = useState(STAGE.LOADING);
  const [mobile,      setMobile]      = useState("");
  const [mobileInput, setMobileInput] = useState("");
  const [ccInput,     setCcInput]     = useState("+91");
  const [family,      setFamily]      = useState(null);
  const [familyId,    setFamilyId]    = useState(null);
  const [memberId,    setMemberId]    = useState(null);
  const [headName,    setHeadName]    = useState("");
  const [pin,         setPin]         = useState("");
  const [pinError,    setPinError]    = useState("");
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!user?.uid) { navigate("/login", { replace: true }); return; }
    if (user.familyId) { navigate("/dashboard", { replace: true }); return; }

    const init = async () => {
      try {
        const snap     = await get(ref(db, `users/${user.uid}`));
        const userData = snap.exists() ? snap.val() : {};

        if (userData.familyId) { navigate("/dashboard", { replace: true }); return; }

        const mob = normalizeMobile(userData.mobile) || normalizeMobile(user.phoneNumber) || "";
        if (mob) { setMobile(mob); await checkMob(mob); }
        else setStage(STAGE.ASK_MOBILE);
      } catch (e) {
        console.error("Onboarding init error:", e);
        setError("Something went wrong. Please try again.");
        setStage(STAGE.ASK_MOBILE);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const checkMob = async (mob) => {
    setStage(STAGE.CHECKING);
    setError("");
    try {
      const indexData = await checkMobileIndex(mob);
      if (!indexData) { setStage(STAGE.NOT_FOUND); return; }

      const fid = indexData.familyId ||
        (indexData.familyIds ? Object.keys(indexData.familyIds)[0] : null);
      if (!fid) { setStage(STAGE.NOT_FOUND); return; }

      const famSnap = await get(ref(db, `families/${fid}`));
      if (!famSnap.exists()) { setStage(STAGE.NOT_FOUND); return; }

      const famData = famSnap.val();
      const mid     = indexData.memberIds ? Object.keys(indexData.memberIds)[0] : null;

      let hName = "";
      if (famData.headMemberId) {
        const headSnap = await get(ref(db, `members/${famData.headMemberId}`));
        if (headSnap.exists()) hName = headSnap.val().name || "";
      }

      setFamily(famData);
      setFamilyId(fid);
      setMemberId(mid);
      setHeadName(hName);
      setStage(STAGE.FAMILY_FOUND);
    } catch (e) {
      console.error("mobileIndex check error:", e);
      setError("Could not check your mobile. Please try again.");
      setStage(STAGE.ASK_MOBILE);
    }
  };

  const handleMobileSubmit = async () => {
    const digits = mobileInput.trim().replace(/\D/g, "").slice(-10);
    if (digits.length < 10) { setError("Enter a valid 10-digit mobile number."); return; }
    const fullMobile = `${ccInput}${digits}`;
    setMobile(digits);

    try {
      await registerMobileForUser(digits, user.uid);
      await get(ref(db, `users/${user.uid}/mobile`)); // touch to update
      // Save mobile to user node
      const { batchWrite } = await import("../services/rtdbService");
      await batchWrite({ [`users/${user.uid}/mobile`]: fullMobile });
    } catch (e) {
      console.error("Mobile save error:", e);
    }

    await checkMob(digits);
  };

  const handlePinSubmit = async () => {
    setPinError("");
    if (!pin.trim()) { setPinError("Enter the family PIN."); return; }
    if (String(family.familyPin) !== pin.trim()) { setPinError("Incorrect PIN. Please try again."); return; }

    setStage(STAGE.LINKING);
    try {
      await linkUserToFamily({
        uid:      user.uid,
        familyId,
        memberId,
        mobile,
        email:    user.email,
      });
      navigate("/dashboard", { replace: true });
    } catch (e) {
      console.error("Link family error:", e);
      setPinError("Something went wrong. Please try again.");
      setStage(STAGE.FAMILY_FOUND);
    }
  };

  // Loading / Checking / Linking
  if ([STAGE.LOADING, STAGE.CHECKING, STAGE.LINKING].includes(stage)) {
    const msg = stage === STAGE.LOADING  ? "Setting up your account..." :
                stage === STAGE.CHECKING ? "Looking up your family..."  :
                                           "Linking you to your family...";
    return <Spinner message={msg} />;
  }

  if (stage === STAGE.NOT_FOUND) {
    return (
      <Card>
        <div className="text-center py-4 space-y-4">
          <div className="text-5xl">🏠</div>
          <h2 className="text-lg font-bold" style={{ color: "#5A1020" }}>No Family Found</h2>
          <p className="text-sm" style={{ color: "#9B6060" }}>
            Your mobile number is not linked to any family yet.
          </p>
          <button onClick={() => navigate("/registration")}
            className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: "#7B1C2E" }}>
            Register My Family →
          </button>
          <button onClick={() => setStage(STAGE.ASK_MOBILE)}
            className="w-full py-2 rounded-xl text-sm font-semibold border-2"
            style={{ borderColor: "#f0e6e6", color: "#7B1C2E" }}>
            Try Different Mobile
          </button>
        </div>
      </Card>
    );
  }

  if (stage === STAGE.ASK_MOBILE) {
    return (
      <Card>
        <div className="text-center space-y-1 pb-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-3"
            style={{ background: "#FDE8EC" }}>📱</div>
          <h2 className="text-xl font-bold" style={{ color: "#5A1020" }}>Enter Your Mobile</h2>
          <p className="text-sm" style={{ color: "#9B6060" }}>We'll use this to find your family</p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-xs font-semibold"
            style={{ background: "#FDE8EC", color: "#7B1C2E" }}>⚠️ {error}</div>
        )}

        <MobileInput
          countryCode={ccInput}
          onCountryCodeChange={setCcInput}
          number={mobileInput}
          onNumberChange={setMobileInput}
        />

        <button onClick={handleMobileSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "#7B1C2E" }}>
          Find My Family →
        </button>

        <div className="text-center">
          <button onClick={() => navigate("/registration")}
            className="text-xs" style={{ color: "#C9A84C" }}>
            Skip — Register a new family instead
          </button>
        </div>
      </Card>
    );
  }

  if (stage === STAGE.FAMILY_FOUND) {
    const memberCount = Object.keys(family?.members || {}).length;
    return (
      <Card>
        <div className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: "linear-gradient(135deg,#FDF0D0,#FDE8EC)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: "#7B1C2E", color: "#F0D080" }}>🏠</div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#C9A84C" }}>Family Found! ✅</p>
            <p className="text-base font-bold" style={{ color: "#5A1020" }}>
              {headName ? `${headName}'s Family` : "Your Family"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: "City",    value: family?.city    || "—" },
            { label: "Members", value: `${memberCount} member${memberCount !== 1 ? "s" : ""}` },
            { label: "PIN",     value: "****" },
          ].map(row => (
            <div key={row.label} className="flex justify-between py-2 border-b" style={{ borderColor: "#f0e6e6" }}>
              <span className="text-xs" style={{ color: "#9B6060" }}>{row.label}</span>
              <span className="text-xs font-semibold" style={{ color: "#3D0010" }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#7B1C2E" }}>Enter Family PIN to join</p>
          <PinInput value={pin} onChange={v => { setPin(v); setPinError(""); }} onSubmit={handlePinSubmit} error={pinError} />
        </div>

        <button onClick={handlePinSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white" style={{ background: "#7B1C2E" }}>
          Join Family ✓
        </button>

        <div className="flex gap-3">
          <button onClick={() => setStage(STAGE.ASK_MOBILE)}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border-2"
            style={{ borderColor: "#f0e6e6", color: "#9B6060" }}>← Different Mobile</button>
          <button onClick={() => navigate("/registration")}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border-2"
            style={{ borderColor: "#f0e6e6", color: "#9B6060" }}>Not My Family</button>
        </div>
      </Card>
    );
  }

  return null;
}
