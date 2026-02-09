import { createContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { saveCache, loadCache } from "../utils/cache";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
  return localStorage.getItem("lastUser") ? {} : null;
});

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (u) => {
     if (!u) {
  setUser(null);
  setProfile(null);
  localStorage.removeItem("lastUser");
  return;
}

setUser(u);
localStorage.setItem("lastUser", "true");


      // Cache profile first
      const cachedProfile = await loadCache(`profile_${u.uid}`);
      if (cachedProfile) setProfile(cachedProfile);

      // Fetch latest profile
      const snap = await get(ref(db, `users/${u.uid}`));
      const freshProfile = snap.val();

      if (freshProfile) {
        setProfile(freshProfile);
        saveCache(`profile_${u.uid}`, freshProfile);
      }
    });

    return () => unsub();
  }, []);

  return (
  <AuthContext.Provider value={{ user, profile }}>
    {children}
  </AuthContext.Provider>
);

}


