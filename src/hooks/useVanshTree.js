// hooks/useVanshTree.js
// ─────────────────────────────────────────────────────────────────────────────
// Wizard-only state hook. Manages the 8-step draft in localStorage.
// Firestore writes happen only in VanshVriksha/index.jsx via familyTreeDb.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import { TREE_STEPS, ANC_RELATIONS, DESC_RELATIONS } from "../constants/vanshConstants";

const INIT = {
  self:        { name: "", gender: "", year: "" },
  ancestors:   [],
  descendants: [],
  spouses:     {},
  siblings:    {},
  cousins:     [],
};

const DRAFT_KEY = "vansh_tree_draft_v2";   // v2 = new schema
const load    = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || INIT; } catch { return INIT; } };
const persist = (s) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(s)); } catch {} };
const clear   = ()  => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

export function useVanshTree() {
  const [state,   setState]   = useState(() => load());
  const [step,    setStep]    = useState(TREE_STEPS.SELF);

  useEffect(() => { persist(state); }, [state]);

  const patch = useCallback(p => setState(s => ({ ...s, ...p })), []);

  // ── Self ──────────────────────────────────────────────────────
  const setSelf = useCallback(fields => patch({ self: fields }), [patch]);

  // ── Ancestors ─────────────────────────────────────────────────
  const setAncestors  = useCallback(list => patch({ ancestors: list  }), [patch]);

  // ── Descendants ───────────────────────────────────────────────
  const setDescendants = useCallback(list => patch({ descendants: list }), [patch]);

  // ── Spouses ───────────────────────────────────────────────────
  const setSpouse  = useCallback((key, data) =>
    setState(s => ({ ...s, spouses: { ...s.spouses, [key]: data } })), []);
  const clearSpouse = useCallback(key =>
    setState(s => { const sp = { ...s.spouses }; delete sp[key]; return { ...s, spouses: sp }; }), []);

  // ── Siblings ──────────────────────────────────────────────────
  const setSiblingsFor = useCallback((key, data) =>
    setState(s => ({ ...s, siblings: { ...s.siblings, [key]: data } })), []);

  // ── Cousins ───────────────────────────────────────────────────
  const addCousin    = useCallback(c => setState(s => ({ ...s, cousins: [...s.cousins, c] })), []);
  const toggleCousin = useCallback(idx =>
    setState(s => ({
      ...s,
      cousins: s.cousins.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c),
    })), []);

  // ── Navigation ────────────────────────────────────────────────
  const goNext = useCallback(() => setStep(s => Math.min(s + 1, TREE_STEPS.FULL_TREE)), []);
  const goBack = useCallback(() => setStep(s => Math.max(s - 1, TREE_STEPS.SELF)), []);
  const jumpTo = useCallback(n => { if (n <= step) setStep(n); }, [step]);
  const reset  = useCallback(() => { clear(); setState(INIT); setStep(TREE_STEPS.SELF); }, []);

  /** Reload wizard from an existing family tree doc (for "edit" flow). */
  const loadFromFamilyDoc = useCallback((treeDoc) => {
    if (!treeDoc) return;
    // Convert graph back to wizard arrays for editing
    const members = treeDoc.members || {};
    const selfMember = Object.values(members).find(m => m.isRegisteredUser) ||
                       Object.values(members)[0] || {};

    const selfId = Object.keys(members).find(id =>
      members[id].isRegisteredUser || id === Object.keys(members)[0]
    );

    // Build ancestors chain from self upward
    const buildAncestors = (id, acc = []) => {
      const m = members[id];
      if (!m) return acc;
      const fatherId = m.fatherId;
      if (!fatherId || !members[fatherId]) return acc;
      acc.push({ ...members[fatherId], relation: ANC_RELATIONS[acc.length] || `ancestor${acc.length+1}` });
      return buildAncestors(fatherId, acc);
    };

    const ancestors = buildAncestors(selfId);

    // Descendants = children where fatherId or motherId = selfId
    const descendants = Object.values(members)
      .filter(m => m.fatherId === selfId || m.motherId === selfId)
      .map((m, i) => ({ ...m, relation: DESC_RELATIONS[i] || `gen+${i+1}` }));

    // Spouses
    const spouses = {};
    if (selfMember.spouseId && members[selfMember.spouseId]) {
      spouses["self"] = members[selfMember.spouseId];
    }

    setState({
      self:        { name:selfMember.name, gender:selfMember.gender, year:selfMember.year },
      ancestors,
      descendants,
      spouses,
      siblings:    {},
      cousins:     [],
    });
  }, []);

  // ── Helpers ───────────────────────────────────────────────────
  const getVerticalMembers = useCallback(() => {
    const ancs  = [...state.ancestors].filter(a => a.name).reverse();
    const descs = state.descendants.filter(d => d.name);
    return [
      ...ancs.map((a, i) => ({ id:"anc_"+i, name:a.name, gender:a.gender, relation:a.relation, isYou:false })),
      { id:"self", name:state.self.name, gender:state.self.gender, relation:"YOU", isYou:true },
      ...descs.map((d, i) => ({ id:"desc_"+i, name:d.name, gender:d.gender, relation:d.relation, isYou:false })),
    ];
  }, [state]);

  const getAllMembers = useCallback(() => [
    { name:state.self.name, gender:state.self.gender },
    ...state.ancestors.filter(a => a.name),
    ...state.descendants.filter(d => d.name),
    ...Object.values(state.spouses).filter(Boolean),
  ].filter(m => m.name), [state]);

  return {
    self:        state.self,
    ancestors:   state.ancestors,
    descendants: state.descendants,
    spouses:     state.spouses,
    siblings:    state.siblings,
    cousins:     state.cousins,
    step,

    setSelf, setAncestors, setDescendants,
    setSpouse, clearSpouse, setSiblingsFor,
    addCousin, toggleCousin,
    goNext, goBack, jumpTo, reset,
    loadFromFamilyDoc,
    getVerticalMembers, getAllMembers,

    ANC_RELATIONS, DESC_RELATIONS,
  };
}
