/**
 * OnboardingPage.jsx
 * ─────────────────────────────────────────────────────────────────
 * Handles new user flow after login when no familyId exists:
 *
 * 1. Get mobile from RTDB → or user.phoneNumber → or ask user
 * 2. Check mobileIndex/{mobile}
 * 3a. Found with familyId → show family summary + PIN entry → link
 * 3b. Not found → go to /registration
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { batchWrite } from "../services/rtdbService";

// ── helpers ──────────────────────────────────────────────────────
function normMobile(m) {
  if (!m) return "";
  return String(m).replace(/\D/g, "").slice(-10);
}

// ─────────────────────────────────────────────
// STAGES
// ─────────────────────────────────────────────
const STAGE = {
  LOADING:        "loading",        // initial — fetching user RTDB data
  ASK_MOBILE:     "ask_mobile",     // no mobile found — ask user
  CHECKING:       "checking",       // checking mobileIndex
  FAMILY_FOUND:   "family_found",   // family found — show summary + PIN
  LINKING:        "linking",        // writing to Firebase
  NOT_FOUND:      "not_found",      // mobile not in mobileIndex
};

// ─────────────────────────────────────────────
// UI PIECES
// ─────────────────────────────────────────────
function Card({ children }) {
  return (
    <div className="min-h-screen flex items-start justify-center pt-8 px-4"
      style={{ background: "#FDF6EC" }}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(90,16,32,0.15)" }}>
        {/* Gold top bar */}
        <div className="h-1 w-full" style={{ background: "#C9A84C" }} />
        <div className="bg-white p-6 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Spinner({ message }) {
  return (
    <Card>
      <div className="flex flex-col items-center py-8 gap-4">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#7B1C2E", borderTopColor: "transparent" }} />
        <p className="text-sm font-medium" style={{ color: "#7B1C2E" }}>{message}</p>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export default function OnboardingPage() {
  const { user } = useContext(AuthContext);
  const navigate  = useNavigate();

  const [stage,       setStage]       = useState(STAGE.LOADING);
  const [mobile,      setMobile]      = useState("");       // normalized 10-digit
  const [mobileInput, setMobileInput] = useState("");       // raw user input
  const [ccInput,     setCcInput]     = useState("+91");    // country code input
  const [family,      setFamily]      = useState(null);     // family data
  const [familyId,    setFamilyId]    = useState(null);
  const [memberId,    setMemberId]    = useState(null);
  const [headName,    setHeadName]    = useState("");
  const [pin,         setPin]         = useState("");
  const [pinError,    setPinError]    = useState("");
  const [error,       setError]       = useState("");

  // ── 1. On mount — fetch user RTDB node, extract mobile ──────────
  useEffect(() => {
    if (!user?.uid) { navigate("/login", { replace: true }); return; }

    // If already has familyId (race condition) → dashboard
    if (user.familyId) { navigate("/dashboard", { replace: true }); return; }

    const init = async () => {
      try {
        // Fresh fetch — profile cache might be stale
        const snap = await get(ref(db, `users/${user.uid}`));
        const userData = snap.exists() ? snap.val() : {};

        // Already has family in DB (cache might have been stale)
        if (userData.familyId) {
          navigate("/dashboard", { replace: true });
          return;
        }

        // Get mobile: RTDB → Google phoneNumber → ask
        const mob =
          normMobile(userData.mobile) ||
          normMobile(user.phoneNumber) ||
          "";

        if (mob) {
          setMobile(mob);
          await checkMobileIndex(mob);
        } else {
          setStage(STAGE.ASK_MOBILE);
        }
      } catch (e) {
        console.error("Onboarding init error:", e);
        setError("Something went wrong. Please try again.");
        setStage(STAGE.ASK_MOBILE);
      }
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── 2. Check mobileIndex ────────────────────────────────────────
  const checkMobileIndex = async (mob) => {
    setStage(STAGE.CHECKING);
    setError("");
    try {
      const snap = await get(ref(db, `mobileIndex/${mob}`));

      if (!snap.exists()) {
        // Mobile not in index → go to registration
        setStage(STAGE.NOT_FOUND);
        return;
      }

      const indexData = snap.val();
      const fid = indexData.familyId ||
        (indexData.familyIds ? Object.keys(indexData.familyIds)[0] : null);

      if (!fid) {
        // Mobile in index but no familyId → go to registration
        setStage(STAGE.NOT_FOUND);
        return;
      }

      // Fetch family data
      const famSnap   = await get(ref(db, `families/${fid}`));
      if (!famSnap.exists()) { setStage(STAGE.NOT_FOUND); return; }

      const famData   = famSnap.val();

      // Get member id for this mobile
      const mid = indexData.memberIds
        ? Object.keys(indexData.memberIds)[0]
        : null;

      // Get head member name
      let hName = "";
      const headMid = famData.headMemberId;
      if (headMid) {
        const headSnap = await get(ref(db, `members/${headMid}`));
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

  // ── 3. Handle mobile submit from ASK_MOBILE ─────────────────────
  const handleMobileSubmit = async () => {
    const digits = mobileInput.trim().replace(/\D/g, "").slice(-10);
    if (digits.length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    const fullMobile = `${ccInput}${digits}`;
    setMobile(digits);

    // Save mobile to user node so next login skips this step
    try {
      await batchWrite({
        [`users/${user.uid}/mobile`]: fullMobile,
        [`mobileIndex/${digits}/isUser`]:  true,
        [`mobileIndex/${digits}/userUid`]: user.uid,
      });
    } catch (e) {
      console.error("Mobile save error:", e);
    }

    await checkMobileIndex(digits);
  };

  // ── 4. Verify PIN and link user to family ───────────────────────
  const handlePinSubmit = async () => {
    setPinError("");
    if (!pin.trim()) { setPinError("Enter the family PIN."); return; }

    if (String(family.familyPin) !== pin.trim()) {
      setPinError("Incorrect PIN. Please try again.");
      return;
    }

    setStage(STAGE.LINKING);

    try {
      const ts  = Date.now();
      const uid = user.uid;
      const writes = {};

      // User node
      writes[`users/${uid}/familyId`] = familyId;
      writes[`users/${uid}/role`]     = "member";
      writes[`users/${uid}/status`]   = "active";
      if (memberId) writes[`users/${uid}/memberId`] = memberId;

      // Family presence map
      if (memberId) {
        writes[`families/${familyId}/members/${memberId}`] = true;
      }

      // Member node — update with uid, email if we have memberId
      if (memberId) {
        writes[`members/${memberId}/linkedUid`]   = uid;
        writes[`members/${memberId}/email`]       = user.email || "";
        writes[`members/${memberId}/updatedAt`]   = ts;
      }

      // Email index
      if (user.email) {
        const emailKey = user.email
          .toLowerCase()
          .replace(/\./g, ",")
          .replace(/@/g, "_");
        writes[`usersByEmail/${emailKey}`] = uid;
      }

      // mobileIndex — mark as registered user
      if (mobile) {
        writes[`mobileIndex/${mobile}/isUser`]  = true;
        writes[`mobileIndex/${mobile}/userUid`] = uid;
      }

      await batchWrite(writes);
      navigate("/dashboard", { replace: true });

    } catch (e) {
      console.error("Link family error:", e);
      setPinError("Something went wrong. Please try again.");
      setStage(STAGE.FAMILY_FOUND);
    }
  };

  // ── RENDER ───────────────────────────────────────────────────────

  // Loading / Checking / Linking
  if (stage === STAGE.LOADING || stage === STAGE.CHECKING || stage === STAGE.LINKING) {
    const msg =
      stage === STAGE.LOADING  ? "Setting up your account..." :
      stage === STAGE.CHECKING ? "Looking up your family..."  :
                                  "Linking you to your family...";
    return <Spinner message={msg} />;
  }

  // Not found → redirect to registration
  if (stage === STAGE.NOT_FOUND) {
    return (
      <Card>
        <div className="text-center py-4 space-y-4">
          <div className="text-5xl">🏠</div>
          <h2 className="text-lg font-bold" style={{ color: "#5A1020" }}>
            No Family Found
          </h2>
          <p className="text-sm" style={{ color: "#9B6060" }}>
            Your mobile number is not linked to any family yet.
            Register your family to get started.
          </p>
          <button
            onClick={() => navigate("/registration")}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: "#7B1C2E" }}
          >
            Register My Family →
          </button>
          <button
            onClick={() => setStage(STAGE.ASK_MOBILE)}
            className="w-full py-2 rounded-xl text-sm font-semibold border-2"
            style={{ borderColor: "#f0e6e6", color: "#7B1C2E" }}
          >
            Try Different Mobile
          </button>
        </div>
      </Card>
    );
  }

  // Ask mobile
  if (stage === STAGE.ASK_MOBILE) {
    return (
      <Card>
        {/* Header */}
        <div className="text-center space-y-1 pb-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-3"
            style={{ background: "#FDE8EC" }}>
            📱
          </div>
          <h2 className="text-xl font-bold" style={{ color: "#5A1020" }}>
            Enter Your Mobile
          </h2>
          <p className="text-sm" style={{ color: "#9B6060" }}>
            We'll use this to find your family
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-xs font-semibold"
            style={{ background: "#FDE8EC", color: "#7B1C2E" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Mobile input */}
        <div className="flex gap-2">
          <input
            type="tel"
            value={ccInput}
            onChange={e => {
              let v = e.target.value;
              if (!v.startsWith("+")) v = "+" + v.replace(/\+/g, "");
              setCcInput(v);
            }}
            maxLength={5}
            className="w-20 rounded-xl px-3 py-3 text-center text-sm outline-none"
            style={{ border: "2px solid #f0e6e6", fontSize: 16 }}
            placeholder="+91"
          />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Mobile number"
            value={mobileInput}
            onChange={e => setMobileInput(e.target.value.replace(/\D/g, ""))}
            maxLength={10}
            onKeyDown={e => e.key === "Enter" && handleMobileSubmit()}
            className="flex-1 rounded-xl px-4 py-3 outline-none"
            style={{ border: "2px solid #f0e6e6", fontSize: 16 }}
          />
        </div>

        <button
          onClick={handleMobileSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "#7B1C2E" }}
        >
          Find My Family →
        </button>

        <div className="text-center">
          <button
            onClick={() => navigate("/registration")}
            className="text-xs" style={{ color: "#C9A84C" }}
          >
            Skip — Register a new family instead
          </button>
        </div>
      </Card>
    );
  }

  // Family found — show summary + PIN
  if (stage === STAGE.FAMILY_FOUND) {
    const memberCount = Object.keys(family?.members || {}).length;
    return (
      <Card>
        {/* Success badge */}
        <div className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: "linear-gradient(135deg,#FDF0D0,#FDE8EC)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: "#7B1C2E", color: "#F0D080" }}>
            🏠
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#C9A84C" }}>
              Family Found! ✅
            </p>
            <p className="text-base font-bold" style={{ color: "#5A1020" }}>
              {headName ? `${headName}'s Family` : "Your Family"}
            </p>
          </div>
        </div>

        {/* Family details */}
        <div className="space-y-2">
          {[
            { label: "City",    value: family?.city    || "—" },
            { label: "Native",  value: family?.native  || "—" },
            { label: "Members", value: `${memberCount} member${memberCount !== 1 ? "s" : ""}` },
            { label: "PIN",     value: "****" },
          ].map(row => (
            <div key={row.label}
              className="flex justify-between py-2 border-b"
              style={{ borderColor: "#f0e6e6" }}>
              <span className="text-xs" style={{ color: "#9B6060" }}>{row.label}</span>
              <span className="text-xs font-semibold" style={{ color: "#3D0010" }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* PIN entry */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: "#7B1C2E" }}>
            Enter Family PIN to join
          </p>
          <input
            type="number"
            inputMode="numeric"
            placeholder="4-digit PIN"
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(""); }}
            onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
            maxLength={4}
            className="w-full rounded-xl px-4 py-3 outline-none text-center text-xl font-bold tracking-widest"
            style={{ border: "2px solid #f0e6e6", fontSize: 20 }}
          />
          {pinError && (
            <p className="text-xs mt-1 font-semibold" style={{ color: "#ef4444" }}>
              {pinError}
            </p>
          )}
        </div>

        <button
          onClick={handlePinSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "#7B1C2E" }}
        >
          Join Family ✓
        </button>

        {/* Not my family */}
        <div className="flex gap-3">
          <button
            onClick={() => setStage(STAGE.ASK_MOBILE)}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border-2"
            style={{ borderColor: "#f0e6e6", color: "#9B6060" }}
          >
            ← Different Mobile
          </button>
          <button
            onClick={() => navigate("/registration")}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border-2"
            style={{ borderColor: "#f0e6e6", color: "#9B6060" }}
          >
            Not My Family
          </button>
        </div>
      </Card>
    );
  }

  return null;
}