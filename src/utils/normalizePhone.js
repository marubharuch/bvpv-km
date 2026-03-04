/**
 * utils/normalizePhone.js
 * FIX BUG 5: slice(-10) handles +91, 91, 0091 in all cases.
 */
export function normalizeMobile(mobile) {
  if (!mobile) return "";
  const digits = String(mobile).trim().replace(/\D/g, "");
  return digits.slice(-10);
}
export function buildFullMobile(countryCode, digits10) {
  const cc  = (countryCode || "+91").trim();
  const num = normalizeMobile(digits10);
  return num ? `${cc}${num}` : "";
}
