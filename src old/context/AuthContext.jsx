import { createContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
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
        }
      } catch (error) {
        console.error("Error loading cached user:", error);
      }
      // Don't set loading false here anymore
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
        const userRef = ref(db, `users/${u.uid}`);
        const userSnap = await get(userRef);
        const userData = userSnap.val() || {};

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
        if (cachedProfile) setProfile(cachedProfile);

        if (userData) {
          setProfile(userData);
          await saveCache(`profile_${u.uid}`, userData);
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

  // Don't render children until Firebase Auth has initialized
  if (!authInitialized) { // 👈 CHANGE THIS LINE
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}