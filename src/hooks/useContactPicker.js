// hooks/useContactPicker.js — Native Contact Picker API wrapper.
import { useState, useCallback } from "react";
import { splitMobile }           from "../lib/phone";

export function useContactPicker() {
  const [picking, setPicking] = useState(false);
  const [error,   setError]   = useState("");

  const isSupported = "contacts" in navigator && "ContactsManager" in window;

  const pick = useCallback(async () => {
    if (!isSupported) { setError("Contact Picker not supported on this device."); return []; }
    setPicking(true);
    setError("");
    try {
      const raw = await navigator.contacts.select(["name", "tel"], { multiple: true });
      return raw
        .filter(c => c.tel?.length)
        .map(c => {
          const tel  = c.tel[0].trim();
          const full = tel.startsWith("+") ? tel : `+91${tel.replace(/\D/g, "").slice(-10)}`;
          const { countryCode, digits } = splitMobile(full);
          return { name: c.name?.[0] || "", phone: digits, countryCode };
        })
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
