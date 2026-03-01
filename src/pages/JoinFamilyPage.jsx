import { useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ref, get, update, push } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";

export default function JoinFamilyPage() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const familyId = searchParams.get("familyId");
  const [pin, setPin] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleJoin = async () => {
    setError("");

    if (!user) {
      setError("Please login first.");
      return;
    }

    if (!familyId) {
      setError("Invalid invite link — missing family ID.");
      return;
    }

    if (!/^\d{4}$/.test(pin.trim())) {
      setError("Please enter a valid 4-digit PIN.");
      return;
    }

    setJoining(true);
    try {
      // ── 1. Verify family exists and PIN matches ──
      const famSnap = await get(ref(db, `families/${familyId}`));
      if (!famSnap.exists()) {
        setError("Family not found.");
        return;
      }

      const famData = famSnap.val();
      if (String(famData.familyPin) !== pin.trim()) {
        setError("Incorrect PIN. Please try again.");
        return;
      }

      // ── 2. Check if user already has a memberId ──
      const userSnap = await get(ref(db, `users/${user.uid}`));
      const userData = userSnap.exists() ? userSnap.val() : {};

      // Don't allow joining a second family
      if (userData.familyId && userData.familyId !== familyId) {
        setError("You are already part of a different family.");
        return;
      }

      const ts = Date.now();
      let memberId = userData.memberId || null;

      const updates = {};

      // ── 3. Create a proper MEM_ member node if none exists ──
      if (!memberId) {
        const newMemberRef = push(ref(db, "members"));
        memberId = newMemberRef.key;

        updates[`members/${memberId}`] = {
          name: user.displayName || user.email || "Member",
          mobile: userData.mobile || "",
          email: user.email || "",
          gender: "",
          dob: "",
          photoURL: user.photoURL || "",   // ✅ Bug 7: Google profile pic if available
          honoraryOrgs: [],                  // ✅ Bug 7: empty default
          isHead: false,
          isSelf: true,
          isStudent: false,
          familyId,
          createdAt: ts,                     // ✅ Bug 7: consistent with other member nodes
          joinedAt: ts,
        };
      }

      // ── 4. Link member ID into family members map ──
      updates[`families/${familyId}/members/${memberId}`] = true;

      // ── 5. Update user node — use update() not set() to preserve existing fields ──
      updates[`users/${user.uid}/familyId`] = familyId;
      updates[`users/${user.uid}/memberId`] = memberId;
      updates[`users/${user.uid}/role`] = "member";
      updates[`users/${user.uid}/status`] = "active";

      // ── 6. Update mobileIndex if mobile is known ──
      // ✅ Bug 6: normalize mobile before using as index key
      const cleanMobile = (userData.mobile || "").replace(/\D/g, "").slice(-10);
      if (cleanMobile) {
        updates[`mobileIndex/${cleanMobile}/memberIds/${memberId}`] = true;
        updates[`mobileIndex/${cleanMobile}/familyIds/${familyId}`] = true;
        updates[`mobileIndex/${cleanMobile}/isUser`] = true;
        updates[`mobileIndex/${cleanMobile}/userUid`] = user.uid;
      }

      // ── 7. Single atomic write ──
      await update(ref(db), updates);

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
        onChange={(e) => setPin(e.target.value)}
        className="border w-full p-2 rounded"
        maxLength={4}
        disabled={joining}
      />

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

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