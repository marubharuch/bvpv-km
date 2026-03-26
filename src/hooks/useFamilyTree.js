// hooks/useFamilyTree.js

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getFirestore,
  doc, onSnapshot, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { appendLog } from '../db/treeDb';

const HISTORY_LIMIT = 20;

function makeId() {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function treeDocRef(treeId) {
  return doc(getFirestore(), 'trees', treeId);
}

function parseNames(raw) {
  return raw.trim().split(/\s+/).filter(Boolean);
}

function buildInitialNodes(raw) {
  const names = parseNames(raw);
  if (!names.length) return {};
  const nodes = names.map((name, i) => ({
    id: makeId(), name,
    gen: i + 1,
    spouseOf: null, ancestorId: null,
    descendants: [], siblings: [],
    isYoungest: i === 0,
  }));
  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].ancestorId = nodes[i + 1].id;
    nodes[i + 1].descendants.push(nodes[i].id);
  }
  const map = {};
  nodes.forEach(n => { map[n.id] = n; });
  return map;
}

function mapToArray(nodesMap) {
  if (!nodesMap) return [];
  return Object.values(nodesMap).map(n => ({
    ...n,
    descendants: n.descendants || [],
    siblings:    n.siblings    || [],
  }));
}

export function useFamilyTree(treeId, readOnly = false) {
  const [nodes,       setNodes]       = useState([]);
  const [nodesMap,    setNodesMap]    = useState({});
  const [treeName,    setTreeName]    = useState('Family Tree');
  const [rowOrder,    setRowOrder]    = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [initDone,    setInitDone]    = useState(false);

  // ── Undo/Redo history stack ──────────────────────────────────────────────
  // Each entry is a snapshot of nodesMap before a change
  const historyRef  = useRef([]);   // past states  [oldest … newest]
  const futureRef   = useRef([]);   // redo states   [newest … oldest]
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncUndoRedoFlags = () => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  };

  const pushHistory = (snapshot) => {
    historyRef.current = [...historyRef.current, snapshot].slice(-HISTORY_LIMIT);
    futureRef.current  = [];   // new action clears redo stack
    syncUndoRedoFlags();
  };

  const editorRef  = useRef({ uid: 'unknown', name: 'Someone' });
  const saveTimer  = useRef(null);

  // ── Real-time listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (!treeId) { setLoading(false); return; }

    const unsub = onSnapshot(
      treeDocRef(treeId),
      (snap) => {
        if (!snap.exists()) { setLoading(false); return; }
        const data = snap.data();

        if (data.nodes && Object.keys(data.nodes).length > 0) {
          setNodesMap(data.nodes);
          setNodes(mapToArray(data.nodes));
          setInitDone(true);
        } else {
          setNodesMap({});
          setNodes([]);
          setInitDone(false);
        }

        if (data.treeName)    setTreeName(data.treeName);
        if (data.rowOrder)    setRowOrder(data.rowOrder);
        if (data.activityLog) setActivityLog(
          [...(data.activityLog || [])].sort((a, b) => b.timestamp - a.timestamp)
        );
        setLoading(false);
      },
      (err) => {
        console.error('useFamilyTree snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [treeId]);

  const setEditor = useCallback((uid, name) => {
    editorRef.current = { uid: uid || 'unknown', name: name || 'Someone' };
  }, []);

  // ── Debounced save ───────────────────────────────────────────────────────
  const saveNodesMap = useCallback((updatedMap) => {
    if (readOnly || !treeId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateDoc(treeDocRef(treeId), {
          nodes:     updatedMap,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('useFamilyTree save error:', e);
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [treeId, readOnly]);

  // ── applyUpdate — records history before every change ────────────────────
  const applyUpdate = useCallback((updaterFn, logEntry) => {
    setNodesMap(prevMap => {
      // Save snapshot BEFORE change
      pushHistory({ ...prevMap });

      const updatedMap = updaterFn({ ...prevMap });
      setNodes(mapToArray(updatedMap));
      saveNodesMap(updatedMap);
      return updatedMap;
    });

    if (logEntry && treeId) {
      appendLog(treeId, {
        uid:       editorRef.current.uid,
        name:      editorRef.current.name,
        action:    logEntry.action,
        target:    logEntry.target  || '',
        detail:    logEntry.detail  || '',
        timestamp: Date.now(),
      });
    }
  }, [saveNodesMap, treeId]);

  // ── undo ─────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    setNodesMap(prevMap => {
      const prev = historyRef.current[historyRef.current.length - 1];
      historyRef.current = historyRef.current.slice(0, -1);
      futureRef.current  = [{ ...prevMap }, ...futureRef.current].slice(0, HISTORY_LIMIT);
      syncUndoRedoFlags();
      setNodes(mapToArray(prev));
      saveNodesMap(prev);
      return prev;
    });
  }, [saveNodesMap]);

  // ── redo ─────────────────────────────────────────────────────────────────
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setNodesMap(prevMap => {
      const next = futureRef.current[0];
      futureRef.current  = futureRef.current.slice(1);
      historyRef.current = [...historyRef.current, { ...prevMap }].slice(-HISTORY_LIMIT);
      syncUndoRedoFlags();
      setNodes(mapToArray(next));
      saveNodesMap(next);
      return next;
    });
  }, [saveNodesMap]);

  // ── initTree ─────────────────────────────────────────────────────────────
  const initTree = useCallback(async (raw) => {
    if (!treeId) return;
    const initialMap = buildInitialNodes(raw);
    setNodesMap(initialMap);
    setNodes(mapToArray(initialMap));
    setInitDone(true);
    setSaving(true);
    // Clear history on fresh init
    historyRef.current = [];
    futureRef.current  = [];
    syncUndoRedoFlags();
    try {
      await updateDoc(treeDocRef(treeId), {
        nodes:     initialMap,
        updatedAt: serverTimestamp(),
      });
      await appendLog(treeId, {
        uid:       editorRef.current.uid,
        name:      editorRef.current.name,
        action:    'initTree',
        target:    raw.trim(),
        detail:    `${editorRef.current.name} ne tree start kiya: "${raw.trim()}"`,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error('initTree error:', e);
    } finally {
      setSaving(false);
    }
  }, [treeId]);

  // ── addSpouse ────────────────────────────────────────────────────────────
  const addSpouse = useCallback((personId, name) => {
    applyUpdate(
      map => {
        const person = map[personId];
        if (!person) return map;
        const id = makeId();
        map[id] = { id, name, gen: person.gen, spouseOf: personId, ancestorId: null, descendants: [], siblings: [], isYoungest: false };
        return map;
      },
      { action: 'addSpouse', target: name, detail: `${editorRef.current.name} ne ${nodesMap[personId]?.name || 'kisi'} ki spouse ${name} add ki` }
    );
  }, [applyUpdate, nodesMap]);

  // ── addSibling ───────────────────────────────────────────────────────────
  const addSibling = useCallback((personId, name) => {
    applyUpdate(
      map => {
        const person = map[personId];
        if (!person) return map;
        const id = makeId();
        map[id] = { id, name, gen: person.gen, spouseOf: null, ancestorId: person.ancestorId, descendants: [], siblings: [personId, ...(person.siblings || [])], isYoungest: false };
        map[personId] = { ...person, siblings: [...(person.siblings || []), id] };
        if (person.ancestorId && map[person.ancestorId]) {
          const parent = map[person.ancestorId];
          map[person.ancestorId] = { ...parent, descendants: [...(parent.descendants || []), id] };
        }
        return map;
      },
      { action: 'addSibling', target: name, detail: `${editorRef.current.name} ne ${nodesMap[personId]?.name || 'kisi'} ka bhai/behen ${name} add kiya` }
    );
  }, [applyUpdate, nodesMap]);

  // ── addChild ─────────────────────────────────────────────────────────────
  const addChild = useCallback((personId, name) => {
    applyUpdate(
      map => {
        const person = map[personId];
        if (!person) return map;
        const id = makeId();
        map[id] = { id, name, gen: person.gen - 1, spouseOf: null, ancestorId: personId, descendants: [], siblings: [], isYoungest: false };
        map[personId] = { ...person, descendants: [...(person.descendants || []), id] };
        return map;
      },
      { action: 'addChild', target: name, detail: `${editorRef.current.name} ne ${nodesMap[personId]?.name || 'kisi'} ka bachcha ${name} add kiya` }
    );
  }, [applyUpdate, nodesMap]);

  // ── addAncestor ──────────────────────────────────────────────────────────
  const addAncestor = useCallback((personId, name) => {
    applyUpdate(
      map => {
        const person = map[personId];
        if (!person) return map;
        const id = makeId();
        map[id] = { id, name, gen: person.gen + 1, spouseOf: null, ancestorId: null, descendants: [personId], siblings: [], isYoungest: false };
        map[personId] = { ...person, ancestorId: id };
        return map;
      },
      { action: 'addAncestor', target: name, detail: `${editorRef.current.name} ne ${nodesMap[personId]?.name || 'kisi'} ke pita/mata ${name} add kiye` }
    );
  }, [applyUpdate, nodesMap]);

  // ── renamePerson ─────────────────────────────────────────────────────────
  const renamePerson = useCallback((id, newName) => {
    applyUpdate(
      map => { if (!map[id]) return map; map[id] = { ...map[id], name: newName }; return map; },
      { action: 'renamePerson', target: newName, detail: `${editorRef.current.name} ne naam badla: "${nodesMap[id]?.name || id}" → "${newName}"` }
    );
  }, [applyUpdate, nodesMap]);

  // ── deletePerson ─────────────────────────────────────────────────────────
  const deletePerson = useCallback((id) => {
    applyUpdate(
      map => {
        const toRemove = new Set();
        const collect = (nodeId) => {
          if (!map[nodeId] || toRemove.has(nodeId)) return;
          toRemove.add(nodeId);
          (map[nodeId].descendants || []).forEach(collect);
          Object.values(map).forEach(n => { if (n.spouseOf === nodeId) toRemove.add(n.id); });
        };
        collect(id);
        toRemove.forEach(rid => { delete map[rid]; });
        Object.keys(map).forEach(k => {
          map[k] = { ...map[k], descendants: (map[k].descendants || []).filter(d => !toRemove.has(d)), siblings: (map[k].siblings || []).filter(s => !toRemove.has(s)) };
        });
        return map;
      },
      { action: 'deletePerson', target: nodesMap[id]?.name || id, detail: `${editorRef.current.name} ne "${nodesMap[id]?.name || id}" delete kiya` }
    );
  }, [applyUpdate, nodesMap]);

  // ── movePerson ────────────────────────────────────────────────────────────
  const movePerson = useCallback((id, newParentId) => {
    applyUpdate(
      map => {
        if (!map[id] || !map[newParentId]) return map;
        const oldParentId = map[id].ancestorId;
        if (oldParentId && map[oldParentId]) {
          map[oldParentId] = { ...map[oldParentId], descendants: (map[oldParentId].descendants || []).filter(d => d !== id) };
        }
        map[newParentId] = { ...map[newParentId], descendants: [...(map[newParentId].descendants || []), id] };
        map[id] = { ...map[id], ancestorId: newParentId, gen: map[newParentId].gen - 1 };
        return map;
      },
      { action: 'movePerson', target: nodesMap[id]?.name || id, detail: `${editorRef.current.name} ne "${nodesMap[id]?.name || id}" ko "${nodesMap[newParentId]?.name || newParentId}" ke neeche move kiya` }
    );
  }, [applyUpdate, nodesMap]);

  // ── saveRowOrder ─────────────────────────────────────────────────────────
  const saveRowOrder = useCallback(async (order) => {
    if (!treeId) return;
    setRowOrder(order);
    try { await updateDoc(treeDocRef(treeId), { rowOrder: order }); }
    catch (e) { console.error('saveRowOrder error:', e); }
  }, [treeId]);

  // ── resetRowOrder ────────────────────────────────────────────────────────
  const resetRowOrder = useCallback(async () => {
    if (!treeId) return;
    setRowOrder(null);
    try { await updateDoc(treeDocRef(treeId), { rowOrder: null }); }
    catch (e) { console.error('resetRowOrder error:', e); }
  }, [treeId]);

  // ── flushToFirestore ─────────────────────────────────────────────────────
  const flushToFirestore = useCallback(async (order) => {
    if (!treeId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    try {
      const payload = { nodes: nodesMap, updatedAt: serverTimestamp() };
      if (order) payload.rowOrder = order;
      await updateDoc(treeDocRef(treeId), payload);
    } catch (e) {
      console.error('flushToFirestore error:', e);
    } finally {
      setSaving(false);
    }
  }, [treeId, nodesMap]);

  // ── reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(async () => {
    if (!treeId) return;
    setNodes([]); setNodesMap({});
    setInitDone(false); setRowOrder(null);
    historyRef.current = [];
    futureRef.current  = [];
    syncUndoRedoFlags();
    try {
      await updateDoc(treeDocRef(treeId), { nodes: {}, rowOrder: null, updatedAt: serverTimestamp() });
      await appendLog(treeId, {
        uid: editorRef.current.uid, name: editorRef.current.name,
        action: 'reset', target: '',
        detail: `${editorRef.current.name} ne poora tree reset kar diya`,
        timestamp: Date.now(),
      });
    } catch (e) { console.error('reset error:', e); }
  }, [treeId]);

  return {
    nodes, treeName, rowOrder, activityLog,
    loading, saving, initDone,
    canUndo, canRedo, undo, redo,
    setEditor,
    initTree,
    addSpouse, addSibling, addChild, addAncestor,
    renamePerson, deletePerson, movePerson,
    saveRowOrder, resetRowOrder,
    flushToFirestore, reset,
  };
}