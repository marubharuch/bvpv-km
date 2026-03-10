// hooks/useTreeData.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook for the VanshTreeView page.
// Loads family tree from families/{familyId}, exposes edit/add actions,
// tracks pendingChanges for the ReviewSaveSheet, and pushes to Firestore.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import {
  getFamilyTree,
  editMember,
  addMember,
  setSpouseLink,
  setParentLink,
  newMemberId,
} from "../db/familyTreeDb";

// ── Change record helpers ─────────────────────────────────────────────────────
let _seq = 0;
const mkId     = () => `ch_${Date.now()}_${++_seq}`;
const mkEdit   = (label, icon, before, after)  =>
  ({ id:mkId(), type:"edit", label, icon, before, after, timestamp:Date.now() });
const mkAdd    = (label, icon, after)          =>
  ({ id:mkId(), type:"add",  label, icon, before:null, after, timestamp:Date.now() });

export function useTreeData(familyId, uid) {
  const [treeDoc,        setTreeDoc]        = useState(null);   // full Firestore doc
  const [status,         setStatus]         = useState("idle"); // idle|loading|saving|syncing|error
  const [syncError,      setSyncError]      = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!familyId) return;
    setStatus("loading");
    getFamilyTree(familyId)
      .then(doc => { setTreeDoc(doc); setStatus("idle"); })
      .catch(e  => { console.error(e); setStatus("error"); });
  }, [familyId]);

  // ── Optimistic member update helper ──────────────────────────────────────
  const patchLocal = useCallback((memberId, data) => {
    setTreeDoc(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        members: {
          ...prev.members,
          [memberId]: { ...prev.members[memberId], ...data },
        },
      };
    });
  }, []);

  const addLocalMember = useCallback((memberId, data) => {
    setTreeDoc(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        members: { ...prev.members, [memberId]: data },
      };
    });
  }, []);

  // ── Edit member ───────────────────────────────────────────────────────────
  const editTreeMember = useCallback(async (memberId, data) => {
    if (!familyId || !memberId) return;
    setStatus("saving");
    setSyncError(null);

    const prev   = treeDoc?.members?.[memberId] || {};
    const fields = ["name","gender","year","rip"];
    const changes = {};
    fields.forEach(f => {
      if (data[f] !== undefined && data[f] !== prev[f])
        changes[f] = { from: prev[f], to: data[f] };
    });

    // Optimistic update
    patchLocal(memberId, data);
    const change = mkEdit(
      `Edit: ${data.name || prev.name}`,
      prev.gender === "F" ? "👩" : "👨",
      Object.fromEntries(fields.map(f => [f, prev[f]])),
      Object.fromEntries(fields.map(f => [f, data[f] ?? prev[f]])),
    );
    setPendingChanges(p => [...p, change]);

    try {
      await editMember(familyId, uid, memberId, data, changes);
      setStatus("idle");
    } catch (e) {
      // Revert optimistic update on failure
      patchLocal(memberId, prev);
      setPendingChanges(p => p.filter(c => c.id !== change.id));
      setSyncError(e.message);
      setStatus("error");
    }
  }, [familyId, uid, treeDoc, patchLocal]);

  // ── Add member ───────────────────────────────────────────────────────────
  const addTreeMember = useCallback(async (memberData) => {
    if (!familyId) return null;
    setStatus("saving");
    setSyncError(null);

    // Optimistic ID (will match server since we use addMember which also uses newMemberId)
    const tempId = newMemberId();
    const newData = {
      name:     memberData.name     || "",
      gender:   memberData.gender   || "M",
      year:     memberData.year     || null,
      rip:      memberData.rip      || false,
      fatherId: memberData.fatherId || null,
      motherId: memberData.motherId || null,
      spouseId: memberData.spouseId || null,
    };

    addLocalMember(tempId, newData);
    const change = mkAdd(
      `Add: ${memberData.name}`,
      memberData.gender === "F" ? "👩" : "👨",
      newData,
    );
    setPendingChanges(p => [...p, change]);

    try {
      const realId = await addMember(familyId, uid, memberData);
      // Replace temp ID with real ID in local state
      setTreeDoc(prev => {
        if (!prev) return prev;
        const members = { ...prev.members };
        delete members[tempId];
        members[realId] = newData;
        return { ...prev, members };
      });
      setStatus("idle");
      return realId;
    } catch (e) {
      // Revert
      setTreeDoc(prev => {
        if (!prev) return prev;
        const members = { ...prev.members };
        delete members[tempId];
        return { ...prev, members };
      });
      setPendingChanges(p => p.filter(c => c.id !== change.id));
      setSyncError(e.message);
      setStatus("error");
      return null;
    }
  }, [familyId, uid, addLocalMember]);

  // ── Link spouse ──────────────────────────────────────────────────────────
  const linkSpouse = useCallback(async (memberId1, memberId2) => {
    if (!familyId) return;
    patchLocal(memberId1, { spouseId: memberId2 });
    patchLocal(memberId2, { spouseId: memberId1 });
    const m1 = treeDoc?.members?.[memberId1];
    const change = mkEdit(
      `Link Spouse: ${m1?.name}`,
      "💑",
      { spouseId: m1?.spouseId },
      { spouseId: memberId2 },
    );
    setPendingChanges(p => [...p, change]);
    await setSpouseLink(familyId, uid, memberId1, memberId2);
  }, [familyId, uid, treeDoc, patchLocal]);

  // ── Link parent ──────────────────────────────────────────────────────────
  const linkParent = useCallback(async (childId, parentId, parentGender) => {
    if (!familyId) return;
    const field = parentGender === "F" ? "motherId" : "fatherId";
    patchLocal(childId, { [field]: parentId });
    const child = treeDoc?.members?.[childId];
    const change = mkEdit(
      `Link Parent: ${child?.name}`,
      field === "fatherId" ? "👨" : "👩",
      { [field]: child?.[field] },
      { [field]: parentId },
    );
    setPendingChanges(p => [...p, change]);
    await setParentLink(familyId, uid, childId, parentId, parentGender);
  }, [familyId, uid, treeDoc, patchLocal]);

  // ── Sync now (reload from Firestore to confirm) ───────────────────────────
  const syncNow = useCallback(async () => {
    if (!familyId) return;
    setStatus("syncing");
    setSyncError(null);
    try {
      const fresh = await getFamilyTree(familyId);
      setTreeDoc(fresh);
      setPendingChanges([]);
      setStatus("idle");
    } catch (e) {
      setSyncError(e.message);
      setStatus("error");
    }
  }, [familyId]);

  const clearPendingChanges = useCallback(() => setPendingChanges([]), []);

  return {
    // Data
    treeDoc,
    members:       treeDoc?.members       || {},
    familyId:      treeDoc?.familyId,
    treeName:      treeDoc?.treeName,
    pin:           treeDoc?.pin,
    auditLogs:     treeDoc?.auditLogs     || [],
    pendingChanges,

    // Status
    status,
    isLoading:  status === "loading",
    isSaving:   status === "saving",
    isSyncing:  status === "syncing",
    isOnline:   typeof navigator !== "undefined" ? navigator.onLine : true,
    syncError,

    // Actions
    editTreeMember,
    addTreeMember,
    linkSpouse,
    linkParent,
    syncNow,
    clearPendingChanges,
  };
}
