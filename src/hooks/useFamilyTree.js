// hooks/useFamilyTree.js
// Persistence: localStorage (instant) + Firestore (debounced 1.5s)

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

// ID counter — lives inside the hook via ref so it's per-instance
function makeIdGen(startFrom = 1) {
  let n = startFrom;
  return () => n++;
}

export function useFamilyTree(uid) {
  const [nodes,    setNodes]    = useState([]);
  const [treeName, setTreeName] = useState('Family Tree');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [initDone, setInitDone] = useState(false);

  const nextId    = useRef(makeIdGen(1));
  const saveTimer = useRef(null);

  // ── persist helper ────────────────────────────────────────────────────────
  const persist = useCallback((newNodes, name) => {
    const meta = { treeName: name };
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
            lsSave(data.nodes, { treeName: name });
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

  // ── initTree ──────────────────────────────────────────────────────────────
  const initTree = useCallback((rawInput) => {
    const names = rawInput.trim().split(/\s+/).filter(Boolean);
    if (!names.length) return;

    // Reset ID counter from 1 for a fresh tree
    nextId.current = makeIdGen(1);
    const getId = () => nextId.current();

    const newNodes = names.map((name, i) => ({
      id:          getId(),
      name,
      gen:         i + 1,          // gen1 = youngest, gen N = oldest
      ancestorId:  null,
      spouseOf:    null,
      descendants: [],
      siblings:    [],
      isYoungest:  i === 0,
    }));

    // Link: each node's ancestorId → next node (one gen older)
    // older node's descendants[] ← younger node id
    for (let i = 0; i < newNodes.length - 1; i++) {
      newNodes[i].ancestorId = newNodes[i + 1].id;
      newNodes[i + 1].descendants.push(newNodes[i].id);
    }

    const name = names[0] + "'s Family Tree";
    lsClear();
    setTreeName(name);
    setNodes(newNodes);
    setInitDone(true);
    persist(newNodes, name);
  }, [persist]);

  // ── mutate helper ─────────────────────────────────────────────────────────
  const mutate = useCallback((updater) => {
    setNodes(prev => {
      const next = updater(prev, nextId.current);
      persist(next, treeName);
      return next;
    });
  }, [persist, treeName]);

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

      // Find the true parent: prefer p.ancestorId, fallback to whoever lists pid in descendants[]
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

      // Collect all siblings of pid (nodes at same gen whose ancestorId is null
      // or same as pid's current ancestorId, and are listed in pid's siblings[])
      const siblingIds = new Set(p.siblings || []);

      const updated = prev.map(n => {
        if (n.id === pid) return { ...n, ancestorId: aid };
        // Also fix siblings that have broken/null ancestorId pointing to same parent
        if (siblingIds.has(n.id) && (n.ancestorId === p.ancestorId || n.ancestorId === null)) {
          return { ...n, ancestorId: aid };
        }
        return n;
      });

      // New ancestor's descendants = pid + all its siblings that got re-parented
      const newDescendants = [pid, ...Array.from(siblingIds).filter(sid => {
        const s = prev.find(n => n.id === sid);
        return s && (s.ancestorId === p.ancestorId || s.ancestorId === null);
      })];

      const newNode = {
        id: aid, name: name.trim(), gen: newGen,
        ancestorId: null, spouseOf: null,
        descendants: newDescendants, siblings: [],
      };
      return [...updated, newNode];
    });
  }, [mutate]);

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    lsClear();
    nextId.current = makeIdGen(1);
    setNodes([]);
    setTreeName('Family Tree');
    setInitDone(false);
    if (uid) fsSave(uid, [], { treeName: 'Family Tree' }).catch(console.error);
  }, [uid]);

  return { nodes, treeName, loading, saving, initDone, initTree, addSpouse, addSibling, addChild, addAncestor, reset };
}