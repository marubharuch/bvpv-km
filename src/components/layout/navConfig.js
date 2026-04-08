// navConfig.js — Single source of truth for bottom navbar items.
// To add / remove / reorder a tab: edit NAV_ITEMS only. No JSX changes needed.

import { Home, LayoutDashboard, Gamepad2, Info } from "lucide-react";

/**
 * NAV_ITEMS
 *
 * Fields:
 *   to      — route path used for <Link> and active detection
 *   icon    — Lucide icon component
 *   label   — visible label
 *   id      — tour / test selector (keep stable)
 *   access  — "all" | "member" | "admin"
 */
export const NAV_ITEMS = [
  { to: "/",        icon: Home,            label: "Home",  id: "tour-home",  access: "all"    },
  { to: "/tree",    icon: LayoutDashboard, label: "Tree",  id: "tour-tree",  access: "member" },
  { to: "/games",   icon: Gamepad2,        label: "Games", id: "tour-games", access: "member" },
  { to: "/contact", icon: Info,            label: "About", id: "tour-about", access: "all"    },
];