// pages/FamilyRegistrationFlow/MobilePromptSheet.jsx
// Bottom sheet: ask Google user for their mobile number.

import { useState }       from "react";
import { getMobileIndex } from "../../db/mobileIndexDb";
import { toFullMobile }   from "../../lib/phone";
import { COLORS }         from "../../constants/app";
import MobileInput        from "../../components/ui/MobileInput";

export default function MobilePromptSheet({ user, onFound, onNotFound, onSkip }) {
  const [cc,   setCc]   = useState("+91");
  const [num,  setNum]  = useState("");
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");

  const handleCheck = async () => {
    if (num.length < 10) { setErr("Enter a valid mobile number."); return; }
    const full = toFullMobile(cc, num);
    setBusy(true); setErr("");
    try {
      const data      = await getMobileIndex(full).catch(() => null);
      const familyIds = Object.keys(data?.familyIds || {});
      if (familyIds.length > 0) {
        onFound({ full, countryCode: cc, familyId: familyIds[0], mxData: data });
      } else {
        onNotFound({ full, countryCode: cc, digits: num });
      }
    } catch {
      setErr("Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-md rounded-t-3xl p-6 space-y-5"
        style={{ background: COLORS.bg }}>
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: COLORS.border }} />

        <div className="flex items-center gap-3">
          {user.photoURL && (
            <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full border-2"
              style={{ borderColor: COLORS.gold }} />
          )}
          <div>
            <p className="font-bold text-sm" style={{ color: COLORS.primaryDark }}>
              Welcome, {user.displayName?.split(" ")[0] || "there"}! 🙏
            </p>
            <p className="text-xs" style={{ color: COLORS.textSecondary }}>Enter your mobile</p>
          </div>
        </div>

        <MobileInput
          countryCode={cc}  onCountryCodeChange={setCc}
          number={num}      onNumberChange={setNum}
          error={err}
        />

        <button onClick={handleCheck} disabled={busy || num.length < 10}
          className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white disabled:opacity-50"
          style={{ background: COLORS.primary }}>
          {busy ? "Checking…" : "Next →"}
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
