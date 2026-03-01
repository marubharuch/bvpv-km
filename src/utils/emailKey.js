/**
 * utils/emailKey.js
 * Shared email → Firebase-safe key conversion.
 * Firebase doesn't allow "." or "@" in keys.
 */

export function emailToKey(email) {
  if (!email) return "";
  return email
    .trim()
    .toLowerCase()
    .replace(/\./g, ",")
    .replace(/@/g, "_");
}
