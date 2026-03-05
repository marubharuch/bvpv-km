// store/AuthContext.jsx — Auth state. Only reads; no writes.
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged }                    from "firebase/auth";
import { cache }    from "../lib/cache";
import { getUser }  from "../db/userDb";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready,   setReady]   = useState(false); // true once onAuthStateChanged fires
  const firebaseUserRef = useRef(null); // keep latest firebaseUser for refreshUser

  /** Call after any action that changes user's RTDB data (e.g. family registration). */
  const refreshUser = async () => {
    const firebaseUser = firebaseUserRef.current;
    if (!firebaseUser) return;
    try {
      const userData = await getUser(firebaseUser.uid, firebaseUser.email);
      const slim = {
        uid:           firebaseUser.uid,
        email:         firebaseUser.email,
        displayName:   firebaseUser.displayName,
        photoURL:      firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        familyId:      userData.familyId  || null,
        role:          userData.role      || null,
        memberId:      userData.memberId  || null,
      };
      setUser(slim);
      setProfile(userData);
      await cache.set("auth:user", slim);
      await cache.set(`auth:profile:${slim.uid}`, userData);
    } catch (e) {
      console.error("refreshUser error:", e);
    }
  };

  useEffect(() => {
    // Hydrate from cache immediately so UI doesn't flash
    (async () => {
      const cu = await cache.get("auth:user");
      const cp = cu ? await cache.get(`auth:profile:${cu.uid}`) : null;
      if (cu) { setUser(cu); if (cp) setProfile(cp); }
    })();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        await cache.remove("auth:user");
        setReady(true);
        return;
      }

      try {
        await firebaseUser.getIdToken(true);
        await new Promise(r => setTimeout(r, 400)); // let RTDB auth propagate

        firebaseUserRef.current = firebaseUser;

        const userData = await getUser(firebaseUser.uid, firebaseUser.email);

        const slim = {
          uid:           firebaseUser.uid,
          email:         firebaseUser.email,
          // Prefer RTDB displayName (set for email users) over Firebase Auth (null for email users)
          displayName:   userData.displayName || firebaseUser.displayName || null,
          photoURL:      firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          familyId:      userData.familyId  || null,
          role:          userData.role      || null,
          memberId:      userData.memberId  || null,
          mobile:        userData.mobile    || null,
          countryCode:   userData.countryCode || "+91",
        };

        setUser(slim);
        setProfile(userData);
        await cache.set("auth:user",                  slim);
        await cache.set(`auth:profile:${slim.uid}`,  userData);
      } catch (e) {
        console.error("Auth load error:", e);
      } finally {
        setReady(true);
      }
    });
    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, ready, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};