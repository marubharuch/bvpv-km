// hooks/useTreeData.js
// Single hook that manages the full tree lifecycle:
//   load → localForage (smartLoad) → edit/add → saveLocal → debounced sync
//
// KEY: accepts treeId (not uid)
//      treeId comes from route params via VanshTreeView

import { useState, useEffect, useCallback } from "react";
import {
  getMeta, saveLocalTree,
  editSelf, editAncestor, editDescendant, editSpouse, editSibling,
  addDescendant, addAncestor, addSibling, addSpouse,
} from "../utils/localTree";
import {
  smartLoad, pushToFirestore,
  scheduleSyncDebounced, registerOnlineSync, registerVisibilitySync,
} from "../utils/syncTree";

export function useTreeData(treeId) {
  const [treeData,  setTreeData]  = useState(null);
  const [meta,      setMeta]      = useState({ isDirty:false, lastEditedAt:null, lastSyncedAt:null, version:0 });
  const [status,    setStatus]    = useState("idle");  // idle | loading | saving | syncing | error
  const [syncError, setSyncError] = useState(null);

  // ── Load on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!treeId) return;
    setStatus("loading");
    smartLoad(treeId)
      .then(({ tree, source }) => {
        setTreeData(tree);
        setStatus("idle");
        console.log("🌳 Tree loaded from:", source, "| treeId:", treeId);
        return getMeta(treeId);
      })
      .then(setMeta)
      .catch(e => { setStatus("error"); console.error(e); });
  }, [treeId]);

  // ── Register background sync listeners ─────────────────────────────────────
  useEffect(() => {
    if (!treeId) return;
    const refreshMeta  = () => getMeta(treeId).then(setMeta);
    const unregOnline  = registerOnlineSync(treeId, refreshMeta);
    const unregVis     = registerVisibilitySync(treeId, refreshMeta);
    return () => { unregOnline(); unregVis(); };
  }, [treeId]);

  // ── Core: apply mutation + save local + schedule sync ──────────────────────
  const applyMutation = useCallback(async (mutFn) => {
    if (!treeData || !treeId) return;
    setStatus("saving");
    try {
      const updated = mutFn(treeData);
      setTreeData(updated);
      const newMeta = await saveLocalTree(treeId, updated);
      setMeta(newMeta);
      setStatus("idle");
      scheduleSyncDebounced(treeId, 30_000);
    } catch (e) {
      setStatus("error");
      console.error("applyMutation failed:", e);
    }
  }, [treeData, treeId]);

  // ── Edit actions ────────────────────────────────────────────────────────────
  const editMemberSelf       = useCallback((data)              => applyMutation(t => editSelf(t, data)),              [applyMutation]);
  const editMemberAncestor   = useCallback((idx, data)         => applyMutation(t => editAncestor(t, idx, data)),     [applyMutation]);
  const editMemberDescendant = useCallback((idx, data)         => applyMutation(t => editDescendant(t, idx, data)),   [applyMutation]);
  const editMemberSpouse     = useCallback((spouseKey, data)   => applyMutation(t => editSpouse(t, spouseKey, data)), [applyMutation]);
  const editMemberSibling    = useCallback((key, type, idx, d) => applyMutation(t => editSibling(t, key, type, idx, d)), [applyMutation]);

  // ── Add actions ─────────────────────────────────────────────────────────────
  const addMemberDescendant = useCallback((data)            => applyMutation(t => addDescendant(t, data)),          [applyMutation]);
  const addMemberAncestor   = useCallback((data)            => applyMutation(t => addAncestor(t, data)),            [applyMutation]);
  const addMemberSibling    = useCallback((key, type, data) => applyMutation(t => addSibling(t, key, type, data)),  [applyMutation]);
  const addMemberSpouse     = useCallback((spouseKey, data) => applyMutation(t => addSpouse(t, spouseKey, data)),   [applyMutation]);

  // ── Manual sync ─────────────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (!treeId) return;
    setStatus("syncing");
    setSyncError(null);
    try {
      await pushToFirestore(treeId);
      const newMeta = await getMeta(treeId);
      setMeta(newMeta);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setSyncError(e.message);
      console.error("Manual sync failed:", e);
    }
  }, [treeId]);

  return {
    treeData,
    meta,
    status,
    isLoading:  status === "loading",
    isSaving:   status === "saving",
    isSyncing:  status === "syncing",
    isOnline:   typeof navigator !== "undefined" ? navigator.onLine : true,
    syncError,
    editMemberSelf, editMemberAncestor, editMemberDescendant,
    editMemberSpouse, editMemberSibling,
    addMemberDescendant, addMemberAncestor, addMemberSibling, addMemberSpouse,
    syncNow,
  };
}