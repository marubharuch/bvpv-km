// hooks/useFamilyTree.js
// ─────────────────────────────────────────────────────────────────────────────
// Ab yeh hook treeId-based hai (uid-based nahi).
// Firestore: trees/{treeId}  (treeDb.js ke through)
// localStorage: fast local cache
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTree, saveTreeData } from '../db/treedb'; // treeDb.js ke functions

const lsKey     = (treeId) => `vt_nodes_${treeId}`;
const lsMetaKey = (treeId) => `vt_meta_${treeId}`;

const lsLoad = (treeId) => {
  try { const r = localStorage.getItem(lsKey(treeId));     return r ? JSON.parse(r) : null; } catch { return null; }
};
const lsLoadMeta = (treeId) => {
  try { const r = localStorage.getItem(lsMetaKey(treeId)); return r ? JSON.parse(r) : {};   } catch { return {}; }
};
const lsSave = (treeId, nodes, meta) => {
  try {
    localStorage.setItem(lsKey(treeId),     JSON.stringify(nodes));
    localStorage.setItem(lsMetaKey(treeId), JSON.stringify(meta));
  } catch {}
};
const lsClear = (treeId) => {
  try {
    localStorage.removeItem(lsKey(treeId));
    localStorage.removeItem(lsMetaKey(treeId));
  } catch {}
};

function makeIdGen(startFrom = 1) {
  let n = startFrom;
  return () => n++;
}

/**
 * @param {string}  treeId   — Firestore trees/{treeId}
 * @param {boolean} readOnly — viewer mode mein true, koi save nahi
 */
