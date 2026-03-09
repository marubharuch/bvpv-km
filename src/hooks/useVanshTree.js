// hooks/useVanshTree.js — All tree wizard state in one hook.
// Draft is persisted to localStorage so refresh doesn't lose progress.

import { useState, useCallback, useEffect } from "react";
import { TREE_STEPS, ANC_RELATIONS, DESC_RELATIONS } from "../constants/vanshConstants";

const INIT = {
  self:       { name: "", gender: "", year: "" },
  ancestors:  [],
  descendants:[],
  spouses:    {},   // { memberId: { name, gender, year, rip } }
  siblings:   {},   // { memberId: { elder: [], younger: [] } }
  cousins:    [],
};

const DRAFT_KEY = "vansh_tree_draft";
const load    = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || INIT; } catch { return INIT; } };
const persist = (s)  => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(s)); } catch {} };
const clear   = ()   => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

export function useVanshTree() {
  const [state,   setState]   = useState(() => load());
  const [step,    setStep]    = useState(TREE_STEPS.SELF);
  const [selNode, setSelNode] = useState(null);   // selected node id in full tree

  // Persist on every change
  useEffect(() => { persist(state); }, [state]);

  const patch = useCallback(p => setState(s => ({ ...s, ...p })), []);

  // ── Self ──────────────────────────────────────────────────────
  const setSelf = useCallback(fields => patch({ self: fields }), [patch]);

  // ── Ancestors ────────────────────────────────────────────────
  const setAncestors  = useCallback(list => patch({ ancestors: list }),  [patch]);

  // ── Descendants ──────────────────────────────────────────────
  const setDescendants = useCallback(list => patch({ descendants: list }), [patch]);

  // ── Spouses ──────────────────────────────────────────────────
  const setSpouse = useCallback((memberId, spouseData) =>
    setState(s => ({ ...s, spouses: { ...s.spouses, [memberId]: spouseData } })),
  []);
  const clearSpouse = useCallback(memberId =>
    setState(s => { const sp = { ...s.spouses }; delete sp[memberId]; return { ...s, spouses: sp }; }),
  []);

  // ── Siblings ─────────────────────────────────────────────────
  const setSiblingsFor = useCallback((memberId, data) =>
    setState(s => ({ ...s, siblings: { ...s.siblings, [memberId]: data } })),
  []);

  // ── Cousins ──────────────────────────────────────────────────
  const addCousin       = useCallback(c   => patch({ cousins: [...state.cousins, c] }), [patch, state.cousins]);
  const toggleCousin    = useCallback(idx =>
    setState(s => {
      const cousins = s.cousins.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c);
      return { ...s, cousins };
    }),
  []);

  // ── Navigation ───────────────────────────────────────────────
  const goNext  = useCallback(() => setStep(s => Math.min(s + 1, TREE_STEPS.FULL_TREE)), []);
  const goBack  = useCallback(() => setStep(s => Math.max(s - 1, TREE_STEPS.SELF)),      []);
  const jumpTo  = useCallback(n  => { if (n <= step) setStep(n); },                       [step]);

  const reset   = useCallback(() => { clear(); setState(INIT); setStep(TREE_STEPS.SELF); }, []);

  /** Load data from Firebase into local state (overwrites localStorage draft). */
  const loadFromFirebase = useCallback(data => {
    setState({
      self:        data.self        || INIT.self,
      ancestors:   data.ancestors   || [],
      descendants: data.descendants || [],
      spouses:     data.spouses     || {},
      siblings:    data.siblings    || {},
      cousins:     data.cousins     || [],
    });
  }, []);

  // ── Helpers ──────────────────────────────────────────────────
  /** All vertical-line members (ancestors oldest→newest, self, descendants) */
  const getVerticalMembers = useCallback(() => {
    const ancs  = [...state.ancestors].filter(a => a.name).reverse(); // oldest first
    const descs = state.descendants.filter(d => d.name);
    return [
      ...ancs.map((a, i) => ({ id: "anc_"+i, name: a.name, gender: a.gender, relation: a.relation, isYou: false })),
      { id: "self", name: state.self.name, gender: state.self.gender, relation: "YOU", isYou: true },
      ...descs.map((d, i) => ({ id: "desc_"+i, name: d.name, gender: d.gender, relation: d.relation, isYou: false })),
    ];
  }, [state.ancestors, state.descendants, state.self]);

  const getAllMembers = useCallback(() => [
    { name: state.self.name, gender: state.self.gender },
    ...state.ancestors.filter(a => a.name),
    ...state.descendants.filter(d => d.name),
    ...Object.values(state.spouses).filter(Boolean),
  ].filter(m => m.name), [state]);

  return {
    // state
    self:        state.self,
    ancestors:   state.ancestors,
    descendants: state.descendants,
    spouses:     state.spouses,
    siblings:    state.siblings,
    cousins:     state.cousins,
    step,
    selNode,

    // actions
    setSelf,
    setAncestors,
    setDescendants,
    setSpouse,
    clearSpouse,
    setSiblingsFor,
    addCousin,
    toggleCousin,
    setSelNode,
    goNext,
    goBack,
    jumpTo,
    reset,
    loadFromFirebase,

    // helpers
    getVerticalMembers,
    getAllMembers,

    // constants re-exported for convenience
    ANC_RELATIONS,
    DESC_RELATIONS,
  };
}
