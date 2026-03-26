// ─── BottomNavbar.jsx ─────────────────────────────────────────────────────────
// OnboardingTour માટે દરેક NavItem ને id ઉમેર્યો છે
// ─────────────────────────────────────────────────────────────────────────────

import { Link, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, Info, Crown, LogIn, Trophy } from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import { COLORS } from "../../constants/app";

export default function BottomNavbar() {
  const { user } = useAuth();
  const location = useLocation();

  const hasFamily = !!user?.familyId;

  const active = path => location.pathname === path;
  const color  = path => active(path) ? COLORS.gold : "rgba(253,246,236,0.5)";
  const weight = path => active(path) ? 700 : 400;

  // ↓ id prop ઉમેર્યો — tour targeting માટે
  const NavItem = ({ to, icon: Icon, label, id }) => (
    <Link
      id={id}                              // ← આ જ id tour માં target તરીકે વપરાય
      to={to}
      className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl relative"
      style={{ transform: active(to) ? "scale(1.07)" : "scale(1)", transition: "transform 0.15s" }}
    >
      {active(to) && (
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
          style={{ background: COLORS.gold }} />
      )}
      <Icon size={22} color={color(to)} />
      <span style={{ color: color(to), fontWeight: weight(to), fontSize: "0.65rem" }}>{label}</span>
    </Link>
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-2 z-50"
      style={{
        background: "linear-gradient(135deg,#5A1020,#7B1C2E)",
        borderTop: "1px solid rgba(201,168,76,0.4)",
        boxShadow: "0 -4px 20px rgba(90,16,32,0.35)"
      }}
    >
      {/* id="tour-home" → tourSteps.js માં target: "tour-home" */}
      <NavItem to="/"           icon={Home}            label="Home"        id="tour-home"        />
      <NavItem to="/about"      icon={Crown}           label="Leaders"     id="tour-leaders"     />
      <NavItem to="/contact"    icon={Info}            label="About"       id="tour-about"       />
      <NavItem to="/connectors" icon={Trophy}          label="Competition" id="tour-competition" />

      {/* Last item — login / register / dashboard */}
      {!user?.uid
        ? <NavItem to="/login"        icon={LogIn}           label="Login"       id="tour-last" />
        : hasFamily
          ? <NavItem to="/tree"    icon={LayoutDashboard} label="Dashboard"   id="tour-last"  />
          : <NavItem to="/registration" icon={LayoutDashboard} label="Register"    id="tour-last"  />
      }
    </nav>
  );
}