import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { signOut, getAuth } from "firebase/auth";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const { user,profile } = useContext(AuthContext);   // ✅ GLOBAL AUTH
  console.log("Navbar - user:", user,profile);
  const [registered, setRegistered] = useState(null); // null = loading

  useEffect(() => {
    const checkFamily = async () => {
      if (!user) {
        setRegistered(false);
        return;
      }

      const snap = await get(ref(db, `users/${user.uid}/familyId`));
      setRegistered(!!snap.val());
    };

    checkFamily();
  }, [user]);

  const logout = async () => {
    await signOut(getAuth());
  };



  return (
    <nav className="flex justify-around bg-white p-3 shadow text-sm">

      {!user && (
        <>
          <Link to="/">Home</Link>
          <Link to="/registration">Registration</Link>
          
          <Link to="/about">About</Link>
            
          <Link to="/contact">Committee</Link>
          <Link to="/login">Login</Link>
        </>
      )}

      {user && !registered && (
        <>
          <Link to="/">Home</Link>
          <Link to="/registration">Complete Registration</Link>
          <Link to="/about">About</Link>
            
          <Link to="/contact">Committee</Link>
          <button onClick={logout}>Logout</button>
        </>
      )}

      {user && registered && (
        <>
        <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/about">About</Link>
            
          <Link to="/contact">Committee</Link>
          <button onClick={logout}>Logout</button>
        </>
      )}
    </nav>
  );
}
