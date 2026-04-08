// useNavbar.js — All navbar logic in one place.
// BottomNavbar.jsx stays a thin, presentational component.

import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "./navConfig";

/**
 * isActive — startsWith match so nested routes (e.g. /tree/123) stay highlighted.
 * Special-cased for "/" to avoid matching every route.
 */
const isActive = (path, currentPath) => {
  if (path === "/") return currentPath === "/";
  return currentPath.startsWith(path);
};

/**
 * canAccess — role-based visibility.
 *
 * "all"    → always visible
 * "member" → user has a familyId OR is an admin
 * "admin"  → admin only
 */
const canAccess = (item, user) => {
  if (item.access === "all") return true;
  if (item.access === "member") {
    return user?.role === "admin" || !!user?.familyId;
  }
  if (item.access === "admin") {
    return user?.role === "admin";
  }
  return false;
};

/**
 * useNavbar
 *
 * @param {object|null} user — slim auth user from AuthContext (may be null while loading)
 * @returns {{ visibleItems: Array }}
 *   visibleItems — filtered + enriched list ready to render,
 *                  each item has an `active` boolean baked in.
 */
export const useNavbar = (user) => {
  const location = useLocation();
  const pathname = location.pathname;

  // Safe fallback — prevents crashes while auth is still resolving
  const safeUser = user || {};

  const visibleItems = NAV_ITEMS
    .filter((item) => canAccess(item, safeUser))
    .map((item) => ({
      ...item,
      active: isActive(item.to, pathname),
    }));

  return { visibleItems };
};