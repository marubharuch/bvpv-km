// ─── BottomNavbar.jsx ─────────────────────────────────────────────────────────
// Visibility by user type:
//   Visitor / anonymous / no-family  → Home, About
//   Member (has familyId)            → Home, Tree, Games, About
//   Admin (role === "admin")         → Home, Tree, Games, About
//
// All menu config  → navConfig.js
// All logic        → useNavbar.js
// Item rendering   → NavItem.jsx
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useAuth } from "../../store/AuthContext";
import { useNavbar } from "./useNavbar";
import NavItem from "./NavItem";

export default function BottomNavbar() {
  const { user, ready } = useAuth();

  // Don't render during initial auth resolution — prevents a flash
  // of incorrectly filtered items (e.g. member tabs appearing for guests).
  if (!ready) return null;

  return <NavbarInner user={user} />;
}

// ── Inner component keeps the hook call unconditional ────────────────────────
const NavbarInner = React.memo(function NavbarInner({ user }) {
  const { visibleItems } = useNavbar(user);

  return (
    <nav
      role="navigation"
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-2 z-50"
      style={{
        background:    "linear-gradient(135deg,#5A1020,#7B1C2E)",
        borderTop:     "1px solid rgba(201,168,76,0.4)",
        boxShadow:     "0 -4px 20px rgba(90,16,32,0.35)",
        paddingBottom: "env(safe-area-inset-bottom)", // iPhone notch safety
      }}
    >
      {visibleItems.map((item) => (
        <NavItem
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.label}
          id={item.id}
          isActive={item.active}
        />
      ))}
    </nav>
  );
});