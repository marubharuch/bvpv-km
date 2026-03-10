// pages/FamilyTree/TableView.jsx

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a', blue:'#1a4f76',
};

const GEN_LABELS = ['Self / Parent','Father','Grandfather','Great-GF',
  '2x Great-GF','3x Great-GF','4x Great-GF','5x Great-GF'];

function Av({ name, type='m' }) {
  const bg = type==='s'?'#8b5e3c':type==='c'?C.blue:C.maroon;
  return (
    <div style={{width:26,height:26,borderRadius:'50%',background:bg,flexShrink:0,
      display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff'}}>
      {(name||'?')[0].toUpperCase()}
    </div>
  );
}

function Stat({ num, label, last }) {
  return (
    <div style={{flex:1,textAlign:'center',padding:'13px 6px 9px',
      borderRight: last ? 'none' : `1px solid ${C.border}`}}>
      <div style={{fontSize:21,fontWeight:700,color:C.maroon,lineHeight:1}}>{num}</div>
      <div style={{fontSize:10,fontWeight:600,letterSpacing:'1.3px',textTransform:'uppercase',
        color:C.muted,marginTop:3}}>{label}</div>
    </div>
  );
}

function PersonCell({ person, nodes, isYoungest, onNameClick }) {
  if (!person) return <span style={{color:'#d6c99a',fontSize:16}}>—</span>;
  const spouses = nodes.filter(n => n.spouseOf === person.id);
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:spouses.length?5:0}}>
        <Av name={person.name} type='m' />
        <span
          onClick={() => onNameClick && onNameClick(person.id)}
          style={{
            fontWeight:500, fontSize:13,
            cursor: onNameClick ? 'pointer' : 'default',
            color: onNameClick ? C.maroon : 'inherit',
            textDecoration: onNameClick ? 'underline dotted' : 'none',
          }}
          title={onNameClick ? 'Click to edit in tree view' : ''}
        >
          {person.name}
          {isYoungest && (
            <span style={{display:'inline-block',background:'#fdebd0',color:'#a04000',
              fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',
              padding:'1px 5px',borderRadius:3,marginLeft:5,verticalAlign:'middle'}}>YOU</span>
          )}
        </span>
      </div>
      {spouses.map(sp => (
        <div key={sp.id} style={{display:'flex',alignItems:'center',gap:7,paddingLeft:10,marginTop:4}}>
          <Av name={sp.name} type='s' />
          <span style={{fontWeight:500,fontSize:13,fontStyle:'italic',color:'#8b5e3c'}}>{sp.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function TableView({ nodes, onEditPerson }) {
  const ns = nodes.filter(n => !n.spouseOf);
  if (ns.length === 0) return (
    <div style={{padding:40,textAlign:'center',color:C.muted,fontFamily:"'DM Sans',sans-serif"}}>
      No data to display.
    </div>
  );

  const mn = Math.min(...ns.map(n => n.gen));
  const mx = Math.max(...ns.map(n => n.gen));

  const total     = nodes.length;
  const ancestors = ns.filter(n => n.gen > mn).length;
  const children  = ns.filter(n => n.gen < mn).length;
  const gens      = mx - mn + 1;
  const spouses   = nodes.filter(n => n.spouseOf).length;
  const siblings  = ns.filter(n => n.siblings && n.siblings.length > 0).length;

  const byId = id => nodes.find(n => n.id === id);

  // Build TWO-WAY parent lookup from ALL possible sources:
  // 1. node.descendants[] — direct parent relationship
  // 2. node.siblings[] — share same parent, so find parent via sibling's ancestorId or parentOf
  const parentOf = {};

  // Pass 1: build from descendants[]
  ns.forEach(n => {
    (n.descendants || []).forEach(cid => {
      if (!parentOf[cid]) parentOf[cid] = n.id;
    });
  });

  // Pass 2: fill gaps via siblings — if A is sibling of B and B has a known parent, A has same parent
  let changed = true;
  while (changed) {
    changed = false;
    ns.forEach(n => {
      if (parentOf[n.id]) return; // already known
      const knownParentViaSibling = (n.siblings || []).map(sid => {
        const sib = byId(sid);
        if (!sib) return null;
        return sib.ancestorId || parentOf[sib.id] || null;
      }).find(Boolean);
      if (knownParentViaSibling) {
        parentOf[n.id] = knownParentViaSibling;
        // Also add this node to the parent's descendants if missing
        const parent = byId(knownParentViaSibling);
        if (parent && !(parent.descendants || []).includes(n.id)) {
          parent._extraDesc = parent._extraDesc || [];
          parent._extraDesc.push(n.id);
        }
        changed = true;
      }
    });
  }

  function chainOf(startNode) {
    const c = {};
    let cur = startNode;
    const seen = new Set();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      c[cur.gen] = cur;
      // Walk up: prefer ancestorId, fallback to parentOf lookup (handles broken chains)
      const nextId = cur.ancestorId || parentOf[cur.id];
      cur = nextId ? byId(nextId) : null;
    }
    return c;
  }


  // ── Leaves: nodes with no children of their own = one row each
  const hasOwnChildren = id => {
    const n = byId(id);
    if (!n) return false;
    const directDesc = (n.descendants || []).some(cid => {
      const c = byId(cid); return c && !c.spouseOf;
    });
    if (directDesc) return true;
    return ns.some(x => !x.spouseOf && parentOf[x.id] === id);
  };

  // All non-spouse nodes that have no children of their own = leaf rows
  const leaves = ns.filter(n => !hasOwnChildren(n.id));

  const startNodes = leaves.length > 0 ? leaves : ns.filter(n => n.gen === mn);

  const allPaths = startNodes.map(l => chainOf(l));

  // Helper: get effective node at gen g in a chain, walking up via parentOf if missing
  function resolveChainAt(chain, g) {
    if (chain[g]) return chain[g];
    // Not directly in chain — find the lowest gen we have and walk up parentOf
    const gens = Object.keys(chain).map(Number).sort((a,b) => b - a);
    for (const kg of gens) {
      if (kg <= g) break;
      // walk from kg upward to see if we can reach gen g
    }
    // Try walking up from each chain entry via parentOf
    for (const kg of Object.keys(chain).map(Number)) {
      let cur = chain[kg];
      const seen = new Set();
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        if (cur.gen === g) return cur;
        const nextId = cur.ancestorId || parentOf[cur.id];
        cur = nextId ? byId(nextId) : null;
      }
    }
    return null;
  }

  allPaths.sort((a, b) => {
    for (let g = mx; g >= mn; g--) {
      const an = resolveChainAt(a, g);
      const bn = resolveChainAt(b, g);
      const aid = an?.id ?? -1;
      const bid = bn?.id ?? -1;
      if (aid === bid) continue;
      const aname = an?.name || '\uFFFF';
      const bname = bn?.name || '\uFFFF';
      if (aname !== bname) return aname.localeCompare(bname);
      return aid - bid;
    }
    return 0;
  });

  const numRows = allPaths.length;

  const rowspan = allPaths.map(() => ({}));
  for (let g = mn; g <= mx; g++) {
    let i = 0;
    while (i < numRows) {
      const person = resolveChainAt(allPaths[i], g);
      if (!person) { rowspan[i][g] = 1; i++; continue; }
      let span = 1;
      while (i + span < numRows && resolveChainAt(allPaths[i + span], g)?.id === person.id) span++;
      rowspan[i][g] = span;
      for (let k = 1; k < span; k++) rowspan[i + k][g] = 0;
      i += span;
    }
  }

  const genCols = Array.from({length: mx - mn + 1}, (_, i) => mn + i);

  const thS = {padding:'11px 14px',fontSize:11,fontWeight:600,letterSpacing:'0.8px',
    textTransform:'uppercase',textAlign:'left',color:'#fff',
    borderRight:'1px solid rgba(255,255,255,0.15)',whiteSpace:'nowrap'};
  const tdS = {padding:'10px 14px',verticalAlign:'top',
    borderRight:`1px solid ${C.border}`,fontSize:13};

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>
      {/* Stats bar */}
      <div style={{display:'flex',background:C.cream,borderBottom:`2px solid ${C.border}`}}>
        <Stat num={total}     label="Total"       />
        <Stat num={ancestors} label="Ancestors"   />
        <Stat num={children}  label="Children"    />
        <Stat num={gens}      label="Generations" />
        <Stat num={spouses}   label="Spouses"     />
        <Stat num={siblings}  label="Siblings"    last />
      </div>

      {/* Info bar */}
      <div style={{fontSize:12,color:C.muted,padding:'7px 16px',
        background:'#faf3e0',borderBottom:`1px solid ${C.border}`}}>
        ℹ️ Lineage Table · spouses appear inside their partner's cell ·{' '}
        <span style={{color:C.maroon,fontWeight:600}}>click any name</span> to jump to edit view
      </div>

      {/* Table */}
      <div style={{overflowX:'auto',padding:16}}>
        <table style={{borderCollapse:'collapse',width:'100%',minWidth:500,
          background:C.cream,border:`1px solid ${C.border}`}}>
          <thead>
            <tr style={{background:C.maroon}}>
              <th style={{...thS,width:44,textAlign:'center'}}>Sr.</th>
              {genCols.map(g => (
                <th key={g} style={thS}>{GEN_LABELS[g - mn] ?? `G${g}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPaths.map((chain, ri) => {
              return (
                <tr key={ri} style={{borderBottom:`1px solid ${C.border}`,
                  background: ri % 2 === 0 ? C.cream : '#faf6e8'}}>
                  {/* Sr */}
                  <td style={{...tdS,textAlign:'center',color:C.muted,fontSize:12,
                    verticalAlign:'middle',width:44}}>{ri + 1}</td>

                  {/* Gen columns */}
                  {genCols.map(g => {
                    const span = rowspan[ri][g];
                    if (span === 0) return null;
                    const person = resolveChainAt(chain, g);
                    return (
                      <td key={g} rowSpan={span} style={{
                        ...tdS, minWidth:140,
                        borderLeft: span > 1 ? `3px solid ${C.gold}` : undefined,
                        verticalAlign: span > 1 ? 'middle' : 'top',
                      }}>
                        {person
                          ? <PersonCell person={person} nodes={nodes}
                              isYoungest={!!person.isYoungest}
                              onNameClick={onEditPerson} />
                          : <span style={{color:'#d6c99a',fontSize:16}}>—</span>
                        }
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}