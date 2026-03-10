// utils/treeGraph.js
// ─────────────────────────────────────────────────────────────────────────────
// DATA MODEL:
//   ancestorId  → points to the member one generation OLDER
//   descendants → array of member IDs one generation YOUNGER
//   spouseId    → partner (same generation)
//   fatherId/motherId kept for backwards compat
// ─────────────────────────────────────────────────────────────────────────────

export const getSpouse   = (members, id) => members[members[id]?.spouseId] || null;
export const getFather   = (members, id) => members[members[id]?.fatherId]  || null;

export const getChildren = (members, parentId) =>
  Object.entries(members)
    .filter(([, m]) => m.fatherId === parentId || m.motherId === parentId)
    .map(([id, m]) => ({ ...m, id }));

export const getSiblings = (members, id) => {
  const m = members[id];
  if (!m) return [];
  const ancId = m.ancestorId || m.fatherId;
  if (!ancId) return [];
  return Object.entries(members)
    .filter(([sid, s]) => sid !== id && !isSpouseNode(members, sid) &&
      (s.ancestorId === ancId || s.fatherId === ancId))
    .map(([sid, s]) => ({ ...s, id: sid }));
};

// Nodes referenced as spouseId by another node = "spouse" nodes
export function isSpouseNode(members, id) {
  return Object.keys(members).some(oid => oid !== id && members[oid]?.spouseId === id);
}

export function getAncestorChain(members, startId, maxDepth = 10) {
  const chain = [];
  let currentId = startId;
  const visited = new Set();
  while (chain.length < maxDepth) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const m = members[currentId];
    if (!m) break;
    const nextId = m.ancestorId || m.fatherId;
    if (!nextId || !members[nextId]) break;
    chain.push({ ...members[nextId], id: nextId });
    currentId = nextId;
  }
  return chain;
}

export function getDescendants(members, parentId) {
  const m = members[parentId];
  if (!m) return [];
  if (m.descendants && m.descendants.length > 0) {
    return m.descendants.map(id => members[id] ? { ...members[id], id } : null).filter(Boolean);
  }
  return Object.entries(members)
    .filter(([, cm]) => cm.fatherId === parentId || cm.motherId === parentId)
    .map(([id, cm]) => ({ ...cm, id }));
}

export function getDescendantChain(members, startId, maxDepth = 5) {
  const results = [];
  const queue   = [{ id: startId, depth: 0 }];
  const visited = new Set([startId]);
  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (depth >= maxDepth) continue;
    getDescendants(members, id).forEach(child => {
      if (visited.has(child.id)) return;
      visited.add(child.id);
      results.push({ ...child, depth: depth + 1 });
      queue.push({ id: child.id, depth: depth + 1 });
    });
  }
  return results;
}

// ── VSCode tree builder ──────────────────────────────────────────────────────

export function buildVscTree(members, selfId) {
  if (!selfId || !members[selfId]) return null;
  const makeNode = (id, type, relation) => {
    if (!id || !members[id]) return null;
    const m = members[id];
    return {
      id, type, relation,
      name: m.name, gender: m.gender, year: m.year, rip: m.rip || false,
      spouse: m.spouseId && members[m.spouseId] ? { ...members[m.spouseId], id: m.spouseId } : null,
      siblings: getSiblings(members, id).map(s => ({ ...s, type: 'sib', children: [], siblings: [], spouse: null })),
      children: [], _childCount: 0,
    };
  };
  const selfNode = makeNode(selfId, 'you', 'YOU');
  if (!selfNode) return null;
  const children = getDescendants(members, selfId);
  selfNode.children    = children.map(c => makeNode(c.id, 'child', 'son/daughter')).filter(Boolean);
  selfNode._childCount = selfNode.children.length;
  const ancestors = getAncestorChain(members, selfId);
  let cur = selfNode;
  ancestors.forEach((anc, i) => {
    const ancNode = makeNode(anc.id, 'anc', anc.relation || `ancestor ${i + 1}`);
    if (!ancNode) return;
    ancNode.children = [cur]; ancNode._childCount = 1; cur = ancNode;
  });
  return cur;
}

// ── Build gen map via BFS from selfId ────────────────────────────────────────

function buildGenMap(members, selfId) {
  const genMap  = {};
  const queue   = [{ id: selfId, gen: 0 }];
  const visited = new Set([selfId]);
  genMap[selfId] = 0;
  while (queue.length) {
    const { id, gen } = queue.shift();
    const m = members[id];
    if (!m) continue;
    const ancId = m.ancestorId || m.fatherId;
    if (ancId && members[ancId] && !visited.has(ancId)) {
      visited.add(ancId); genMap[ancId] = gen + 1; queue.push({ id: ancId, gen: gen + 1 });
    }
    getDescendants(members, id).forEach(child => {
      if (visited.has(child.id)) return;
      visited.add(child.id); genMap[child.id] = gen - 1; queue.push({ id: child.id, gen: gen - 1 });
    });
    if (m.spouseId && members[m.spouseId] && !visited.has(m.spouseId)) {
      visited.add(m.spouseId); genMap[m.spouseId] = gen; queue.push({ id: m.spouseId, gen });
    }
  }
  // Unvisited: try via ancestorId
  Object.keys(members).forEach(id => {
    if (visited.has(id)) return;
    const ancId = members[id]?.ancestorId || members[id]?.fatherId;
    if (ancId && genMap[ancId] !== undefined) genMap[id] = genMap[ancId] - 1;
  });
  return genMap;
}

