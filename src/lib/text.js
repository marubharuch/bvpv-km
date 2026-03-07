// lib/text.js — String utilities.

/** "hello world" → "Hello World" */
export function toProperCase(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Email → safe Firebase key (replace . with ,) */
export function emailToKey(email) {
  return String(email || "").toLowerCase().replace(/\./g, ",");
}

/** Generate a short random ID */
export function genId() {
  return Math.random().toString(36).slice(2, 10);
}
