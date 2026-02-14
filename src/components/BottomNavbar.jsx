import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export default function BottomNavbar() {
  const { user } = useContext(AuthContext);

  const [registered, setRegistered] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
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

    loadStatus();
  }, [user?.uid]);

  if (loading) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg flex justify-around items-center py-2 z-50">

      {/* 🏠 Home */}
      <Link to="/" className="flex flex-col items-center text-gray-700">
        <Home size={22} />
        <span className="text-xs">Home</span>
      </Link>

      {/* ℹ️ About */}
      <Link to="/about" className="flex flex-col items-center text-gray-700">
        <Info size={22} />
        <span className="text-xs">About</span>
      </Link>

      {/* 👨‍💻 Developer */}
      <Link to="/contact" className="flex flex-col items-center text-gray-700">
        <User size={22} />
        <span className="text-xs">Developer</span>
      </Link>

      {/* 🔄 Dynamic */}
      {!user?.uid ? (
        <Link to="/login" className="flex flex-col items-center text-gray-700">
          <LogIn size={22} />
          <span className="text-xs">Login</span>
        </Link>
      ) : registered ? (
        <Link to="/dashboard" className="flex flex-col items-center text-blue-600">
          <LayoutDashboard size={22} />
          <span className="text-xs">Dashboard</span>
        </Link>
      ) : (
        <Link to="/registration" className="flex flex-col items-center text-blue-600">
          <LayoutDashboard size={22} />
          <span className="text-xs">Register</span>
        </Link>
      )}

    </nav>
  );
}
