// pages/FamilyTree/EditView.jsx
import { useState, useEffect, useRef, useMemo } from 'react';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', text:'#2d1a0e', muted:'#9c7c5a',
  rust:'#8b3a1e', sage:'#3d6b35', blue:'#1a4f76',
};

/* ── Inline input ─────────────────────────────────────────────── */
function InlineInput({ type, onConfirm, onCancel }) {
  const [val, setVal] = useState('');
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 40); }, []);
  const ph = type==='spouse' ? 'Spouse name…'
    : type==='sibling' ? 'Sibling name…'
    : type==='ancestor' ? 'Ancestor name…'
    : 'Child name…';
  const confirm = () => { const v = val.trim(); if (v) onConfirm(v); };
  return (
    <div style={{display:'flex',gap:5,alignItems:'center',marginTop:7,flexWrap:'wrap'}}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)} placeholder={ph}
        onKeyDown={e => { if(e.key==='Enter') confirm(); if(e.key==='Escape') onCancel(); }}
        style={{flex:1,minWidth:80,padding:'4px 8px',border:`1px solid ${C.gold}`,
          borderRadius:4,fontSize:12,fontFamily:"'DM Sans',sans-serif",
          background:C.bg,color:C.text,outline:'none'}} />
      <button onClick={confirm}
        style={{padding:'4px 9px',background:C.maroon,border:'none',borderRadius:4,
          color:'#fff',fontSize:11,cursor:'pointer'}}>Add</button>
      <button onClick={onCancel}
        style={{padding:'4px 7px',background:'transparent',border:'1px solid #ccc',
          borderRadius:4,color:'#aaa',fontSize:11,cursor:'pointer'}}>✕</button>
    </div>
  );
}

/* ── Small CTA button ─────────────────────────────────────────── */
function Cta({ label, color, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{fontSize:10,padding:'2px 7px',borderRadius:4,border:`1px solid ${color}`,
        cursor:'pointer',background:h?color:'transparent',color:h?'#fff':color,
        fontFamily:"'DM Sans',sans-serif",transition:'all .12s',whiteSpace:'nowrap'}}>
      {label}
    </button>
  );
}

/* ── Single person card ───────────────────────────────────────── */
function PersonCard({ person, isSpouse, isOldest, hasSpouse, isFocused,
  onSpouse, onSibling, onChild, onAncestor, cardRef }) {
  return (
    <div ref={cardRef} style={{
      background: isSpouse ? '#fdf8f0' : C.cream,
      border: isFocused
        ? `2.5px solid ${C.gold}`
        : `1.5px solid ${isOldest ? C.maroon : isSpouse ? 'rgba(196,153,58,0.45)' : C.border}`,
      borderRadius:6, padding:'12px 12px 9px',
      minWidth:128, maxWidth:165,
      boxShadow: isFocused
        ? `0 0 0 4px rgba(196,153,58,0.25), 0 2px 12px rgba(60,15,15,0.18)`
        : '0 2px 8px rgba(60,15,15,0.1)',
      transition:'box-shadow 0.4s, border-color 0.4s',
    }}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:14,
        marginBottom:3,lineHeight:1.3,wordBreak:'break-word'}}>{person.name}</div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',
        color:C.gold,marginBottom: isSpouse ? 0 : 9}}>G{person.gen}</div>
      {!isSpouse && (
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {!hasSpouse && <Cta label="⚖ Spouse"  color={C.rust}   onClick={onSpouse}   />}
          <Cta label="❧ Sibling"  color={C.sage}   onClick={onSibling}  />
          <Cta label="⬦ Child"    color={C.blue}   onClick={onChild}    />
          {isOldest && <Cta label="↑ Ancestor" color={C.maroon} onClick={onAncestor} />}
        </div>
      )}
    </div>
  );
}

