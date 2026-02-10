import { useState } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword
} from "firebase/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinFamilyId = searchParams.get("join"); // 👈 from invite link

  // 🔁 After login, decide where to go
  const redirectUser = async (user) => {
    // 👉 If user came from invite link, go to join page first
    if (joinFamilyId) {
      navigate(`/join?familyId=${joinFamilyId}`);
      return;
    }

    // 🔍 Check registration
    const snap = await get(ref(db, "families"));
    let registered = false;

    snap.forEach(f => {
      if (f.child("members").hasChild(user.uid))
        registered = true;
    });

    if (registered) {
      navigate("/dashboard");
    } else {
      navigate("/registration");
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(getAuth(), provider);
    await redirectUser(res.user);
  };

  const loginWithEmail = async () => {
  if (email.toLowerCase().endsWith("@gmail.com")) {
    alert("Gmail users must use 'Continue with Google' button.");
    return;
  }

  try {
    const res = await signInWithEmailAndPassword(getAuth(), email, password);
    await redirectUser(res.user);
  } catch {
    alert("Invalid email or password");
  }
};


  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-lg font-bold text-center">Login</h2>

      <button
        onClick={loginWithGoogle}
        className="w-full bg-red-500 text-white p-2 rounded"
      >
        Continue with Google
      </button>

      <div className="text-center text-sm text-gray-500">OR</div>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        className="border w-full p-2 rounded"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        className="border w-full p-2 rounded"
      />
      <p
  onClick={() => navigate("/forgot-password")}
  className="text-sm text-blue-600 text-center cursor-pointer"
>
  Forgot Password?
</p>


      <button
        onClick={loginWithEmail}
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        Login
      </button>
    </div>
  );
}
