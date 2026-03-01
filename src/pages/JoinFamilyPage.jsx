/**
 * JoinFamilyPage.jsx
 * ─────────────────────────────────────────────
 * Refactored: uses userService.linkUserToFamily()
 * instead of inline Firebase writes.
 */

import { useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { linkUserToFamily } from "../services/userService";
import { pushToPath } from "../services/rtdbService";
import { memberSchema } from "../schema/schema";
import { normalizeMobile } from "../utils/normalizePhone";

export default function JoinFamilyPage() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const familyId = searchParams.get("familyId");
  const [pin,     setPin]     = useState("");
  const [joining, setJoining] = useState(false);
  const [error,   setError]   = useState("");
  const navigate = useNavigate();

  const handleJoin = async () => {
    setError("");

    if (!user) { setError("Please login first."); return; }
    if (!familyId) { setError("Invalid invite link — missing family ID."); return; }
    if (!/^\d{4}$/.test(pin.trim())) { setError("Please enter a valid 4-digit PIN."); return; }

    setJoining(true);
    try {
      // 1. Verify family exists and PIN matches
      const famSnap = await get(ref(db, `families/${familyId}`));
      if (!famSnap.exists()) { setError("Family not found."); return; }

      const famData = famSnap.val();
      if (String(famData.familyPin) !== pin.trim()) {
        setError("Incorrect PIN. Please try again.");
        return;
      }

      // 2. Check if user already has a memberId
      const userSnap = await get(ref(db, `users/${user.uid}`));
      const userData = userSnap.exists() ? userSnap.val() : {};

      if (userData.familyId && userData.familyId !== familyId) {
        setError("You are already part of a different family.");
        return;
      }

      const ts       = Date.now();
      let memberId   = userData.memberId || null;

      // 3. Create a member node if none exists
      if (!memberId) {
        memberId = await pushToPath("members", memberSchema({
          name:      user.displayName || user.email || "Member",
          mobile:    normalizeMobile(userData.mobile),
          email:     user.email || "",
          photoURL:  user.photoURL || "",
          isSelf:    true,
          familyId,
          createdAt: ts,
        }));
      }

      // 4. Link user to family atomically via service
      await linkUserToFamily({
        uid:      user.uid,
        familyId,
        memberId,
        mobile:   normalizeMobile(userData.mobile),
        email:    user.email,
        ts,
      });

      navigate("/dashboard");

    } catch (e) {
      console.error("Join family error:", e);
      setError("Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-lg font-bold text-center">Join Family</h2>

      <input
        type="number"
        placeholder="Enter 4-digit PIN"
        value={pin}
        onChange={e => setPin(e.target.value)}
        className="border w-full p-2 rounded"
        maxLength={4}
        disabled={joining}
      />

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <button
        onClick={handleJoin}
        disabled={joining}
        className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
      >
        {joining ? "Joining..." : "Join"}
      </button>
    </div>
  );
}
