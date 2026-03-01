/**
 * utils/normalizePhone.js
 * Shared mobile normalization utility used across services and components.
 */

/**
 * Normalize a mobile number to its last 10 digits (India-style).
 * Also handles international numbers like +919876543210 → 9876543210
 */
export function normalizeMobile(mobile) {
  if (!mobile) return "";
  const cleaned = String(mobile).trim();
  // If it starts with +, strip all non-digits and take last 10
  return cleaned.replace(/\D/g, "").slice(-10);
}

/**
 * Build a full international number: "+91" + "9876543210"
 * Useful when storing full mobile in user node.
 */
export function buildFullMobile(countryCode, digits10) {
  const cc = (countryCode || "+91").trim();
  const num = normalizeMobile(digits10);
  return num ? `${cc}${num}` : "";
}
