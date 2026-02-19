import { useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
// useContactPicker
//
// All contact state and logic lives here.
// Used in StudentFormPage so state survives modal open/close.
//
// Returns:
//   contacts          — array of { name, number, relation }
//   addManual()       — append blank contact
//   pickFromDevice()  — open native contact picker
//   updateContact()   — update a field on one contact
//   removeContact()   — remove contact by index
//   confirmContacts() — validate and return confirmed list
//   loading           — device picker in progress
//   error             — current error string
//   clearError()
// ─────────────────────────────────────────────────────────────

export function useContactPicker(initialContacts = []) {
  const [contacts, setContacts] = useState(initialContacts);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // ── Add a blank row ──
  const addManual = useCallback(() => {
    setContacts(prev => [...prev, { name: "", number: "", relation: "" }]);
    setError("");
  }, []);

  // ── Pick from device ──
  const pickFromDevice = useCallback(async () => {
    if (!("contacts" in navigator && "ContactsManager" in window)) {
      setError("Contact picker not supported on this browser. Please add manually.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const parsed = picked
        .map(c => ({
          name:     (Array.isArray(c.name) ? c.name[0] : c.name)   || "",
          number:   (Array.isArray(c.tel)  ? c.tel[0]  : c.tel)    || "",
          relation: ""
        }))
        .filter(c => c.name || c.number);

      if (parsed.length) {
        setContacts(prev => [...prev, ...parsed]);
      }
    } catch (e) {
      console.error("Contact picker error:", e);
      setError("Could not access contacts. Please add manually.");
    }
    setLoading(false);
  }, []);

  // ── Update one field on one contact ──
  const updateContact = useCallback((index, field, value) => {
    setContacts(prev =>
      prev.map((c, i) => i === index ? { ...c, [field]: value } : c)
    );
    setError("");
  }, []);

  // ── Remove a contact by index ──
  const removeContact = useCallback((index) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
    setError("");
  }, []);

  // ── Validate and return confirmed list (or null if invalid) ──
  const confirmContacts = useCallback(() => {
    const empty  = contacts.filter(c => !c.name.trim() && !c.number.trim());
    const noRel  = contacts.filter(c => !c.relation);

    if (!contacts.length) {
      setError("Please add at least one family contact.");
      return null;
    }
    if (empty.length) {
      setError(`${empty.length} row(s) have no name or number — please fill or remove them.`);
      return null;
    }
    /*
    if (noRel.length) {
      setError("Please select a relation for every contact.");
      return null;
    }*/

    setError("");
    return contacts;
  }, [contacts]);

  const clearError = useCallback(() => setError(""), []);

  // ── Replace entire list (e.g. when loading a draft) ──
  const setAllContacts = useCallback((list) => {
    setContacts(list || []);
  }, []);

  return {
    contacts,
    loading,
    error,
    addManual,
    pickFromDevice,
    updateContact,
    removeContact,
    confirmContacts,
    clearError,
    setAllContacts,
  };
}
