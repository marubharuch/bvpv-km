import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setRegistered(false);
        return;
      }

      const snap = await get(ref(db, "families"));
      let found = false;

      snap.forEach(f => {
        if (f.child("members").hasChild(u.uid)) found = true;
      });

      setRegistered(found);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(getAuth());
  };

  return (
    <nav className="flex justify-around bg-white p-3 shadow text-sm">

      {!user && (
        <>
          <Link to="/">Home</Link>
          <Link to="/registration">Registration</Link>
          <Link to="/login">Login</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </>
      )}

      {user && !registered && (
        <>
          <Link to="/">Home</Link>
          <Link to="/registration">Complete Registration</Link>
          <button onClick={logout}>Logout</button>
        </>
      )}

      {user && registered && (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/students">Students</Link>
          <Link to="/profile">Profile</Link>
          <button onClick={logout}>Logout</button>
        </>
      )}

    </nav>
  );
}
