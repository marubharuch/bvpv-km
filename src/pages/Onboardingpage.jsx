// pages/OnboardingPage.jsx
import { useState, useEffect }    from "react";
import { useNavigate }            from "react-router-dom";
import { useAuth }                from "../store/AuthContext";
import { getUser, linkUserToFamily } from "../db/userDb";
import { getMobileIndex }         from "../db/mobileIndexDb";
import { rtdb }                   from "../db/rtdb";
import { toMobileKey, toFullMobile } from "../lib/phone";
import { COLORS }                 from "../constants/app";
import Card                       from "../components/ui/Card";
import Spinner                    from "../components/ui/Spinner";
import MobileInput                from "../components/ui/MobileInput";
import PinInput                   from "../components/ui/PinInput";

const S = { LOADING:"loading", ASK:"ask", CHECKING:"checking", FOUND:"found", LINKING:"linking", NOTFOUND:"notfound" };

export default function OnboardingPage() {
  const { user, ready } = useAuth();
  const navigate        = useNavigate();

  const [stage,   setStage]   = useState(S.LOADING);
  const [cc,      setCc]      = useState("+91");
  const [numIn,   setNumIn]   = useState("");    // raw input
  const [mob10,   setMob10]   = useState("");    // 10-digit key
  const [family,  setFamily]  = useState(null);
  const [famId,   setFamId]   = useState(null);
  const [memId,   setMemId]   = useState(null);
  const [head,    setHead]    = useState("");
  const [pin,     setPin]     = useState("");
  const [pinErr,  setPinErr]  = useState("");
  const [err,     setErr]     = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!user?.uid) { navigate("/login", { replace: true }); return; }
    if (user.familyId) { navigate("/dashboard", { replace: true }); return; }

    (async () => {
      const userData = await getUser(user.uid, user.email);
      if (userData.familyId) { navigate("/dashboard", { replace: true }); return; }

      if (userData.countryCode) setCc(userData.countryCode);

      const storedMobile = userData.mobile || user.phoneNumber || "";
      const key = toMobileKey(storedMobile);
      if (key) { setMob10(key); await checkMobile(key); }
      else setStage(S.ASK);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.uid]);

  const checkMobile = async (key) => {
    setStage(S.CHECKING);
    setErr("");
    try {
      const idx = await getMobileIndex(key);
      if (!idx) { setStage(S.NOTFOUND); return; }

      const fid = idx.familyId || (idx.familyIds ? Object.keys(idx.familyIds)[0] : null);
      if (!fid)  { setStage(S.NOTFOUND); return; }

      const fam = await rtdb.get(`families/${fid}`);
      if (!fam)  { setStage(S.NOTFOUND); return; }

      const mid = idx.memberId || (idx.memberIds ? Object.keys(idx.memberIds)[0] : null);
      let hName = fam.headName || "";
      if (!hName && fam.headMemberId) {
        hName = await rtdb.get(`members/${fam.headMemberId}/name`) || "";
      }

      setFamily(fam); setFamId(fid); setMemId(mid); setHead(hName);
      setStage(S.FOUND);
    } catch (e) {
      console.error(e);
      setErr("Could not check your mobile. Please try again.");
      setStage(S.ASK);
    }
  };

  const handleMobileSubmit = async () => {
    const digits = numIn.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) { setErr("Enter a valid 10-digit mobile number."); return; }
    const full = toFullMobile(cc, digits);
    setMob10(digits);
    // Save to user node
    await rtdb.update(`users/${user.uid}`, { mobile: full, countryCode: cc });
    await checkMobile(digits);
  };

  const handlePinSubmit = async () => {
    setPinErr("");
    if (!pin.trim()) { setPinErr("Enter the family PIN."); return; }
    if (String(family.familyPin) !== pin.trim()) { setPinErr("Incorrect PIN."); return; }

    setStage(S.LINKING);
    try {
      await linkUserToFamily({
        uid: user.uid, familyId: famId, memberId: memId,
        fullMobile: toFullMobile(cc, mob10),
        countryCode: cc,
        email: user.email,
      });
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setPinErr("Something went wrong. Please try again.");
      setStage(S.FOUND);
    }
  };

  if (!ready || [S.LOADING, S.CHECKING, S.LINKING].includes(stage))
    return <Spinner message={stage === S.CHECKING ? "Looking up your family…" : stage === S.LINKING ? "Linking your account…" : "Setting up…"} />;

  const CS = { border: `2px solid ${COLORS.border}`, fontSize: 16, color: COLORS.textPrimary };

  if (stage === S.ASK) return (
    <div className="max-w-md mx-auto p-4 pt-8">
      <Card>
        <div className="text-center space-y-1 pb-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-3"
            style={{ background: "#FDE8EC" }}>📱</div>
          <h2 className="text-xl font-bold" style={{ color: COLORS.primaryDark }}>Enter Your Mobile</h2>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>We'll check if your family is registered</p>
        </div>
        {err && <p className="text-xs text-center font-semibold" style={{ color: COLORS.error }}>{err}</p>}
        <MobileInput countryCode={cc} onCountryCodeChange={setCc} number={numIn} onNumberChange={setNumIn} />
        <button onClick={handleMobileSubmit} className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
          style={{ background: COLORS.primary }}>Next →</button>
        <div className="text-center">
          <button onClick={() => navigate("/registration")} className="text-xs" style={{ color: COLORS.gold }}>
            Skip — Register a new family
          </button>
        </div>
      </Card>
    </div>
  );

  if (stage === S.NOTFOUND) return (
    <div className="max-w-md mx-auto p-4 pt-8">
      <Card>
        <div className="text-center py-4 space-y-4">
          <div className="text-5xl">🏠</div>
          <h2 className="text-lg font-bold" style={{ color: COLORS.primaryDark }}>No Family Found</h2>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>Your mobile is not linked to any family yet.</p>
          <button onClick={() => navigate("/registration")}
            className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: COLORS.primary }}>
            Register My Family →
          </button>
          <button onClick={() => setStage(S.ASK)}
            className="w-full py-2 rounded-xl text-sm font-semibold border-2"
            style={{ borderColor: COLORS.border, color: COLORS.primary }}>
            Try Different Number
          </button>
        </div>
      </Card>
    </div>
  );

  if (stage === S.FOUND) return (
    <div className="max-w-md mx-auto p-4 pt-8">
      <Card>
        <div className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: "linear-gradient(135deg,#FDF0D0,#FDE8EC)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: COLORS.primary, color: COLORS.goldLight }}>🏠</div>
          <div>
            <p className="text-xs font-semibold" style={{ color: COLORS.gold }}>Family Found! ✅</p>
            <p className="text-base font-bold" style={{ color: COLORS.primaryDark }}>
              {head ? `${head}'s Family` : "Your Family"}
            </p>
          </div>
        </div>

        {[
          { label: "City",    value: family.city || "—" },
          { label: "Members", value: `${Object.keys(family.members || {}).length} members` },
        ].map(row => (
          <div key={row.label} className="flex justify-between py-2 border-b" style={{ borderColor: COLORS.border }}>
            <span className="text-xs" style={{ color: COLORS.textSecondary }}>{row.label}</span>
            <span className="text-xs font-semibold" style={{ color: COLORS.textPrimary }}>{row.value}</span>
          </div>
        ))}

        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: COLORS.primary }}>Enter Family PIN</p>
          <PinInput value={pin} onChange={v => { setPin(v); setPinErr(""); }} onSubmit={handlePinSubmit} error={pinErr} />
        </div>

        <button onClick={handlePinSubmit}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white" style={{ background: COLORS.primary }}>
          Join Family ✓
        </button>

        <div className="flex gap-3">
          <button onClick={() => setStage(S.ASK)}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border-2"
            style={{ borderColor: COLORS.border, color: COLORS.textSecondary }}>← Different Number</button>
          <button onClick={() => navigate("/registration")}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border-2"
            style={{ borderColor: COLORS.border, color: COLORS.textSecondary }}>Not My Family</button>
        </div>
      </Card>
    </div>
  );

  return null;
}
