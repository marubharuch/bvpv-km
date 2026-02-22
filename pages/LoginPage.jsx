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
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const auth = getAuth();

  // 🧠 🔗 AUTO CONNECT FAMILY IF EMAIL EXISTS
 // 🧠 🔗 AUTO CONNECT FAMILY IF EMAIL EXISTS (OLD + NEW SUPPORT)
const connectFamily = async (user) => {
  if (!user?.email) return false;

  const emailKey = user.email
    .trim()
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/@/g, "_");

  console.log("Searching:", `users/${emailKey}`);

  // 🔴 1️⃣ Check old emailKey record
  const emailSnap = await get(ref(db, `users/${emailKey}`));

  if (!emailSnap.exists()) {
    console.log("❌ Email not found");
    return false;
  }

  const oldData = emailSnap.val();

  // 🔥 2️⃣ Save FULL user record under UID (NEW STANDARD)
  await set(ref(db, `users/${user.uid}`), {
    email: user.email,
    familyId: oldData.familyId || null,
    memberId: oldData.memberId || null,
    role: oldData.role || "guest"
  });

  // ⭐ OPTIONAL — keep email index for future lookups
  await set(ref(db, `usersByEmail/${emailKey}`), user.uid);

  return true;
};

  // 🔵 GOOGLE LOGIN
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);

      const mapped = await connectFamily(res.user);

      // 🔁 Redirect logic
      if (mapped) navigate("/dashboard");
      else navigate("/registration");

    } catch (e) {
      alert("Google login failed");
    }
  };

  // 🔵 EMAIL LOGIN
  const login = async () => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);

      const mapped = await connectFamily(res.user);

      if (mapped) navigate("/dashboard");
      else navigate("/registration");

    } catch {
      alert("Invalid email or password");
    }
  };

  // 🟢 REGISTER
  const register = async () => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      const mapped = await connectFamily(res.user);

    if (mapped) {
        console.log("✅ User found in database. Navigating to Dashboard.");
        navigate("/dashboard");
      } else {
        console.log("ℹ️ User not found. Navigating to Registration.");
        navigate("/registration");
      }

    } catch (e) {
      console.error("❌ Authentication Error:", e.message);
      alert(e.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-5">

      {/* 🟣 Title */}
      <h1 className="text-2xl font-bold text-center text-blue-900">
        Community App 2
      </h1>

      {/* 🔴 Google */}
      <button
        onClick={loginWithGoogle}
        className="w-full bg-red-500 text-white p-3 rounded-lg font-semibold"
      >
        Continue with Google
      </button>

      <div className="text-center text-gray-400">OR</div>

      {/* 🔵 Tabs */}
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

      {/* 📧 Email */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      {/* 🔒 Password */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      {/* 🔑 Forgot */}
      {tab === "login" && (
        <p
          onClick={() => navigate("/forgot-password")}
          className="text-sm text-blue-600 text-right cursor-pointer"
        >
          Forgot Password?
        </p>
      )}

      {/* 🔘 Submit */}
      {tab === "login" ? (
        <button
          onClick={login}
          className="w-full bg-blue-600 text-white p-3 rounded-lg"
        >
          Login
        </button>
      ) : (
        <button
          onClick={register}
          className="w-full bg-green-600 text-white p-3 rounded-lg"
        >
          Create Account
        </button>
      )}

    </div>
  );
}