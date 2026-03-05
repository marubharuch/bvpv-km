// lib/phone.js
// ─────────────────────────────────────────────────────────────────
// UNIFORM RULE — entire app:
//
//   members/{id}/mobile       = "+919974021397"
//   users/{uid}/mobile        = "+919974021397"
//   mobileIndex KEY           = "+919974021397"  ← full number as key
//   mobileIndex/countryCode   = "+91"
//
// toMobileKey() is REMOVED — no more 10-digit anywhere.
// ─────────────────────────────────────────────────────────────────

import { COUNTRY_CODES } from "../constants/app";

/**
 * Build fullMobile from parts. Idempotent.
 * toFullMobile("+91", "9974021397")   → "+919974021397"
 * toFullMobile("+91", "+919974021397") → "+919974021397"
 */
export function toFullMobile(countryCode, digits) {
  const cc  = (countryCode || "+91").trim();
  const raw = String(digits || "").replace(/\D/g, "");
  if (!raw) return "";
  const ccDigits = cc.replace("+", "");
  const num = raw.startsWith(ccDigits) ? raw.slice(ccDigits.length) : raw;
  return `${cc}${num.slice(-10)}`;
}

/**
 * Encode fullMobile for use as a Firebase RTDB key.
 * Firebase keys cannot contain "." but "+" and digits are fine.
 * "+919974021397" → "+919974021397"  (no change needed)
 */
export function toMobileKey(fullMobile) {
  if (!fullMobile) return "";
  // Ensure it starts with +
  const s = String(fullMobile).trim();
  return s.startsWith("+") ? s : `+91${s.replace(/\D/g, "").slice(-10)}`;
}

/**
 * Split fullMobile → { countryCode, digits }
 * splitMobile("+919974021397") → { countryCode: "+91", digits: "9974021397" }
 */
export function splitMobile(fullMobile) {
  if (!fullMobile) return { countryCode: "+91", digits: "" };
  const s = String(fullMobile).trim();
  if (!s.startsWith("+")) {
    return { countryCode: "+91", digits: s.replace(/\D/g, "").slice(-10) };
  }
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const { code } of sorted) {
    if (s.startsWith(code)) {
      return { countryCode: code, digits: s.slice(code.length) };
    }
  }
  return { countryCode: "+91", digits: s.replace(/\D/g, "").slice(-10) };
}

/** Validate Indian mobile digits (10 digits, starts 6-9) */
export function isValidIndianMobile(digits) {
  return /^[6-9]\d{9}$/.test(String(digits || ""));
}
