import { useState } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

import { ref, get, set } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [tab, setTab]                 = useState("login");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [mobile, setMobile]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [loadingMsg, setLoadingMsg]   = useState("");

  const navigate = useNavigate();
  const auth     = getAuth();

  // Normalize mobile to full international format e.g. +919876543210
  const normalizedMobile = () => {
    const digits = mobile.trim().replace(/\D/g, "").slice(-10);
    return digits ? `${countryCode}${digits}` : "";
  };

  // ─────────────────────────────────────────────
  // After auth — decide where to go:
  // Has familyId → /dashboard
  // No familyId  → /onboarding (handles mobile check + family link)
  // ─────────────────────────────────────────────
  const afterAuth = async (uid) => {
    const snap = await get(ref(db, `users/${uid}/familyId`));
    if (snap.exists() && snap.val()) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/onboarding", { replace: true });
    }
  };

  // ─────────────────────────────────────────────
  // ⭐ Ensure user record exists in RTDB
  // ─────────────────────────────────────────────
  const ensureUserRecord = async (user, extraFields = {}) => {
    if (!user?.uid) return;

    const userRef = ref(db, `users/${user.uid}`);
    const snap    = await get(userRef);

    if (!snap.exists()) {
      // New user — write full node
      await set(userRef, {
        email:     user.email || null,
        mobile:    extraFields.mobile || null,
        role:      "guest",
        familyId:  null,
        memberId:  null,
        status:    "pendingRegistration",
        createdAt: Date.now(),
      });

      // Email index
      if (user.email) {
        const emailKey = user.email
          .trim()
          .toLowerCase()
          .replace(/\./g, ",")
          .replace(/@/g, "_");
        await set(ref(db, `usersByEmail/${emailKey}`), user.uid);
      }

      // mobileIndex — if mobile provided at registration
      if (extraFields.mobile) {
        const mob = extraFields.mobile.replace(/\D/g, "").slice(-10);
        if (mob) {
          await set(ref(db, `mobileIndex/${mob}/isUser`),  true);
          await set(ref(db, `mobileIndex/${mob}/userUid`), user.uid);
        }
      }

    } else if (extraFields.mobile && !snap.val()?.mobile) {
      // Existing node but mobile not saved yet — update it
      await set(ref(db, `users/${user.uid}/mobile`), extraFields.mobile);
      const mob = extraFields.mobile.replace(/\D/g, "").slice(-10);
      if (mob) {
        await set(ref(db, `mobileIndex/${mob}/isUser`),  true);
        await set(ref(db, `mobileIndex/${mob}/userUid`), user.uid);
      }
    }
  };

  // ─────────────────────────────────────────────
  // 🔵 GOOGLE LOGIN
  // ─────────────────────────────────────────────
  const loginWithGoogle = async () => {
    setLoading(true);
    setLoadingMsg("Signing in with Google...");
    try {
      const provider = new GoogleAuthProvider();
      const res      = await signInWithPopup(auth, provider);

      setLoadingMsg("Setting up your account...");
      await ensureUserRecord(res.user);
      await afterAuth(res.user.uid);

    } catch {
      alert("Google login failed");
    }
    setLoading(false);
  };

  // ─────────────────────────────────────────────
  // 🔵 EMAIL LOGIN
  // ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────
  // 🟢 REGISTER (Email)
  // ─────────────────────────────────────────────
  const register = async () => {
    setLoading(true);
    setLoadingMsg("Creating your account...");
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      setLoadingMsg("Setting up your account...");
      await ensureUserRecord(res.user, { mobile: normalizedMobile() });
      await afterAuth(res.user.uid);

    } catch (e) {
      alert(e.message);
    }
    setLoading(false);
  };

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto p-6 space-y-5">

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white mt-4 text-lg">{loadingMsg}</p>
        </div>
      )}

      <h1 className="text-2xl font-bold text-center text-blue-900">
        Community App
      </h1>

      {/* Google */}
      <button
        onClick={loginWithGoogle}
        disabled={loading}
        className="w-full bg-red-500 text-white p-3 rounded-lg font-semibold disabled:opacity-50"
      >
        Continue with Google
      </button>

      <div className="text-center text-gray-400">OR</div>

      {/* Tabs */}
      <div className="flex border rounded-lg overflow-hidden">
        <button onClick={() => setTab("login")}
          className={`flex-1 p-2 ${tab === "login" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
          Login
        </button>
        <button onClick={() => setTab("register")}
          className={`flex-1 p-2 ${tab === "register" ? "bg-green-600 text-white" : "bg-gray-100"}`}>
          Register
        </button>
      </div>

      {/* Email */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      {/* Password */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      {/* Mobile — only on Register tab */}
      {tab === "register" && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Mobile Number (optional)</p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={countryCode}
              onChange={e => {
                let v = e.target.value;
                if (!v.startsWith("+")) v = "+" + v.replace(/\+/g, "");
                setCountryCode(v);
              }}
              maxLength={5}
              className="w-20 border p-3 rounded-lg text-center text-sm"
              placeholder="+91"
            />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Mobile number"
              value={mobile}
              onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              className="flex-1 border p-3 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Forgot */}
      {tab === "login" && (
        <p onClick={() => navigate("/forgot-password")}
          className="text-sm text-blue-600 text-right cursor-pointer">
          Forgot Password?
        </p>
      )}

      {/* Submit */}
      {tab === "login" ? (
        <button onClick={login} disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50">
          Login
        </button>
      ) : (
        <button onClick={register} disabled={loading}
          className="w-full bg-green-600 text-white p-3 rounded-lg disabled:opacity-50">
          Create Account
        </button>
      )}

    </div>
  );
}