import { Link, useLocation }   from "react-router-dom";
import { Home, LayoutDashboard, Info, Crown, LogIn, Trophy } from "lucide-react";
import { useAuth }  from "../../store/AuthContext";
import { COLORS }   from "../../constants/app";

export default function BottomNavbar() {
  const { user }   = useAuth();
  const location   = useLocation();

  // Derive directly from context — updates instantly when refreshUser() is called
  const hasFamily  = !!user?.familyId;

  const active = path => location.pathname === path;
  const color  = path => active(path) ? COLORS.gold : "rgba(253,246,236,0.5)";
  const weight = path => active(path) ? 700 : 400;

  const NavItem = ({ to, icon: Icon, label }) => (
    <Link to={to} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl relative"
      style={{ transform: active(to) ? "scale(1.07)" : "scale(1)", transition: "transform 0.15s" }}>
      {active(to) && (
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
          style={{ background: COLORS.gold }} />
      )}
      <Icon size={22} color={color(to)} />
      <span style={{ color: color(to), fontWeight: weight(to), fontSize: "0.65rem" }}>{label}</span>
    </Link>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-2 z-50"
      style={{ background: "linear-gradient(135deg,#5A1020,#7B1C2E)", borderTop: "1px solid rgba(201,168,76,0.4)", boxShadow: "0 -4px 20px rgba(90,16,32,0.35)" }}>
      <NavItem to="/"           icon={Home}            label="Home"        />
      <NavItem to="/about"      icon={Crown}           label="Leaders"     />
      <NavItem to="/contact"    icon={Info}            label="About"       />
      <NavItem to="/connectors" icon={Trophy}          label="Competition" />
      {!user?.uid
        ? <NavItem to="/login"        icon={LogIn}           label="Login"       />
        : hasFamily
          ? <NavItem to="/dashboard"    icon={LayoutDashboard} label="Dashboard"   />
          : <NavItem to="/registration" icon={LayoutDashboard} label="Register"    />
      }
    </nav>
  );
}