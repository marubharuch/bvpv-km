import { createContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { saveCache, loadCache } from "../utils/cache";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Start with null, not empty object
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // ✅ LOAD CACHED USER ON INITIAL MOUNT
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        // Check localForage first (where actual user data should be)
        const cachedUser = await loadCache('currentUser');
        
        if (cachedUser) {
          setUser(cachedUser);
          // Also load cached profile if exists
          const cachedProfile = await loadCache(`profile_${cachedUser.uid}`);
          if (cachedProfile) setProfile(cachedProfile);
        }
      } catch (error) {
        console.error("Error loading cached user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // ✅ FIREBASE AUTH STATE LISTENER
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (u) => {
      if (!u) {
        // Clear everything on logout
        setUser(null);
        setProfile(null);
        localStorage.removeItem("lastUser");
        await saveCache('currentUser', null); // Clear from localForage too
        setIsLoading(false);
        return;
      }

      // Convert Firebase user to serializable object
      const serializableUser = {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
        emailVerified: u.emailVerified,
        // Add only what you need, avoid circular references
      };

      // Save to both storages
      setUser(serializableUser);
      localStorage.setItem("lastUser", "true");
      await saveCache('currentUser', serializableUser); // ✅ Save to localForage

      // Handle profile
      const cachedProfile = await loadCache(`profile_${u.uid}`);
      if (cachedProfile) setProfile(cachedProfile);

      const snap = await get(ref(db, `users/${u.uid}`));
      const freshProfile = snap.val();

      if (freshProfile) {
        setProfile(freshProfile);
        await saveCache(`profile_${u.uid}`, freshProfile);
      }
      
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Don't render children until we know auth state
  if (isLoading) {
    return <div>Loading...</div>; // Or your loading component
  }

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}