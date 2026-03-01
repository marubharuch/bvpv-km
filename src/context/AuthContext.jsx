import { createContext, useContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { saveCache, loadCache } from "../utils/cache";
import { getUserData } from "../services/userService";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,            setUser]            = useState(null);
  const [profile,         setProfile]         = useState(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Load cached user on mount for instant PrivateRoute unblock
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const cachedUser = await loadCache("currentUser");
        if (cachedUser) {
          setUser(cachedUser);
          const cachedProfile = await loadCache(`profile_${cachedUser.uid}`);
          if (cachedProfile) setProfile(cachedProfile);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading cached user:", error);
      }
    };
    loadStoredUser();
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (u) => {
      if (!u) {
        setUser(null);
        setProfile(null);
        localStorage.removeItem("lastUser");
        await saveCache("currentUser", null);
        setIsLoading(false);
        setAuthInitialized(true);
        return;
      }

      try {
        const userData = await getUserData(u.uid, u.email);

        const serializableUser = {
          uid:           u.uid,
          email:         u.email,
          displayName:   u.displayName,
          photoURL:      u.photoURL,
          emailVerified: u.emailVerified,
          familyId:      userData.familyId  || null,
          role:          userData.role      || null,
          familyPin:     userData.familyPin || null,
        };

        setUser(serializableUser);
        localStorage.setItem("lastUser", "true");
        await saveCache("currentUser", serializableUser);

        if (userData && Object.keys(userData).length > 0) {
          setProfile(userData);
          await saveCache(`profile_${u.uid}`, userData);
        } else {
          const cachedProfile = await loadCache(`profile_${u.uid}`);
          if (cachedProfile) setProfile(cachedProfile);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
        setAuthInitialized(true);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, authInitialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
