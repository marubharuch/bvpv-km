import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "family_reg_draft";

export const STEPS = {
  CITY:     "city",
  CONTACTS: "contacts",
  REORDER:  "reorder",
  SUCCESS:  "success",
};

const initial = { step: STEPS.CITY, city: "", contacts: [] };

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }
  catch { return null; }
}
function save(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}
function clear() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
function uid() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function useFamilyRegistration() {
  const [state, setState] = useState(() => load() || initial);

  useEffect(() => {
    if (state.step !== STEPS.SUCCESS) save(state);
  }, [state]);

  const set = useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);

  const setCity = useCallback((city) => set({ city, step: STEPS.CONTACTS }), [set]);

  const addContact = useCallback((name, phone) =>
    setState((s) => ({
      ...s,
      contacts: [...s.contacts, { id: uid(), name: name.trim(), phone: phone.trim() }],
    })), []);

  const addContacts = useCallback((list) =>
    setState((s) => {
      const existing = new Set(s.contacts.map((c) => c.phone));
      const fresh = list
        .filter((c) => c.name || c.phone)
        .filter((c) => !existing.has(c.phone))
        .map((c) => ({ id: uid(), name: c.name.trim(), phone: c.phone.trim() }));
      return { ...s, contacts: [...s.contacts, ...fresh] };
    }), []);

  const updateContact = useCallback((id, field, value) =>
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) => c.id === id ? { ...c, [field]: value } : c),
    })), []);

  const removeContact = useCallback((id) =>
    setState((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== id) })), []);

  const goToReorder = useCallback(() => set({ step: STEPS.REORDER }), [set]);
  const goBack = useCallback(() =>
    setState((s) => ({
      ...s,
      step: s.step === STEPS.CONTACTS ? STEPS.CITY : STEPS.CONTACTS,
    })), []);

  const reorder = useCallback((contacts) => set({ contacts }), [set]);

  const onSuccess = useCallback(() => {
    clear();
    set({ step: STEPS.SUCCESS });
  }, [set]);

  const reset = useCallback(() => { clear(); setState(initial); }, []);

  return {
    step: state.step, city: state.city, contacts: state.contacts,
    setCity, addContact, addContacts, updateContact, removeContact,
    goToReorder, goBack, reorder, onSuccess, reset,
  };
}
