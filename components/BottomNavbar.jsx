import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Home, LayoutDashboard, Info, LogIn, Trophy, BookOpen } from "lucide-react";

export default function BottomNavbar() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  // ✅ user.familyId is already set in AuthContext — zero Firebase read needed
  const registered = !!user?.familyId;

  const tab = (path) =>
    `flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
      location.pathname === path
        ? "text-blue-600"
        : "text-gray-400"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-xl flex justify-around items-center py-2 z-50 safe-area-pb">

      {/* 🏠 Home */}
      <Link to="/" className={tab("/")}>
        <Home size={22} />
        <span className="text-xs font-medium">Home</span>
      </Link>

      {/* 🎓 Students */}
      <Link to="/students" className={tab("/students")}>
        <BookOpen size={22} />
        <span className="text-xs font-medium">Students</span>
      </Link>

      {/* ℹ️ About */}
      <Link to="/about" className={tab("/about")}>
        <Info size={22} />
        <span className="text-xs font-medium">About</span>
      </Link>

      {/* 🏆 Competition */}
      <Link to="/connectors" className={tab("/connectors")}>
        <Trophy size={22} />
        <span className="text-xs font-medium">Competition</span>
      </Link>

      {/* 🔄 Dynamic last tab */}
      {!user?.uid ? (
        <Link to="/login" className={tab("/login")}>
          <LogIn size={22} />
          <span className="text-xs font-medium">Login</span>
        </Link>
      ) : registered ? (
        <Link to="/dashboard" className={tab("/dashboard")}>
          <LayoutDashboard size={22} />
          <span className="text-xs font-medium">Dashboard</span>
        </Link>
      ) : (
        <Link to="/registration" className={tab("/registration")}>
          <LayoutDashboard size={22} />
          <span className="text-xs font-medium">Register</span>
        </Link>
      )}

    </nav>
  );
}