// ── Lineage table rows ───────────────────────────────────────────────────────
// Returns { rows, spanMap, colGens, minGen, maxGen }
// rows = [ { chainMap: {gen → memberObj}, leafGen, leafId } ]

export function buildLineageRows(members, selfId) {
  if (!selfId || !members[selfId]) return { rows: [], spanMap: {}, colGens: [], minGen: 0, maxGen: 0 };

  const allIds     = Object.keys(members);
  const genMap     = buildGenMap(members, selfId);
  const spouseSet  = new Set(allIds.map(id => members[id]?.spouseId).filter(Boolean));
  const ns         = allIds.filter(id => members[id] && !spouseSet.has(id));

  if (ns.length === 0) return { rows: [], spanMap: {}, colGens: [], minGen: 0, maxGen: 0 };

  const gensForNs = ns.map(id => genMap[id] ?? 0);
  const minGen    = Math.min(...gensForNs);
  const maxGen    = Math.max(...gensForNs);

  // chainOf: walk ancestorId from startId, build { gen → memberObj }
  function chainOf(startId) {
    const chain = {};
    let curId   = startId;
    const seen  = new Set();
    while (curId && members[curId] && !seen.has(curId)) {
      seen.add(curId);
      chain[genMap[curId] ?? 0] = { ...members[curId], id: curId };
      const nextId = members[curId].ancestorId || members[curId].fatherId;
      curId = nextId || null;
    }
    return chain;
  }

  // Leaves = non-spouse nodes that nobody points to as their ancestor
  const allAncIds = new Set(ns.map(id => members[id]?.ancestorId || members[id]?.fatherId).filter(Boolean));
  const leaves    = ns.filter(id => !allAncIds.has(id));

  const allPaths  = leaves.map(leafId => ({
    chainMap: chainOf(leafId),
    leafGen:  genMap[leafId] ?? minGen,
    leafId,
  }));

  // Sort oldest-first so rowspan merging eliminates duplicate names
  allPaths.sort((a, b) => {
    for (let g = maxGen; g >= minGen; g--) {
      const an = (a.chainMap[g] || {}).name || '\uFFFF';
      const bn = (b.chainMap[g] || {}).name || '\uFFFF';
      if (an !== bn) return an.localeCompare(bn);
    }
    return 0;
  });

  const numRows = allPaths.length;
  const colGens = [];
  for (let g = minGen; g <= maxGen; g++) colGens.push(g);

  // Rowspan: consecutive rows sharing same member id at column g → merge
  const spanMap = {};
  colGens.forEach(g => {
    let i = 0;
    while (i < numRows) {
      const person = allPaths[i].chainMap[g];
      const key0   = `${g}_${i}`;
      if (!person) { spanMap[key0] = 1; i++; continue; }
      let span = 1;
      while (i + span < numRows && allPaths[i + span].chainMap[g]?.id === person.id) span++;
      spanMap[key0] = span;
      for (let k = 1; k < span; k++) spanMap[`${g}_${i + k}`] = 0;
      i += span;
    }
  });

  return { rows: allPaths, spanMap, colGens, minGen, maxGen };
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function computeStats(members) {
  const all = Object.values(members);
  return {
    total:   all.length,
    living:  all.filter(m => !m.rip).length,
    males:   all.filter(m => m.gender === 'M').length,
    females: all.filter(m => m.gender === 'F').length,
  };
}

export function computeLineageStats(members, selfId) {
  if (!selfId || !members[selfId]) return { total: 0, ancestors: 0, children: 0, generations: 0, spouses: 0, siblings: 0 };
  const genMap    = buildGenMap(members, selfId);
  const spouseSet = new Set(Object.keys(members).map(id => members[id]?.spouseId).filter(Boolean));
  const ns        = Object.keys(members).filter(id => !spouseSet.has(id));
  const ancestors = ns.filter(id => (genMap[id] ?? 0) > 0).length;
  const children  = ns.filter(id => (genMap[id] ?? 0) < 0).length;
  const gens      = ns.map(id => genMap[id] ?? 0);
  const generations = gens.length > 0 ? Math.max(...gens) - Math.min(...gens) + 1 : 1;
  return {
    total:       Object.keys(members).length,
    ancestors,
    children,
    generations,
    spouses:     spouseSet.size,
    siblings:    getSiblings(members, selfId).length,
  };
}

export function membersArray(members) {
  return Object.entries(members).map(([id, m]) => ({ ...m, id }));
}
