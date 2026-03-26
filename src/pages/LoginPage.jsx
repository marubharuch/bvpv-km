// pages/LoginPage.jsx
import { useState, useEffect }   from "react";
import { useNavigate }           from "react-router-dom";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup,
} from "firebase/auth";
import { ensureUser }            from "../db/userDb";
import { toFullMobile }          from "../lib/phone";
import { friendlyAuthError }     from "../lib/firebaseErrors";
import { COLORS }                from "../constants/app";
import MobileInput               from "../components/ui/MobileInput";
import { useAuth }               from "../store/AuthContext";

export default function LoginPage() {
  const navigate        = useNavigate();
  const auth            = getAuth();
  const { user, ready, refreshUser } = useAuth();

  // Redirect already-logged-in users
  useEffect(() => {
    if (!ready) return;
    if (user) navigate(user.familyId ? "/dashboard" : "/registration", { replace: true });
  }, [user, ready, navigate]);

  const [tab,  setTab]  = useState("login");
  const [name, setName] = useState("");
  const [email,setEmail]= useState("");
  const [pass, setPass] = useState("");
  const [cc,   setCc]   = useState("+91");
  const [mob,  setMob]  = useState("");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true); setErr("");
    try   { await fn(); }
    catch (e) { setErr(friendlyAuthError(e)); }
    finally   { setBusy(false); }
  };

  const loginEmail = () => run(() => signInWithEmailAndPassword(auth, email, pass));

  const registerEmail = () => run(async () => {
    if (!mob || mob.replace(/\D/g, "").length < 10) {
      throw new Error("Mobile number mandatory for registration.");
    }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const full = toFullMobile(cc, mob);
    await ensureUser(cred.user, { displayName: name.trim(), mobile: full, countryCode: cc });
    await refreshUser();
    navigate("/registration", { replace: true });
  });

  // ── Google login ────────────────────────────────────────────────────────────
  // After Google login, mobile is NOT available from Google account.
  // So we always go to /registration — FamilyRegistrationFlow will show
  // MobilePromptSheet (mandatory) if user.mobile is null.
  // If user already has familyId (returning user) → go to /dashboard directly.
  const loginGoogle = () => run(async () => {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());

    // ensureUser without mobile — mobile will be collected in MobilePromptSheet
    await ensureUser(cred.user);

    // Read fresh data from RTDB — AuthContext may not be updated yet
    const { getUser } = await import("../db/userDb");
    const userData = await getUser(cred.user.uid, cred.user.email);

    if (userData?.familyId) {
      // Returning user — already registered
      navigate("/dashboard", { replace: true });
    } else if (userData?.mobile) {
      // Has mobile but no family — go straight to registration (skip MobilePromptSheet)
      navigate("/registration", { replace: true });
    } else {
      // New Google user — no mobile yet
      // FamilyRegistrationFlow will show MobilePromptSheet (mandatory, no skip)
      navigate("/registration", { replace: true });
    }
  });

  const forgotPass = async () => {
    if (!email) { setErr("Enter your email first."); return; }
    const { sendPasswordResetEmail } = await import("firebase/auth");
    run(() => sendPasswordResetEmail(auth, email).then(() =>
      setErr("✅ Password reset email sent!")
    ));
  };

  const inputStyle = {
    border: `2px solid ${COLORS.border}`,
    fontSize: 16,
    background: "#fff",
    color: COLORS.textPrimary,
  };
  const inputCls = "w-full rounded-xl px-4 py-3 outline-none focus:border-[#C9A84C] transition-colors";

  return (
    <div className="max-w-md mx-auto p-4 pt-8 space-y-4">
      <div className="text-center space-y-1 mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-3"
          style={{ background: "linear-gradient(135deg,#5A1020,#7B1C2E)" }}>🙏</div>
        <h1 className="text-xl font-bold" style={{ color: COLORS.primaryDark }}>Welcome</h1>
        <p className="text-sm" style={{ color: COLORS.textSecondary }}>Login or create your account</p>
      </div>

      {/* Google */}
      <button onClick={loginGoogle} disabled={busy}
        className="w-full py-3.5 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ borderColor: COLORS.border, color: COLORS.textPrimary, background: "#fff" }}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
        Continue with Google
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: COLORS.border }} />
        <span className="text-xs" style={{ color: COLORS.textMuted }}>or</span>
        <div className="flex-1 h-px" style={{ background: COLORS.border }} />
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden border-2" style={{ borderColor: COLORS.border }}>
        {["login", "register"].map(t => (
          <button key={t} onClick={() => { setTab(t); setErr(""); }}
            className="flex-1 py-2.5 text-sm font-semibold transition-all capitalize"
            style={tab === t
              ? { background: COLORS.primary, color: COLORS.goldLight }
              : { color: COLORS.textSecondary }}>
            {t === "login" ? "Sign In" : "Register"}
          </button>
        ))}
      </div>

      <input type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)}
        style={inputStyle} className={inputCls} />

      <input type="password" placeholder="Password" value={pass}
        onChange={e => setPass(e.target.value)}
        style={inputStyle} className={inputCls} />

      {tab === "register" && (
        <div className="space-y-3">
          <input type="text" placeholder="Full name" value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle} className={inputCls} />
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: COLORS.primary }}>
              Mobile <span style={{ color: COLORS.error }}>*</span>
            </p>
            <MobileInput countryCode={cc} onCountryCodeChange={setCc}
              number={mob} onNumberChange={setMob} />
          </div>
        </div>
      )}

      {err && (
        <p className="text-xs text-center font-semibold px-2"
          style={{ color: err.startsWith("✅") ? "#22c55e" : COLORS.error }}>
          {err}
        </p>
      )}

      <button onClick={tab === "login" ? loginEmail : registerEmail}
        disabled={busy}
        className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
        style={{ background: COLORS.primary }}>
        {busy ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
      </button>

      {tab === "login" && (
        <button onClick={forgotPass}
          className="w-full text-xs text-center py-1"
          style={{ color: COLORS.textSecondary }}>
          Forgot password?
        </button>
      )}
    </div>
  );
}