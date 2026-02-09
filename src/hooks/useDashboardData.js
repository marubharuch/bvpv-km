import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { loadCache, saveCache } from "../utils/cache";

export function useDashboardData(familyId) {
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadFromCache = async () => {
    const cached = await loadCache(`family_${familyId}`);
    if (cached) setFamily(cached);
    setLoading(false);
  };

  const refreshFromFirebase = async () => {
    setLoading(true);
    const snap = await get(ref(db, `families/${familyId}`));
    const data = snap.val();
    setFamily(data);
    saveCache(`family_${familyId}`, data);
    setLoading(false);
  };

  useEffect(() => {
    loadFromCache();
  }, [familyId]);

  return { family, loading, refreshFromFirebase };
}
