import { useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, get, update, set } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";

export default function JoinFamilyPage() {
  const { user } = useContext(AuthContext);   // ✅ global auth
  const [searchParams] = useSearchParams();
  const familyId = searchParams.get("familyId");
  const [pin, setPin] = useState("");
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }

    if (!familyId) {
      alert("Invalid link");
      return;
    }

    const snap = await get(ref(db, `families/${familyId}`));
    if (!snap.exists()) {
      alert("Family not found");
      return;
    }

    const data = snap.val();

    if (data.familyPin != pin) {
      alert("Incorrect PIN");
      return;
    }

    // Add user to family members
    await update(ref(db, `families/${familyId}/members/${user.uid}`), {
      role: "member",
      email: user.email,
      joinedAt: Date.now()
    });

    // 🔥 Create users/{uid} mapping (important)
    await set(ref(db, `users/${user.uid}`), {
      familyId: familyId,
      role: "member"
    });

    alert("Joined family successfully!");
    navigate("/dashboard");
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-lg font-bold text-center">Join Family</h2>

      <input
        type="number"
        placeholder="Enter 4-digit PIN"
        value={pin}
        onChange={(e)=>setPin(e.target.value)}
        className="border w-full p-2 rounded"
      />

      <button
        onClick={handleJoin}
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        Join
      </button>
    </div>
  );
}
