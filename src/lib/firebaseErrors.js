// lib/firebaseErrors.js — Map Firebase error codes to friendly messages.
// Replaces the fragile string.replace("Firebase: ", "") hack in LoginPage.

const ERROR_MAP = {
  "auth/user-not-found":        "No account found with this email.",
  "auth/wrong-password":        "Incorrect password. Please try again.",
  "auth/invalid-credential":    "Incorrect email or password.",
  "auth/email-already-in-use":  "An account with this email already exists.",
  "auth/weak-password":         "Password must be at least 6 characters.",
  "auth/invalid-email":         "Please enter a valid email address.",
  "auth/too-many-requests":     "Too many attempts. Please try again later.",
  "auth/network-request-failed":"Network error. Check your connection.",
  "auth/popup-closed-by-user":  "Google sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in cancelled.",
  "auth/user-disabled":         "This account has been disabled.",
};

/**
 * Convert a Firebase Auth error into a friendly string.
 * @param {Error} error — Firebase error object
 * @returns {string}
 */
export function friendlyAuthError(error) {
  if (!error) return "Something went wrong.";
  return ERROR_MAP[error.code] || error.message || "Something went wrong.";
}
