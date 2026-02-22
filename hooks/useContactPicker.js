import { useState, useCallback } from "react";

function supported() {
  return typeof navigator !== "undefined" &&
    "contacts" in navigator &&
    "ContactsManager" in window;
}

export function useContactPicker() {
  const [picking, setPicking] = useState(false);
  const [error, setError]     = useState(null);

  const pick = useCallback(async () => {
    if (!supported()) return [];
    setError(null);
    setPicking(true);
    try {
      const raw = await navigator.contacts.select(["name", "tel"], { multiple: true });
      return raw.map((r) => ({
        name:  r.name?.[0]  ?? "",
        phone: r.tel?.[0]   ?? "",
      }));
    } catch (e) {
      if (e.name !== "AbortError") setError("Could not open contacts.");
      return [];
    } finally {
      setPicking(false);
    }
  }, []);

  return { pick, picking, error, isSupported: supported() };
}
