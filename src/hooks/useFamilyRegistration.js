// hooks/useFamilyRegistration.js
import { useState, useEffect, useCallback } from "react";
import { genId } from "../lib/text";

const KEY = "family_reg_draft";
const STEPS = { CITY: "city", CONTACTS: "contacts", REORDER: "reorder" };
const init  = { step: STEPS.CITY, city: "", contacts: [] };

const persist = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
const load    = ()  => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const clear   = ()  => { try { localStorage.removeItem(KEY); } catch {} };

export { STEPS };

export function useFamilyRegistration() {
  const [state, setState] = useState(() => load() || init);

  useEffect(() => { if (state.step !== "success") persist(state); }, [state]);

  const patch = useCallback(p => setState(s => ({ ...s, ...p })), []);

  const setCity     = useCallback(city    => patch({ city, step: STEPS.CONTACTS }), [patch]);
  const goToReorder = useCallback(()       => patch({ step: STEPS.REORDER }),       [patch]);
  const reorder     = useCallback(contacts => patch({ contacts }),                  [patch]);
  const goBack      = useCallback(()       => setState(s => ({
    ...s, step: s.step === STEPS.CONTACTS ? STEPS.CITY : STEPS.CONTACTS,
  })), []);

  const addContacts = useCallback(list => setState(s => {
    const existing = new Set(s.contacts.map(c => c.phone));
    const fresh = list
      .filter(c => c.name || c.phone || c.mobile)
      .filter(c => !existing.has(c.phone || c.mobile))
      .map(c => ({
        id:          genId(),
        name:        (c.name   || "").trim(),
        phone:       (c.phone  || c.mobile || "").trim(),
        countryCode: c.countryCode || "+91",
        isSelf:      c.isSelf || false,
      }));
    return { ...s, contacts: [...s.contacts, ...fresh] };
  }), []);

  const addContact = useCallback((name, phone, countryCode = "+91") =>
    setState(s => ({
      ...s,
      contacts: [...s.contacts, { id: genId(), name: name.trim(), phone: phone.trim(), countryCode }],
    })), []);

  const updateContact = useCallback((id, field, value) =>
    setState(s => ({
      ...s,
      contacts: s.contacts.map(c => c.id === id ? { ...c, [field]: value } : c),
    })), []);

  const removeContact = useCallback(id =>
    setState(s => ({ ...s, contacts: s.contacts.filter(c => c.id !== id) })), []);

  const onSuccess = useCallback(() => { clear(); patch({ step: "success" }); }, [patch]);
  const reset     = useCallback(() => { clear(); setState(init); }, []);

  return {
    step: state.step, city: state.city, contacts: state.contacts,
    setCity, addContact, addContacts, updateContact, removeContact,
    goToReorder, goBack, reorder, onSuccess, reset, STEPS,
  };
}
