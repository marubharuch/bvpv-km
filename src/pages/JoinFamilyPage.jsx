// pages/JoinFamilyPage.jsx
import { useState, useContext }   from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth }                from "../store/AuthContext";
import { rtdb }                   from "../db/rtdb";
import { linkUserToFamily }       from "../db/userDb";
import { memberDoc }              from "../db/schema";
import { toMobileKey, toFullMobile } from "../lib/phone";
import { COLORS }                 from "../constants/app";

export default function JoinFamilyPage() {
  const { user }         = useAuth();
  const [params]         = useSearchParams();
  const familyId         = params.get("familyId");
  const navigate         = useNavigate();
  const [pin,    setPin] = useState("");
  const [err,    setErr] = useState("");
  const [busy,   setBusy]= useState(false);

  const handleJoin = async () => {
    setErr("");
    if (!user)   { setErr("Please login first."); return; }
    if (!familyId) { setErr("Invalid invite link."); return; }
    if (!/^\d{4}$/.test(pin.trim())) { setErr("Enter a valid 4-digit PIN."); return; }

    setBusy(true);
    try {
      const fam = await rtdb.get(`families/${familyId}`);
      if (!fam) { setErr("Family not found."); return; }
      if (String(fam.familyPin) !== pin.trim()) { setErr("Incorrect PIN."); return; }

      const userData = await rtdb.get(`users/${user.uid}`) || {};
      if (userData.familyId && userData.familyId !== familyId) {
        setErr("You are already in a different family.");
        return;
      }

      const ts      = Date.now();
      let memberId  = userData.memberId || null;

      if (!memberId) {
        const mob10 = toMobileKey(userData.mobile || "");
        memberId = `MEM_${ts}`;
        await rtdb.set(`members/${memberId}`, memberDoc({
          name:     user.displayName || user.email || "Member",
          mobile:   mob10,
          fullMobile: userData.mobile || "",
          countryCode: userData.countryCode || "+91",
          email:    user.email || "",
          photoURL: user.photoURL || "",
          isSelf:   true,
          familyId,
          createdAt: ts,
        }));
      }

      await linkUserToFamily({
        uid: user.uid, familyId, memberId,
        fullMobile:  userData.mobile || "",
        countryCode: userData.countryCode || "+91",
        email: user.email,
        ts,
      });

      navigate("/dashboard");
    } catch (e) {
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 pt-8 space-y-4">
      <div className="text-center space-y-1 mb-4">
        <div className="text-4xl mb-2">🏠</div>
        <h2 className="text-lg font-bold" style={{ color: COLORS.primaryDark }}>Join Family</h2>
        <p className="text-sm" style={{ color: COLORS.textSecondary }}>Enter the 4-digit family PIN</p>
      </div>
      <input type="number" placeholder="4-digit PIN" value={pin}
        onChange={e => setPin(e.target.value)} maxLength={4} disabled={busy}
        className="w-full border-2 rounded-xl px-4 py-3 text-center text-2xl font-bold outline-none"
        style={{ borderColor: COLORS.border, color: COLORS.textPrimary, fontSize: 24 }} />
      {err && <p className="text-xs text-center font-semibold" style={{ color: COLORS.error }}>{err}</p>}
      <button onClick={handleJoin} disabled={busy}
        className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
        style={{ background: COLORS.primary }}>
        {busy ? "Joining..." : "Join"}
      </button>
    </div>
  );
}
