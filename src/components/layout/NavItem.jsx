// NavItem.jsx — Pure, reusable nav item.
// Defined as its own module so it is never re-created on parent re-renders.

import React from "react";
import { Link } from "react-router-dom";
import { COLORS } from "../../constants/app";

/**
 * NavItem
 *
 * Props:
 *   to       {string}          — destination route
 *   icon     {React.Component} — Lucide icon component
 *   label    {string}          — visible label
 *   id       {string}          — stable selector for tours / tests
 *   isActive {boolean}         — whether this tab matches the current route
 */
const NavItem = ({ to, icon: Icon, label, id, isActive }) => (
  <Link
    id={id}
    to={to}
    aria-label={label}
    aria-current={isActive ? "page" : undefined}
    className={[
      // Layout & generous tap target (≥44 px per mobile UX guidance)
      "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl relative",
      // Touch feedback
      "active:scale-95",
      // Smooth scale transition
      "transition-transform duration-150",
      // Keyboard focus ring
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400",
    ].join(" ")}
    style={{
      transform: isActive ? "scale(1.07)" : "scale(1)",
    }}
  >
    {/* Active pip indicator */}
    {isActive && (
      <div
        aria-hidden="true"
        className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
        style={{ background: COLORS.gold }}
      />
    )}

    {/* Icon */}
    <Icon
      size={22}
      color={isActive ? COLORS.gold : "rgba(253,246,236,0.5)"}
    />

    {/* Label — text-xs instead of raw 0.65rem */}
    <span
      className="text-xs"
      style={{
        color:      isActive ? COLORS.gold : "rgba(253,246,236,0.5)",
        fontWeight: isActive ? 700 : 400,
      }}
    >
      {label}
    </span>
  </Link>
);

// Memo prevents sibling-state changes from re-rendering every item
export default React.memo(NavItem);