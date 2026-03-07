// pages/FamilyRegistrationFlow/MobileFamilyPinScreen.jsx
// PIN verify screen: shown when mobile is found in an existing family.

import { useState }              from "react";
import { rtdb }                  from "../../db/rtdb";
import { memberDoc }             from "../../db/schema";
import { getMobileIndex }        from "../../db/mobileIndexDb";
import { linkUserToFamily }      from "../../db/userDb";
import { toFullMobile, splitMobile } from "../../lib/phone";
import { COLORS }                from "../../constants/app";
import PinInput                  from "../../components/ui/PinInput";

export default function MobileFamilyPinScreen({ familyId, mobile, user, onSuccess, onRegisterNew }) {
  const [pin,  setPin]  = useState("");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    if (pin.trim().length !== 4) { setErr("Enter a 4-digit PIN."); return; }
    setBusy(true); setErr("");
    try {
      const storedFamilyId = await rtdb.get(`familiesByPin/${pin.trim()}`);
      if (storedFamilyId !== familyId) { setErr("Incorrect PIN. Try again."); setBusy(false); return; }

      const ts                  = Date.now();
      const { countryCode, digits } = splitMobile(mobile || "");
      const full                = mobile ? toFullMobile(countryCode, digits) : "";
      const mxData              = full ? await getMobileIndex(full) : null;
      const memberIds           = Object.keys(mxData?.memberIds || {});
      let memberId              = memberIds[0] || null;

      if (!memberId) {
        memberId = `MEM_${ts}`;
        await rtdb.set(`members/${memberId}`, memberDoc({
          name:        user.displayName || user.email || "Member",
          mobile:      full,
          countryCode,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-md rounded-t-3xl p-6 space-y-5"
        style={{ background: COLORS.bg }}>
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: COLORS.border }} />

        <div className="text-center space-y-1">
          <div className="text-3xl">🏠</div>
          <p className="font-bold text-base" style={{ color: COLORS.primaryDark }}>
            Family found!
          </p>
          <p className="text-xs" style={{ color: COLORS.textSecondary }}>
            Enter your 4-digit family PIN to join
          </p>
        </div>

        <PinInput value={pin} onChange={setPin} length={4} />

        {err && (
          <p className="text-xs text-center font-semibold" style={{ color: COLORS.error }}>{err}</p>
        )}

        <button onClick={handleVerify} disabled={busy || pin.length !== 4}
          className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white disabled:opacity-50"
          style={{ background: COLORS.primary }}>
          {busy ? "Verifying…" : "Join Family →"}
        </button>

        <button onClick={onRegisterNew}
          className="w-full text-xs font-semibold py-1 text-center"
          style={{ color: COLORS.textMuted }}>
          Register a new family instead
        </button>
      </div>
    </div>
  );
}
