import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { signOut, getAuth } from "firebase/auth";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import localforage from "localforage";

export default function Navbar() {
  const { user, profile } = useContext(AuthContext);
  console.log("Navbar - user:", user, "profile:", profile);
  
  const [registered, setRegistered] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCachedStatus = async () => {
      // 🟢 FIX 1: Check for valid user with uid
      if (!user || !user.uid) {
        setRegistered(false);
        setLoading(false);
        return;
      }

      try {
        // 🟢 FIX 2: Safe access to user.uid
        const cacheKey = `registered_${user.uid}`;
        const cached = await localforage.getItem(cacheKey);
        
        if (cached !== null) {
          console.log("✅ Using cached registration status:", cached);
          setRegistered(cached);
          setLoading(false);
          
          // If cached is false, verify in background
          if (cached === false) {
            verifyWithFirebase(user, cacheKey);
          }
        } else {
          // No cache yet - show loading and verify
          console.log("⏳ No cache found, fetching from Firebase...");
          await verifyWithFirebase(user, cacheKey);
        }
        
      } catch (error) {
        console.error("Error checking family status:", error);
        setRegistered(false);
        setLoading(false);
      }
    };

    loadCachedStatus();
  }, [user?.uid]); // 🟢 FIX 3: Depend on user.uid, not entire user object

  // 🟢 FIX 4: Separate Firebase verification function
  const verifyWithFirebase = async (user, cacheKey) => {
    try {
      const userRef = ref(db, `users/${user.uid}/familyId`);
      const userSnap = await get(userRef);
      
      let hasFamily = false;
      
      if (userSnap.exists()) {
        hasFamily = true;
      } else {
        const familiesSnap = await get(ref(db, "families"));
        familiesSnap.forEach(family => {
          if (family.child("members").hasChild(user.uid)) {
            hasFamily = true;
          }
        });
      }

      console.log("✅ Firebase verification complete:", hasFamily);
      setRegistered(hasFamily);
      setLoading(false);
      await localforage.setItem(cacheKey, hasFamily);
      
    } catch (error) {
      console.error("Firebase verification error:", error);
      setRegistered(false);
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user?.uid) {
      await localforage.removeItem(`registered_${user.uid}`);
    }
    await signOut(getAuth());
  };

  // Show minimal navbar while loading
  if (loading || registered === null) {
    return (
      <nav className="flex justify-around bg-white p-3 shadow text-sm">
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Committee</Link>
        {user?.uid ? (  // 🟢 FIX 5: Check for uid specifically
          <span className="text-gray-400">Loading...</span>
        ) : (
          <>
            <Link to="/registration">Registration</Link>
            <Link to="/login">Login</Link>
          </>
        )}
      </nav>
    );
  }

  return (
    <nav className="flex justify-around bg-white p-3 shadow text-sm">
      {/* PUBLIC LINKS */}
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/contact">Committee</Link>

      {/* 🟢 FIX 6: Use user?.uid for all checks */}
      {!user?.uid && (
        <>
          <Link to="/registration">Registration</Link>
          <Link to="/login">Login</Link>
        </>
      )}

      {user?.uid && !registered && (
        <>
          <Link to="/registration" className="text-blue-600 font-semibold">
            ⚠️ Complete Registration
          </Link>
          <button onClick={logout} className="text-red-600">
            Logout
          </button>
        </>
      )}

      {user?.uid && registered && (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <button onClick={logout} className="text-red-600">
            Logout ({user.displayName || user.email?.split('@')[0]})
          </button>
        </>
      )}
    </nav>
  );
}