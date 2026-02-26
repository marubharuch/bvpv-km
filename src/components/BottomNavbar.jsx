import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import localforage from "localforage";
import { Home, LayoutDashboard, Info, User,Crown, LogIn, Trophy, BookOpen } from "lucide-react";

export default function BottomNavbar() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

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
      }

      const snap = await get(ref(db, `users/${user.uid}/familyId`));
      const hasFamily = snap.exists();

      if (cached === null || hasFamily !== cached) {
        setRegistered(hasFamily);
        await localforage.setItem(cacheKey, hasFamily);
      }

      setLoading(false);
    };

    loadStatus();
  }, [user?.uid]);

  if (loading) return null;

  const isActive = (path) => location.pathname === path;

  const tabClass = (path) =>
    `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
      isActive(path) ? "scale-105" : ""
    }`;

  const iconColor   = (path) => isActive(path) ? "#C9A84C" : "rgba(253,246,236,0.5)";
  const labelStyle  = (path) => ({
    color:      isActive(path) ? "#C9A84C" : "rgba(253,246,236,0.5)",
    fontWeight: isActive(path) ? 700 : 400,
    fontSize:   "0.65rem",
  });
  const activeIndicator = (path) =>
    isActive(path) ? (
      <div
        className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
        style={{ background: "#C9A84C" }}
      />
    ) : null;

  const NavItem = ({ to, icon: Icon, label }) => (
    <Link to={to} className={tabClass(to)} style={{ position: "relative" }}>
      {activeIndicator(to)}
      <Icon size={22} color={iconColor(to)} />
      <span style={labelStyle(to)}>{label}</span>
    </Link>
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-2 z-50 safe-area-pb"
      style={{
        background: "linear-gradient(135deg, #5A1020 0%, #7B1C2E 100%)",
        borderTop: "1px solid rgba(201,168,76,0.4)",
        boxShadow: "0 -4px 20px rgba(90,16,32,0.35)",
      }}
    >
      <NavItem to="/"          icon={Home}          label="Home"        />
      <NavItem to="/about"  icon={Crown}       label="Leaders"    />
      <NavItem to="/contact"     icon={Info}           label="About"       />
      <NavItem to="/connectors" icon={Trophy}        label="Competition" />

      {/* Dynamic last tab */}
      {!user?.uid ? (
        <NavItem to="/login"        icon={LogIn}         label="Login"     />
      ) : registered ? (
        <NavItem to="/dashboard"    icon={LayoutDashboard} label="Dashboard" />
      ) : (
        <NavItem to="/registration" icon={LayoutDashboard} label="Register"  />
      )}
    </nav>
  );
}