/* ── NodeGroup ─────────────────────────────────────────────────── */
function NodeGroup({ personId, nodeMap, spouseMap, childMap,
  pending, onPending, addSpouse, addSibling, addChild, addAncestor,
  oldest, focusId, focusRefs }) {

  const person = nodeMap[personId];
  if (!person) return null;

  const spouse   = spouseMap[personId];
  const children = childMap[personId] || [];
  const isPending = pending?.personId === personId;
  const isFocused = focusId === personId;

  const cardRef = useRef(null);
  if (isFocused && focusRefs) {
    focusRefs.current = cardRef;
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'flex',alignItems:'center'}}>
        <PersonCard person={person} isSpouse={false}
          isOldest={person.gen === oldest} hasSpouse={!!spouse}
          isFocused={isFocused} cardRef={cardRef}
          onSpouse={()    => onPending({personId, type:'spouse'})}
          onSibling={()   => onPending({personId, type:'sibling'})}
          onChild={()     => onPending({personId, type:'child'})}
          onAncestor={() => onPending({personId, type:'ancestor'})} />
        {spouse && <>
          <div style={{width:22,height:2,background:C.gold,flexShrink:0,position:'relative'}}>
            <span style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',
              fontSize:13,color:C.gold,background:C.bg,padding:'0 2px'}}>∞</span>
          </div>
          <PersonCard person={spouse} isSpouse={true} isOldest={false} hasSpouse={false}
            isFocused={false} cardRef={null} />
        </>}
      </div>

      {isPending && (
        <InlineInput type={pending.type}
          onConfirm={v => {
            if      (pending.type==='spouse')   addSpouse(personId, v);
            else if (pending.type==='sibling')  addSibling(personId, v);
            else if (pending.type==='ancestor') addAncestor(personId, v);
            else                                addChild(personId, v);
            onPending(null);
          }}
          onCancel={() => onPending(null)} />
      )}

      {children.length > 0 && (
        <div style={{marginLeft:28,paddingLeft:14,
          borderLeft:'2px dashed rgba(196,153,58,0.35)',
          display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
          {children.map(child => (
            <NodeGroup key={child.id} personId={child.id}
              nodeMap={nodeMap} spouseMap={spouseMap} childMap={childMap}
              pending={pending} onPending={onPending}
              addSpouse={addSpouse} addSibling={addSibling}
              addChild={addChild} addAncestor={addAncestor}
              oldest={oldest} focusId={focusId} focusRefs={focusRefs} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main EditView ────────────────────────────────────────────── */
export default function EditView({ nodes, addSpouse, addSibling, addChild, addAncestor, focusId }) {
  const [pending, setPending] = useState(null);
  const focusRefs = useRef(null);

  useEffect(() => {
    if (!focusId) return;
    const timer = setTimeout(() => {
      const cardRef = focusRefs.current;
      if (cardRef?.current) {
        cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [focusId]);

  const { nodeMap, spouseMap, childMap, roots, oldest } = useMemo(() => {
    const nodeMap   = {};
    const spouseMap = {};
    const childMap  = {};
    const allChildIds = new Set();

    nodes.forEach(n => { nodeMap[n.id] = n; });

    nodes.forEach(n => {
      if (n.spouseOf) { spouseMap[n.spouseOf] = n; return; }
      (n.descendants || []).forEach(cid => {
        const child = nodeMap[cid];
        if (child && !child.spouseOf) {
          if (!childMap[n.id]) childMap[n.id] = [];
          childMap[n.id].push(child);
          allChildIds.add(cid);
        }
      });
    });

    const roots  = nodes.filter(n => !n.spouseOf && !allChildIds.has(n.id));
    const ns     = nodes.filter(n => !n.spouseOf);
    const oldest = ns.length ? Math.max(...ns.map(n => n.gen)) : 1;

    return { nodeMap, spouseMap, childMap, roots, oldest };
  }, [nodes]);

  if (roots.length === 0) return null;

  const genGroups = {};
  roots.forEach(r => {
    if (!genGroups[r.gen]) genGroups[r.gen] = [];
    genGroups[r.gen].push(r);
  });
  const sortedGens = Object.keys(genGroups).map(Number).sort((a,b) => b - a);

  return (
    <div style={{padding:'28px 20px 80px',overflowX:'auto',
      background:C.bg,minHeight:'calc(100vh - 54px)'}}>

      <div style={{fontSize:13,color:C.muted,background:'#fdf5e0',
        border:`1px solid ${C.border}`,borderRadius:6,padding:'10px 16px',
        marginBottom:22,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        ℹ️ Add <strong style={{margin:'0 3px'}}>Spouse</strong>,{' '}
        <strong style={{margin:'0 3px'}}>Sibling</strong>,{' '}
        <strong style={{margin:'0 3px'}}>Child</strong>, or use{' '}
        <strong style={{margin:'0 3px'}}>↑ Ancestor</strong> on the oldest card to add above.
        Then click <strong style={{marginLeft:3}}>Submit &amp; View Table</strong> when done.
      </div>

      {sortedGens.map(g => (
        <div key={g} style={{display:'flex',alignItems:'flex-start',marginBottom:36,gap:0}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',
            color:C.gold,writingMode:'vertical-lr',transform:'rotate(180deg)',
            minWidth:34,paddingTop:20,flexShrink:0}}>G{g}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:14,alignItems:'flex-start',flex:1}}>
            {genGroups[g].map(person => (
              <NodeGroup key={person.id} personId={person.id}
                nodeMap={nodeMap} spouseMap={spouseMap} childMap={childMap}
                pending={pending} onPending={setPending}
                addSpouse={addSpouse} addSibling={addSibling}
                addChild={addChild} addAncestor={addAncestor}
                oldest={oldest} focusId={focusId} focusRefs={focusRefs} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}