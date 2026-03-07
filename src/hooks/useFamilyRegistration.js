// hooks/useFamilyRegistration.js — Multi-step family registration state.
// Draft persisted to localStorage so refresh doesn't lose progress.

import { useState, useEffect, useCallback } from "react";
import { genId } from "../lib/text";

export const STEPS = { CITY: "city", CONTACTS: "contacts", REORDER: "reorder" };

const init    = { step: STEPS.CITY, city: "", contacts: [] };
const key     = uid => `family_reg_draft:${uid || "anon"}`;
const persist = (uid, s) => { try { localStorage.setItem(key(uid), JSON.stringify(s)); } catch {} };
const load    = uid     => { try { return JSON.parse(localStorage.getItem(key(uid))) || null; } catch { return null; } };
const clear   = uid     => { try { localStorage.removeItem(key(uid)); } catch {} };

export function useFamilyRegistration(uid) {
  const [state, setState] = useState(() => load(uid) || init);

  useEffect(() => { if (state.step !== "success") persist(uid, state); }, [state, uid]);

  const patch = useCallback(p => setState(s => ({ ...s, ...p })), []);

  const setCity     = useCallback(city    => patch({ city, step: STEPS.CONTACTS }), [patch]);
  const goToReorder = useCallback(()      => patch({ step: STEPS.REORDER }),        [patch]);
  const reorder     = useCallback(contacts => patch({ contacts }),                  [patch]);
  const goBack      = useCallback(() => setState(s => ({
    ...s, step: s.step === STEPS.CONTACTS ? STEPS.CITY : STEPS.CONTACTS,
  })), []);

  const addContacts = useCallback(list => setState(s => {
    const existing = new Set(s.contacts.map(c => c.phone));
    const fresh = list
      .filter(c => c.name || c.phone || c.mobile)
      .filter(c => !existing.has(c.phone || c.mobile))
      .map(c => ({
        id:          genId(),
        name:        (c.name  || "").trim(),
        phone:       (c.phone || c.mobile || "").trim(),
        countryCode: c.countryCode || "+91",
        isSelf:      c.isSelf || false,
      }));
    return { ...s, contacts: [...s.contacts, ...fresh] };
  }), []);

  const addContact = useCallback((name, phone, countryCode = "+91", isSelf = false) =>
    setState(s => ({
      ...s,
      contacts: [...s.contacts, { id: genId(), name: name.trim(), phone: phone.trim(), countryCode, isSelf }],
    })), []);

  const updateContact = useCallback((id, field, value) =>
    setState(s => ({
      ...s,
      contacts: s.contacts.map(c => c.id === id ? { ...c, [field]: value } : c),
    })), []);

  const removeContact = useCallback(id =>
    setState(s => ({ ...s, contacts: s.contacts.filter(c => c.id !== id) })), []);

  const onSuccess = useCallback(() => { clear(uid); patch({ step: "success" }); }, [patch, uid]);
  const reset     = useCallback(() => { clear(uid); setState(init); }, [uid]);

  return {
    step: state.step, city: state.city, contacts: state.contacts,
    setCity, addContact, addContacts, updateContact, removeContact,
    goToReorder, goBack, reorder, onSuccess, reset, STEPS,
  };
}