export function useFamilyTree(treeId, readOnly = false) {
  const [nodes,    setNodes]    = useState([]);
  const [treeName, setTreeName] = useState('Family Tree');
  const [rowOrder, setRowOrder] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [initDone, setInitDone] = useState(false);

  const nextId      = useRef(makeIdGen(1));
  const saveTimer   = useRef(null);
  const treeNameRef = useRef('Family Tree');
  const rowOrderRef = useRef(null);
  const nodesRef    = useRef([]);

  useEffect(() => { treeNameRef.current = treeName; }, [treeName]);
  useEffect(() => { rowOrderRef.current = rowOrder; }, [rowOrder]);
  useEffect(() => { nodesRef.current    = nodes;    }, [nodes]);

  // ── persist ─────────────────────────────────────────────────────────────────
  // persist — sirf localStorage (fast, har node change par)
  const persist = useCallback((newNodes, name, order) => {
    if (readOnly) return;
    const meta    = { treeName: name, rowOrder: order ?? null };
    const saveKey = treeId || '__new__';
    lsSave(saveKey, newNodes, meta);
  }, [treeId, readOnly]);

  // persistFirestore — explicit save (sirf "Table View" button par)
  const persistFirestore = useCallback(async (newNodes, name, order) => {
    if (readOnly || !treeId) return;
    setSaving(true);
    try { await saveTreeData(treeId, newNodes, order ?? null); }
    catch (e) { console.error('Firestore save failed:', e); }
    finally   { setSaving(false); }
  }, [treeId, readOnly]);

  // ── Mount: load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!treeId) { setLoading(false); return; }

    // localStorage first (instant)
    const ls   = lsLoad(treeId);
    const meta = lsLoadMeta(treeId);
    if (ls && ls.length > 0) {
      const maxId = Math.max(...ls.map(n => n.id), 0);
      nextId.current = makeIdGen(maxId + 1);
      setNodes(ls);
      if (meta.treeName) setTreeName(meta.treeName);
      if (meta.rowOrder) setRowOrder(meta.rowOrder);
      setInitDone(true);
      setLoading(false);
      return;
    }

    // Firestore fallback
    getTree(treeId)
      .then(data => {
        if (!data) return;
        const nodeList = data.nodes || [];
        if (nodeList.length > 0) {
          const maxId = Math.max(...nodeList.map(n => n.id), 0);
          nextId.current = makeIdGen(maxId + 1);
        }
        setNodes(nodeList);
        const name = data.treeName || 'Family Tree';
        setTreeName(name);
        if (data.rowOrder) setRowOrder(data.rowOrder);
        lsSave(treeId, nodeList, { treeName: name, rowOrder: data.rowOrder || null });
        setInitDone(true);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId]);

  // ── mutate ───────────────────────────────────────────────────────────────────
  const mutate = useCallback((updater) => {
    if (readOnly) return;
    setNodes(prev => {
      const next = updater(prev, nextId.current);
      persist(next, treeNameRef.current, rowOrderRef.current);
      return next;
    });
  }, [persist, readOnly]);

  // ── saveRowOrder ─────────────────────────────────────────────────────────────
  const saveRowOrder = useCallback(async (order) => {
    if (readOnly) return;
    setRowOrder(order);
    rowOrderRef.current = order;
    persist(nodesRef.current, treeNameRef.current, order);
    // rowOrder save = explicit action — Firestore bhi update karo
    await persistFirestore(nodesRef.current, treeNameRef.current, order);
  }, [persist, persistFirestore, readOnly]);

  const resetRowOrder = useCallback(async () => {
    if (readOnly) return;
    setRowOrder(null);
    rowOrderRef.current = null;
    persist(nodesRef.current, treeNameRef.current, null);
    await persistFirestore(nodesRef.current, treeNameRef.current, null);
  }, [persist, persistFirestore, readOnly]);

  // ── addSpouse ────────────────────────────────────────────────────────────────
  const addSpouse = useCallback((pid, name) => {
    mutate((prev, getId) => {
      const p = prev.find(n => n.id === pid);
      if (!p) return prev;
      return [...prev, {
        id: getId(), name, gen: p.gen,
        ancestorId: null, spouseOf: pid, descendants: [], siblings: [],
      }];
    });
  }, [mutate]);

  // ── addSibling ───────────────────────────────────────────────────────────────
  const addSibling = useCallback((pid, name) => {
    mutate((prev, getId) => {
      const p = prev.find(n => n.id === pid);
      if (!p) return prev;
      const sid = getId();
      const trueParentId = p.ancestorId
        || prev.find(n => !n.spouseOf && (n.descendants || []).includes(pid))?.id
        || null;
      return [
        ...prev.map(n => {
          if (n.id === pid)          return { ...n, siblings: [...n.siblings, sid] };
          if (n.id === trueParentId) return { ...n, descendants: [...(n.descendants || []), sid] };
          return n;
        }),
        { id: sid, name, gen: p.gen, ancestorId: trueParentId, spouseOf: null, descendants: [], siblings: [] },
      ];
    });
  }, [mutate]);

  // ── addChild ─────────────────────────────────────────────────────────────────
  const addChild = useCallback((pid, name) => {
    mutate((prev, getId) => {
      const p = prev.find(n => n.id === pid);
      if (!p) return prev;
      let cg   = p.gen - 1;
      let base = prev;
      if (cg < 1) { base = prev.map(n => ({ ...n, gen: n.gen + 1 })); cg = 1; }
      const cid = getId();
      return [
        ...base.map(n => n.id === pid ? { ...n, descendants: [...(n.descendants || []), cid] } : n),
        { id: cid, name, gen: cg, ancestorId: pid, spouseOf: null, descendants: [], siblings: [] },
      ];
    });
  }, [mutate]);

  // ── addAncestor ──────────────────────────────────────────────────────────────
  const addAncestor = useCallback((pid, name) => {
    if (!name?.trim()) return;
    mutate((prev, getId) => {
      const p = prev.find(n => n.id === pid);
      if (!p) return prev;
      const aid        = getId();
      const newGen     = p.gen + 1;
      const siblingIds = new Set(p.siblings || []);
      const updated    = prev.map(n => {
        if (n.id === pid) return { ...n, ancestorId: aid };
        if (siblingIds.has(n.id) && (n.ancestorId === p.ancestorId || n.ancestorId === null))
          return { ...n, ancestorId: aid };
        return n;
      });
      const newDescendants = [pid, ...Array.from(siblingIds).filter(sid => {
        const s = prev.find(n => n.id === sid);
        return s && (s.ancestorId === p.ancestorId || s.ancestorId === null);
      })];
      return [...updated, {
        id: aid, name: name.trim(), gen: newGen,
        ancestorId: null, spouseOf: null,
        descendants: newDescendants, siblings: [],
      }];
    });
  }, [mutate]);

  // ── initTree (creator pehli baar names deta hai) ─────────────────────────────
  const initTree = useCallback((rawInput) => {
    const names = rawInput.trim().split(/\s+/).filter(Boolean);
    if (!names.length) return;
    nextId.current = makeIdGen(1);
    const getId    = () => nextId.current();
    const newNodes = names.map((name, i) => ({
      id: getId(), name, gen: i + 1,
      ancestorId: null, spouseOf: null,
      descendants: [], siblings: [],
      isYoungest: i === 0,
    }));
    for (let i = 0; i < newNodes.length - 1; i++) {
      newNodes[i].ancestorId = newNodes[i + 1].id;
      newNodes[i + 1].descendants.push(newNodes[i].id);
    }
    const name = names[0] + "'s Family Tree";
    setTreeName(name);
    setNodes(newNodes);
    setRowOrder(null);
    rowOrderRef.current = null;
    setInitDone(true);
    persist(newNodes, name, null);
  }, [persist]);

  // ── reset ─────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    lsClear(treeId);
    nextId.current = makeIdGen(1);
    setNodes([]);
    setTreeName('Family Tree');
    setRowOrder(null);
    rowOrderRef.current = null;
    setInitDone(false);
    if (treeId) saveTreeData(treeId, [], null).catch(console.error);
  }, [treeId]);

  return {
    nodes, treeName, rowOrder, loading, saving, initDone,
    initTree, addSpouse, addSibling, addChild, addAncestor,
    saveRowOrder, resetRowOrder, reset,
    flushToFirestore: () => persistFirestore(nodesRef.current, treeNameRef.current, rowOrderRef.current),
  };
}