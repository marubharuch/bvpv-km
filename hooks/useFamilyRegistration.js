// src/hooks/useFamilyRegistration.js

import { useState } from "react";

export const STEPS = {
  CITY: "CITY",
  CONTACTS: "CONTACTS",
  REORDER: "REORDER",
  SUCCESS: "SUCCESS",
};

export function useFamilyRegistration() {
  const [step, setStep] = useState(STEPS.CITY);
  const [city, setCity] = useState("");
  const [contacts, setContacts] = useState([]);

  const addContact = (contact) => {
    setContacts((prev) => [...prev, contact]);
  };

  const addContacts = (newContacts) => {
    setContacts((prev) => [...prev, ...newContacts]);
  };

  const updateContact = (index, updated) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updated } : c))
    );
  };

  const removeContact = (index) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const reorder = (reordered) => {
    setContacts(reordered);
  };

  const goToReorder = () => setStep(STEPS.REORDER);

  const goBack = () => {
    if (step === STEPS.REORDER) setStep(STEPS.CONTACTS);
    else if (step === STEPS.CONTACTS) setStep(STEPS.CITY);
  };

  const onSuccess = () => setStep(STEPS.SUCCESS);

  // Called when CityPicker selects a city — auto-advance to CONTACTS step
  const handleSetCity = (selectedCity) => {
    setCity(selectedCity);
    setStep(STEPS.CONTACTS);
  };

  return {
    step,
    city,
    contacts,
    setCity: handleSetCity,
    addContact,
    addContacts,
    updateContact,
    removeContact,
    reorder,
    goToReorder,
    goBack,
    onSuccess,
  };
}