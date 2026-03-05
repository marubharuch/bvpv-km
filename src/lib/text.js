// lib/text.js — Text formatting helpers.

/** "ramesh patel" → "Ramesh Patel" */
export function toProperCase(str) {
  if (!str) return "";
  return String(str).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/** Email → Firebase-safe key (no dots, no @). */
export function emailToKey(email) {
  if (!email) return "";
  return email.trim().toLowerCase().replace(/\./g, ",").replace(/@/g, "_");
}

/** "c_1234_ab56" style unique ID. */
export function genId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
