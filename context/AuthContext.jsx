import { createContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get,set } from "firebase/database";
import { db } from "../firebase";
import { saveCache, loadCache } from "../utils/cache";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false); // 👈 ADD THIS

  // ✅ LOAD CACHED USER ON INITIAL MOUNT
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const cachedUser = await loadCache('currentUser');
        
        if (cachedUser) {
          setUser(cachedUser);
          const cachedProfile = await loadCache(`profile_${cachedUser.uid}`);
          if (cachedProfile) setProfile(cachedProfile);
          setIsLoading(false); // ✅ Cache hit — unblock PrivateRoute immediately
        }
        // If no cache, isLoading stays true until onAuthStateChanged fires
      } catch (error) {
        console.error("Error loading cached user:", error);
      }
    };

    loadStoredUser();
  }, []);

  // ✅ FIREBASE AUTH STATE LISTENER
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (u) => {
      if (!u) {
        setUser(null);
        setProfile(null);
        localStorage.removeItem("lastUser");
        await saveCache('currentUser', null);
        setIsLoading(false);
        setAuthInitialized(true); // 👈 ADD THIS
        return;
      }

      try {
        // 🔴 IMPORTANT: Get user data from Realtime Database
     // 🔴 FIRST try UID-based record
let userData = {};
let userSnap = await get(ref(db, `users/${u.uid}`));

if (userSnap.exists()) {
  userData = userSnap.val();
} else if (u.email) {
  // 🟡 FALLBACK — old data stored by emailKey
  const emailKey = u.email
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/@/g, "_");

  const emailSnap = await get(ref(db, `users/${emailKey}`));

  if (emailSnap.exists()) {
    userData = emailSnap.val();

    // 🔥 OPTIONAL AUTO-MIGRATION (recommended)
    // Save under UID for future use
    await saveCache(`migrated_${u.uid}`, true);
    await set(ref(db, `users/${u.uid}`), {
      ...userData,
      email: u.email
    });
  }
}

        // ✅ Create serializable user object WITH familyId
        const serializableUser = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          emailVerified: u.emailVerified,
          familyId: userData.familyId || null,
          role: userData.role || null,
          familyPin: userData.familyPin || null
        };

        setUser(serializableUser);
        localStorage.setItem("lastUser", "true");
        await saveCache('currentUser', serializableUser);

        // Handle profile
        const cachedProfile = await loadCache(`profile_${u.uid}`);
        // Only use cached profile as fallback if Firebase has no data
        if (userData && Object.keys(userData).length > 0) {
          setProfile(userData);
          await saveCache(`profile_${u.uid}`, userData);
        } else if (cachedProfile) {
          setProfile(cachedProfile);
        }
        
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
        setAuthInitialized(true); // 👈 ADD THIS
      }
    });

    return () => unsub();
  }, []);

  // ✅ Don't block public pages — PrivateRoute handles auth-gating for protected routes
  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ⭐ ADD THIS AT BOTTOM
import { useContext } from "react";

export const useAuth = () => useContext(AuthContext);