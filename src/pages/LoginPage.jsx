import { useState } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const auth = getAuth();

  // 🔵 Google Login
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    navigate("/registration");
  };

  // 🔵 Email Login
  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch {
      alert("Invalid email or password");
    }
  };

  // 🟢 Email Register
  const register = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/registration");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-5">

      {/* 🟣 Title */}
      <h1 className="text-2xl font-bold text-center text-blue-900">
        Community App
      </h1>

      {/* 🔴 Google */}
      <button
        onClick={loginWithGoogle}
        className="w-full bg-red-500 text-white p-3 rounded-lg font-semibold"
      >
        Continue with Google
      </button>

      {/* OR */}
      <div className="text-center text-gray-400">OR</div>

      {/* 🔵 Tabs */}
      <div className="flex border rounded-lg overflow-hidden">
        <button
          onClick={() => setTab("login")}
          className={`flex-1 p-2 ${
            tab === "login"
              ? "bg-blue-600 text-white"
              : "bg-gray-100"
          }`}
        >
          Login
        </button>

        <button
          onClick={() => setTab("register")}
          className={`flex-1 p-2 ${
            tab === "register"
              ? "bg-green-600 text-white"
              : "bg-gray-100"
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
