// hooks/useContactPicker.js — Native Contact Picker API wrapper.
import { useState, useCallback } from "react";

export function useContactPicker() {
  const [picking, setPicking] = useState(false);
  const [error,   setError]   = useState("");

  const isSupported = "contacts" in navigator && "ContactsManager" in window;

  const pick = useCallback(async () => {
    if (!isSupported) { setError("Contact Picker not supported on this device."); return []; }
    setPicking(true);
    setError("");
    try {
      const raw = await navigator.contacts.select(["name","tel"], { multiple: true });
      return raw
        .filter(c => c.tel?.length)
        .map(c => ({
          name:  c.name?.[0] || "",
          phone: c.tel[0].replace(/[\s\-().+]/g, "").slice(-10),
          countryCode: "+91",
        }))
        .filter(c => c.phone.length >= 7);
    } catch (e) {
      if (e.name !== "AbortError") setError("Could not open contacts.");
      return [];
    } finally {
      setPicking(false);
    }
  }, [isSupported]);

  return { pick, picking, error, isSupported };
}
