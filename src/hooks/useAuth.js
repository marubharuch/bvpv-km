/**
 * hooks/useAuth.js
 * Convenience hook to consume AuthContext.
 */

import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useAuth() {
  return useContext(AuthContext);
}
