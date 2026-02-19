import { useState, useCallback } from "react";
import localforage from "localforage";

// ─────────────────────────────────────────────────────────────
// useFamilySetup
//
// Orchestrates the entire new family registration flow.
// All state lives here — survives section navigation.
//
// State shape:
//   members[]     — ordered family list, each:
//                   { name, number, relation, isStudent, gender, dob, mobile,
//                     skills, achievements, aboutMe, needsScholarship, supportType }
//   city          — one city for the family
//   currentStudentIdx — which student form is active (0-based among students only)
//
// Sections (computed):
//   "contacts"  → add/edit contacts + city
//   "arrange"   → reorder + mark students
//   "student-N" → one per student (dynamic)
//   "review"    → final review
// ─────────────────────────────────────────────────────────────

const DRAFT_KEY = "familySetupDraft";

export function useFamilySetup() {
  const [members, setMembers] = useState([]);
  const [city, setCity]       = useState("");

  // ── Persist to localForage on every meaningful change ──
  const persist = useCallback(async (newMembers, newCity) => {
    try {
      await localforage.setItem(DRAFT_KEY, {
        members: newMembers,
        city: newCity,
        savedAt: Date.now()
      });
    } catch (e) {
      console.warn("Draft save failed", e);
    }
  }, []);

  const loadDraft = useCallback(async () => {
    try {
      const draft = await localforage.getItem(DRAFT_KEY);
      if (draft?.members?.length) {
        setMembers(draft.members);
        setCity(draft.city || "");
        return true;
      }
    } catch (e) {
      console.warn("Draft load failed", e);
    }
    return false;
  }, []);

  const clearDraft = useCallback(async () => {
    try { await localforage.removeItem(DRAFT_KEY); } catch {}
  }, []);

  // ── Member management ──
  const setMembersAndPersist = useCallback((updater) => {
    setMembers(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next, city);
      return next;
    });
  }, [city, persist]);

  const setCityAndPersist = useCallback((val) => {
    setCity(val);
    persist(members, val);
  }, [members, persist]);

  // Confirm contacts from ContactPickerModal → convert to members
  const confirmContacts = useCallback((contacts) => {
    const newMembers = contacts.map(c => ({
      // Contact fields
      name:     c.name,
      number:   c.number,
      relation: c.relation,
      // Student fields (filled later)
      isStudent:       false,
      gender:          "",
      dob:             "",
      mobile:          c.number || "", // pre-fill from contact
      skills:          {},
      achievements:    "",
      aboutMe:         "",
      needsScholarship: false,
      supportType:     {}
    }));
    setMembersAndPersist(prev => {
      // Merge: keep existing members, append truly new ones (by name+number)
      const existing = prev.filter(p =>
        newMembers.some(n => n.name === p.name && n.number === p.number)
          ? false  // will be replaced by new
          : true   // keep as-is
      );
      return [...existing, ...newMembers];
    });
  }, [setMembersAndPersist]);

  // Reorder members (drag result: newOrder is full reordered array)
  const reorderMembers = useCallback((newOrder) => {
    setMembersAndPersist(newOrder);
  }, [setMembersAndPersist]);

  // Toggle isStudent on a member
  const toggleStudent = useCallback((idx) => {
    setMembersAndPersist(prev =>
      prev.map((m, i) => i === idx ? { ...m, isStudent: !m.isStudent } : m)
    );
  }, [setMembersAndPersist]);

  // Update one field on one member (used in student forms)
  const updateMember = useCallback((idx, field, value) => {
    setMembersAndPersist(prev =>
      prev.map((m, i) => i === idx ? { ...m, [field]: value } : m)
    );
  }, [setMembersAndPersist]);

  // Computed: students only (members where isStudent === true), with their real index
  const students = members
    .map((m, i) => ({ ...m, memberIndex: i }))
    .filter(m => m.isStudent);

  return {
    members,
    city,
    students,
    setCity: setCityAndPersist,
    confirmContacts,
    reorderMembers,
    toggleStudent,
    updateMember,
    loadDraft,
    clearDraft,
  };
}
