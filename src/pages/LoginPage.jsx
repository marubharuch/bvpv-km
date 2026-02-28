import { useState } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

import { ref, get, set } from "firebase/database";
import { writeUser, writeUserEmailIndex } from "../services/rtdbService";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const navigate = useNavigate();
  const auth = getAuth();

  // ─────────────────────────────────────────────
  // ⭐ Ensure user record exists in RTDB
  // ─────────────────────────────────────────────
  const ensureUserRecord = async (user) => {
    if (!user?.uid) return;

    const userRef = ref(db, `users/${user.uid}`);
    const snap = await get(userRef);

    if (!snap.exists()) {
      await set(userRef, {
        email: user.email || null,
        role: "guest",
        familyId: null,
        memberId: null,
        status: "pendingRegistration",
        createdAt: Date.now()
      });

      if (user.email) {
        const emailKey = user.email
          .trim()
          .toLowerCase()
          .replace(/\./g, ",")
          .replace(/@/g, "_");

        await set(ref(db, `usersByEmail/${emailKey}`), user.uid);
      }
    }
  };

  // ─────────────────────────────────────────────
  // 🔗 AUTO CONNECT FAMILY IF EMAIL EXISTS
  // ─────────────────────────────────────────────
  const connectFamily = async (user) => {
    if (!user?.email) return false;

    const emailKey = user.email
      .trim()
      .toLowerCase()
      .replace(/\./g, ",")
      .replace(/@/g, "_");

    const emailSnap = await get(ref(db, `users/${emailKey}`));

    if (!emailSnap.exists()) return false;

    const oldData = emailSnap.val();

    await set(ref(db, `users/${user.uid}`), {
      email: user.email,
      familyId: oldData.familyId || null,
      memberId: oldData.memberId || null,
      role: oldData.role || "guest"
    });

    await set(ref(db, `usersByEmail/${emailKey}`), user.uid);

    return true;
  };

  // ─────────────────────────────────────────────
  // 🔵 GOOGLE LOGIN
  // ─────────────────────────────────────────────
  const loginWithGoogle = async () => {
    setLoading(true);
    setLoadingMsg("Signing in with Google...");
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);

      setLoadingMsg("Setting up your account...");
      await ensureUserRecord(res.user);

      const mapped = await connectFamily(res.user);

      if (mapped) navigate("/dashboard");
      else navigate("/registration");

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

      setLoadingMsg("Setting up your account...");
      await ensureUserRecord(res.user);

      const mapped = await connectFamily(res.user);

      if (mapped) navigate("/dashboard");
      else navigate("/registration");

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
      await ensureUserRecord(res.user);

      const mapped = await connectFamily(res.user);

      if (mapped) navigate("/dashboard");
      else navigate("/registration");

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

      {/* ⭐ LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
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
        <button
          onClick={() => setTab("login")}
          className={`flex-1 p-2 ${
            tab === "login" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          Login
        </button>

        <button
          onClick={() => setTab("register")}
          className={`flex-1 p-2 ${
            tab === "register" ? "bg-green-600 text-white" : "bg-gray-100"
          }`}
        >
          Register
        </button>
      </div>

      {/* Email */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      {/* Password */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      {/* Forgot */}
      {tab === "login" && (
        <p
          onClick={() => navigate("/forgot-password")}
          className="text-sm text-blue-600 text-right cursor-pointer"
        >
          Forgot Password?
        </p>
      )}

      {/* Submit */}
      {tab === "login" ? (
        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg disabled:opacity-50"
        >
          Login
        </button>
      ) : (
        <button
          onClick={register}
          disabled={loading}
          className="w-full bg-green-600 text-white p-3 rounded-lg disabled:opacity-50"
        >
          Create Account
        </button>
      )}
    </div>
  );
}