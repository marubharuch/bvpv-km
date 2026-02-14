import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import localforage from "localforage";

import {
  Home,
  LayoutDashboard,
  Info,
  User,
  LogIn
} from "lucide-react";

export default function Navbar() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  const [registered, setRegistered] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCachedStatus = async () => {
      if (!user?.uid) {
        setRegistered(false);
        setLoading(false);
        return;
      }

      const cacheKey = `registered_${user.uid}`;
      const cached = await localforage.getItem(cacheKey);

      if (cached !== null) {
        setRegistered(cached);
        setLoading(false);
      } else {
        const snap = await get(ref(db, `users/${user.uid}/familyId`));
        const hasFamily = snap.exists();

        setRegistered(hasFamily);
        setLoading(false);
        await localforage.setItem(cacheKey, hasFamily);
      }
    };

    loadCachedStatus();
  }, [user?.uid]);

  if (loading) return null;

  const tabClass = (path) =>
    `flex flex-col items-center ${
      location.pathname === path
        ? "text-blue-600"
        : "text-gray-500"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-xl flex justify-around items-center py-2 rounded-t-2xl z-50">

      {/* 🏠 Home */}
      <Link to="/" className={tabClass("/")}>
        <Home size={24} />
        <span className="text-xs">Home</span>
      </Link>

      {/* ℹ️ About */}
      <Link to="/about" className={tabClass("/about")}>
        <Info size={24} />
        <span className="text-xs">About</span>
      </Link>

      {/* 👨‍💻 Developer */}
      <Link to="/contact" className={tabClass("/contact")}>
        <User size={24} />
        <span className="text-xs">Developer</span>
      </Link>

      {/* 🔄 Dynamic Last Tab */}
      {!user?.uid ? (
        <Link to="/login" className={tabClass("/login")}>
          <LogIn size={24} />
          <span className="text-xs">Login</span>
        </Link>
      ) : registered ? (
        <Link to="/dashboard" className={tabClass("/dashboard")}>
          <LayoutDashboard size={24} />
          <span className="text-xs">Dashboard</span>
        </Link>
      ) : (
        <Link to="/registration" className={tabClass("/registration")}>
          <LayoutDashboard size={24} />
          <span className="text-xs">Register</span>
        </Link>
      )}
    </nav>
  );
}
