// hooks/useFamilyTree.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../lib/firebase';

const LS_NODES = 'vt_nodes_v2';
const LS_META  = 'vt_meta_v2';

const lsLoad = () => { try { const r=localStorage.getItem(LS_NODES); return r?JSON.parse(r):null; } catch{return null;} };
const lsMeta = () => { try { const r=localStorage.getItem(LS_META);  return r?JSON.parse(r):{};  } catch{return{};} };
const lsSave = (nodes, meta) => { try { localStorage.setItem(LS_NODES,JSON.stringify(nodes)); localStorage.setItem(LS_META,JSON.stringify(meta)); } catch{} };
const lsClear= () => { try { localStorage.removeItem(LS_NODES); localStorage.removeItem(LS_META); } catch{} };

const treeRef = uid => doc(firestore, 'vansh_trees', uid);
const fsLoad  = uid => getDoc(treeRef(uid)).then(s => s.exists() ? s.data() : null);
const fsSave  = (uid, nodes, meta) => setDoc(treeRef(uid), { nodes, meta, updatedAt: serverTimestamp() });

function makeIdGen(startFrom = 1) {
  let n = startFrom;
  return () => n++;
}

export function useFamilyTree(uid) {
  const [nodes,    setNodes]    = useState([]);
  const [treeName, setTreeName] = useState('Family Tree');
  const [rowOrder, setRowOrder] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [initDone, setInitDone] = useState(false);

  const nextId      = useRef(makeIdGen(1));
  const saveTimer   = useRef(null);
  // Keep latest values in refs so callbacks never go stale
  const treeNameRef = useRef('Family Tree');
  const rowOrderRef = useRef(null);
  const nodesRef    = useRef([]);

  // Keep refs in sync
  useEffect(() => { treeNameRef.current = treeName; }, [treeName]);
  useEffect(() => { rowOrderRef.current = rowOrder; }, [rowOrder]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // ── persist ───────────────────────────────────────────────────────────────
  const persist = useCallback((newNodes, name, order) => {
    const meta = { treeName: name, rowOrder: order ?? null };
    lsSave(newNodes, meta);
    if (!uid) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await fsSave(uid, newNodes, meta); }
      catch(e) { console.error('Firestore save failed:', e); }
      finally { setSaving(false); }
    }, 1500);
  }, [uid]);

  // ── Mount: load ───────────────────────────────────────────────────────────
  useEffect(() => {
    const ls   = lsLoad();
    const meta = lsMeta();
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
    if (uid) {
      fsLoad(uid)
        .then(data => {
          if (data?.nodes?.length > 0) {
            const maxId = Math.max(...data.nodes.map(n => n.id), 0);
            nextId.current = makeIdGen(maxId + 1);
            setNodes(data.nodes);
            const name = data.meta?.treeName || 'Family Tree';
            setTreeName(name);
            if (data.meta?.rowOrder) setRowOrder(data.meta.rowOrder);
            lsSave(data.nodes, { treeName: name, rowOrder: data.meta?.rowOrder || null });
            setInitDone(true);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── mutate — uses refs, never stale ──────────────────────────────────────
  const mutate = useCallback((updater) => {
    setNodes(prev => {
      const next = updater(prev, nextId.current);
      persist(next, treeNameRef.current, rowOrderRef.current);
      return next;
    });
  }, [persist]);

  // ── saveRowOrder ──────────────────────────────────────────────────────────
  const saveRowOrder = useCallback((order) => {
    setRowOrder(order);
    rowOrderRef.current = order;
    persist(nodesRef.current, treeNameRef.current, order);
  }, [persist]);

  const resetRowOrder = useCallback(() => {
    setRowOrder(null);
    rowOrderRef.current = null;
    persist(nodesRef.current, treeNameRef.current, null);
  }, [persist]);

  // ── addSpouse ─────────────────────────────────────────────────────────────
  const addSpouse = useCallback((pid, name) => {
    mutate((prev, getId) => {
      const p = prev.find(n => n.id === pid);
      if (!p) return prev;
      return [...prev, { id:getId(), name, gen:p.gen, ancestorId:null, spouseOf:pid, descendants:[], siblings:[] }];
    });
  }, [mutate]);

  // ── addSibling ────────────────────────────────────────────────────────────
  const addSibling = useCallback((pid, name) => {
    mutate((prev, getId) => {
      const p = prev.find(n => n.id === pid);
      if (!p) return prev;
      const sid = getId();
      const trueParentId = p.ancestorId
        || prev.find(n => !n.spouseOf && (n.descendants||[]).includes(pid))?.id
        || null;
      return [
        ...prev.map(n => {
          if (n.id === pid)          return { ...n, siblings: [...n.siblings, sid] };
          if (n.id === trueParentId) return { ...n, descendants: [...(n.descendants||[]), sid] };
          return n;
        }),
        { id:sid, name, gen:p.gen, ancestorId:trueParentId, spouseOf:null, descendants:[], siblings:[] },
      ];
    });
  }, [mutate]);

  // ── addChild ──────────────────────────────────────────────────────────────
  const addChild = useCallback((pid, name) => {
    mutate((prev, getId) => {
      const p = prev.find(n => n.id === pid);
      if (!p) return prev;
      let cg = p.gen - 1;
      let base = prev;
      if (cg < 1) { base = prev.map(n => ({ ...n, gen: n.gen + 1 })); cg = 1; }
      const cid = getId();
      return [
        ...base.map(n => n.id === pid ? { ...n, descendants: [...(n.descendants||[]), cid] } : n),
        { id:cid, name, gen:cg, ancestorId:pid, spouseOf:null, descendants:[], siblings:[] },
      ];
    });
  }, [mutate]);

  // ── addAncestor ───────────────────────────────────────────────────────────
  const addAncestor = useCallback((pid, name) => {
    if (!name || !name.trim()) return;
    mutate((prev, getId) => {
      const p = prev.find(n => n.id === pid);
      if (!p) return prev;
      const aid = getId();
      const newGen = p.gen + 1;
      const siblingIds = new Set(p.siblings || []);
      const updated = prev.map(n => {
        if (n.id === pid) return { ...n, ancestorId: aid };
        if (siblingIds.has(n.id) && (n.ancestorId === p.ancestorId || n.ancestorId === null))
          return { ...n, ancestorId: aid };
        return n;
      });
      const newDescendants = [pid, ...Array.from(siblingIds).filter(sid => {
        const s = prev.find(n => n.id === sid);
        return s && (s.ancestorId === p.ancestorId || s.ancestorId === null);
      })];
      return [...updated, { id:aid, name:name.trim(), gen:newGen, ancestorId:null, spouseOf:null, descendants:newDescendants, siblings:[] }];
    });
  }, [mutate]);

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    lsClear();
    nextId.current = makeIdGen(1);
    setNodes([]);
    setTreeName('Family Tree');
    setRowOrder(null);
    rowOrderRef.current = null;
    setInitDone(false);
    if (uid) fsSave(uid, [], { treeName: 'Family Tree', rowOrder: null }).catch(console.error);
  }, [uid]);

  // ── initTree ──────────────────────────────────────────────────────────────
  const initTree = useCallback((rawInput) => {
    const names = rawInput.trim().split(/\s+/).filter(Boolean);
    if (!names.length) return;
    nextId.current = makeIdGen(1);
    const getId = () => nextId.current();
    const newNodes = names.map((name, i) => ({
      id: getId(), name, gen: i + 1,
      ancestorId: null, spouseOf: null, descendants: [], siblings: [], isYoungest: i === 0,
    }));
    for (let i = 0; i < newNodes.length - 1; i++) {
      newNodes[i].ancestorId = newNodes[i + 1].id;
      newNodes[i + 1].descendants.push(newNodes[i].id);
    }
    const name = names[0] + "'s Family Tree";
    lsClear();
    setTreeName(name);
    setNodes(newNodes);
    setRowOrder(null);
    rowOrderRef.current = null;
    setInitDone(true);
    persist(newNodes, name, null);
  }, [persist]);

  return {
    nodes, treeName, rowOrder, loading, saving, initDone,
    initTree, addSpouse, addSibling, addChild, addAncestor,
    saveRowOrder, resetRowOrder, reset,
  };
}