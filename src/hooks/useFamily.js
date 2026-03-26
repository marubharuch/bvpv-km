// hooks/useFamily.js — Cached family + members fetch.
// Components use this hook instead of calling getFamilyWithMembers directly.
// Benefit: single fetch, shared across components, auto-refresh on demand.

import { useState, useEffect, useCallback } from "react";
//import { getFamilyWithMembers, invalidateFamilyCache } from "../db/familyDb";

/**
 * @param {string|null} familyId
 * @returns {{ family, members, loading, error, refresh }}
 */
export function useFamily(familyId) {
  const [family,  setFamily]  = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(!!familyId);
  const [error,   setError]   = useState(null);

  const load = useCallback(async (forceRefresh = false) => {
    if (!familyId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await getFamilyWithMembers(familyId, forceRefresh);
      if (data) {
        const { members: m = [], ...fam } = data;
        setFamily(fam);
        setMembers(Array.isArray(m) ? m : Object.values(m));
      }
    } catch (e) {
      console.error("useFamily error:", e);
      setError("Could not load family data.");
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => { load(); }, [load]);

  /** Force re-fetch from Firebase (e.g. after a member update). */
  const refresh = useCallback(() => load(true), [load]);

  return { family, members, loading, error, refresh };
}
