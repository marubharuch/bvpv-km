import { useState } from "react";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "firebase/auth";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ensureUserRecord } from "../services/userService";
import LoadingOverlay from "../components/ui/LoadingOverlay";
import MobileInput from "../components/ui/MobileInput";

export default function LoginPage() {
  const [tab,         setTab]         = useState("login");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile,      setMobile]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [loadingMsg,  setLoadingMsg]  = useState("");

  const navigate = useNavigate();
  const auth     = getAuth();

  const normalizedMobile = () => {
    const digits = mobile.trim().replace(/\D/g, "").slice(-10);
    return digits ? `${countryCode}${digits}` : "";
  };

  // LoginPage.jsx
const afterAuth = async (uid) => {
  try {
    // ✅ wait for token to propagate
    const currentUser = getAuth().currentUser;
    if (currentUser) await currentUser.getIdToken(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const snap = await get(ref(db, `users/${uid}/familyId`));
    if (snap.exists() && snap.val()) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/onboarding", { replace: true });
    }
  } catch (e) {
    console.error("afterAuth error:", e);
    // ✅ still navigate even if DB read fails
    navigate("/onboarding", { replace: true });
  }
};

  const loginWithGoogle = async () => {
    setLoading(true);
    setLoadingMsg("Signing in with Google...");
    try {
      const provider = new GoogleAuthProvider();
       provider.setCustomParameters({ prompt: 'select_account' }); // ✅ add this
      const res      = await signInWithPopup(auth, provider);
      setLoadingMsg("Setting up your account...");
      await ensureUserRecord(res.user);
      await afterAuth(res.user.uid);
    } catch {
      alert("Google login failed");
    }
    setLoading(false);
  };

  const login = async () => {
    setLoading(true);
    setLoadingMsg("Logging in...");
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      setLoadingMsg("Checking your account...");
      await ensureUserRecord(res.user);
      await afterAuth(res.user.uid);
    } catch {
      alert("Invalid email or password");
    }
    setLoading(false);
  };

  const register = async () => {
    setLoading(true);
    setLoadingMsg("Creating your account...");
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      setLoadingMsg("Setting up your account...");
     await ensureUserRecord(res.user, { 
  mobile:      normalizedMobile(),        // +919974021397
  countryCode: countryCode || "+91",
});
      await afterAuth(res.user.uid);
    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-5">
      {loading && <LoadingOverlay message={loadingMsg} />}

      <h1 className="text-2xl font-bold text-center text-blue-900">Community App</h1>

      <button onClick={loginWithGoogle} disabled={loading}
        className="w-full bg-red-500 text-white p-3 rounded-lg font-semibold disabled:opacity-50">
        Continue with Google
      </button>

      <div className="text-center text-gray-400">OR</div>

      <div className="flex border rounded-lg overflow-hidden">
        <button onClick={() => setTab("login")}
          className={`flex-1 p-2 ${tab === "login" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Login</button>
        <button onClick={() => setTab("register")}
          className={`flex-1 p-2 ${tab === "register" ? "bg-green-600 text-white" : "bg-gray-100"}`}>Register</button>
      </div>

      <input type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)} className="w-full border p-3 rounded-lg" />
      <input type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)} className="w-full border p-3 rounded-lg" />

      {tab === "register" && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Mobile Number (optional)</p>
          <MobileInput
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            number={mobile}
            onNumberChange={setMobile}
          />
        </div>
      )}

      {tab === "login" && (
        <p onClick={() => navigate("/forgot-password")}
          className="text-sm text-blue-600 text-right cursor-pointer">
          Forgot Password?
        </p>
      )}

      {tab === "login"
        ? <button onClick={login} disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50">Login</button>
        : <button onClick={register} disabled={loading} className="w-full bg-green-600 text-white p-3 rounded-lg disabled:opacity-50">Create Account</button>
      }
    </div>
  );
}
