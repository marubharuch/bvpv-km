// store/AuthContext.jsx
// Improvements over original:
//  - cache.set uses TTL (10 min) — stale auth no longer persists forever
//  - No flash of unauthenticated UI (cache hydration kept)
//  - Firebase SDK still lazy loaded (keeps bundle small)

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { cache, TTL }  from "../lib/cache";
import { getUser }     from "../db/userDb";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready,   setReady]   = useState(false);
  const firebaseUserRef       = useRef(null);

  const refreshUser = async () => {
    const firebaseUser = firebaseUserRef.current;
    if (!firebaseUser) return;
    try {
      const userData = await getUser(firebaseUser.uid, firebaseUser.email);
      const slim     = buildSlimUser(firebaseUser, userData);
      setUser(slim);
      setProfile(userData);
      await cache.set("auth:user",                    slim,     TTL.AUTH);
      await cache.set(`auth:profile:${slim.uid}`,     userData, TTL.AUTH);
    } catch (e) {
      console.error("refreshUser error:", e);
    }
  };

  // Hydrate from cache immediately — no flash of unauthenticated UI
  useEffect(() => {
    (async () => {
      const cu = await cache.get("auth:user");
      const cp = cu ? await cache.get(`auth:profile:${cu.uid}`) : null;
      if (cu) { setUser(cu); if (cp) setProfile(cp); }
    })();
  }, []);

  // Firebase loaded lazily — SDK only downloads AFTER first render
  useEffect(() => {
    let unsub;
    (async () => {
      // Import auth directly from our firebase.js — already initialised with the app.
      // Do NOT call getAuth() again — that risks creating a second instance
      // which never fires onAuthStateChanged, leaving the UI stuck after Google login.
      const { auth } = await import("../lib/firebase");
      const { onAuthStateChanged } = await import("firebase/auth");

      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          await cache.remove("auth:user");
          setReady(true);
          return;
        }

        try {
          await firebaseUser.getIdToken(false); // use cached token

          firebaseUserRef.current = firebaseUser;

          const userData = await getUser(firebaseUser.uid, firebaseUser.email);
          const slim     = buildSlimUser(firebaseUser, userData);

          setUser(slim);
          setProfile(userData);
          await cache.set("auth:user",                slim,     TTL.AUTH);
          await cache.set(`auth:profile:${slim.uid}`, userData, TTL.AUTH);
        } catch (e) {
          console.error("onAuthStateChanged error:", e);
          setUser(null);
        } finally {
          setReady(true);
        }
      });
    })();

    return () => unsub?.();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, ready, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// ── Helpers ──────────────────────────────────────────────────────

function buildSlimUser(firebaseUser, userData) {
  return {
    uid:           firebaseUser.uid,
    email:         firebaseUser.email,
    displayName:   userData.displayName || firebaseUser.displayName || null,
    photoURL:      firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    familyId:      userData.familyId    || null,
    role:          userData.role        || null,
    memberId:      userData.memberId    || null,
    mobile:        userData.mobile      || null,
    countryCode:   userData.countryCode || "+91",
  };
}