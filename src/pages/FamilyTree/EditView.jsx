// pages/FamilyTree/EditView.jsx
import { useState, useEffect, useRef, useMemo } from 'react';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', text:'#2d1a0e', muted:'#9c7c5a',
  rust:'#8b3a1e', sage:'#3d6b35', blue:'#1a4f76',
  red:'#b91c1c',
};

const TYPE_CONFIG = {
  spouse:   { label:'Spouse',   icon:'⚖',  color:C.rust,   ph:'Spouse ka naam…'   },
  sibling:  { label:'Sibling',  icon:'❧',  color:C.sage,   ph:'Sibling ka naam…'  },
  child:    { label:'Child',    icon:'⬦',  color:C.blue,   ph:'Child ka naam…'    },
  ancestor: { label:'Ancestor', icon:'↑',  color:C.maroon, ph:'Ancestor ka naam…' },
};

/* ── Bottom Sheet — Add member ────────────────────────────────── */
function AddBottomSheet({ pending, onConfirm, onCancel }) {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);
  const sheetRef = useRef(null);
  const cfg = TYPE_CONFIG[pending?.type] || TYPE_CONFIG.child;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!sheetRef.current) return;
    sheetRef.current.style.transform = 'translateY(100%)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }));
  }, []);

  const confirm = () => { const v = val.trim(); if (v) onConfirm(v); };

  const handleClose = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(100%)';
      setTimeout(onCancel, 220);
    } else onCancel();
  };

  if (!pending) return null;

  return (
    <div onClick={handleClose} style={{
      position:'fixed',inset:0,zIndex:500,
      background:'rgba(0,0,0,0.4)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',
    }}>
      <div ref={sheetRef} onClick={e=>e.stopPropagation()} style={{
        width:'100%',maxWidth:520,
        background:C.cream,
        borderRadius:'18px 18px 0 0',
        padding:'0 0 36px',
        boxShadow:'0 -8px 40px rgba(60,15,15,0.22)',
        transform:'translateY(100%)',
        transition:'transform 0.25s cubic-bezier(.32,1,.46,1)',
        willChange:'transform',
      }}>
        {/* Handle */}
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 6px'}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
        </div>

        {/* Header */}
        <div style={{padding:'4px 20px 16px',borderBottom:`1px solid ${C.border}`,
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{
              width:40,height:40,borderRadius:'50%',
              background:`${cfg.color}18`,border:`1.5px solid ${cfg.color}`,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:17,color:cfg.color,
            }}>{cfg.icon}</div>
            <div>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:17,color:C.maroon}}>
                {cfg.label} Jodo
              </div>
              {pending.personName&&(
                <div style={{fontSize:12,color:C.muted,marginTop:1}}>
                  {pending.personName} ke liye
                </div>
              )}
            </div>
          </div>
          <button onClick={handleClose} style={{background:'transparent',border:'none',
            fontSize:22,color:C.muted,cursor:'pointer',padding:'4px 8px',lineHeight:1}}>✕</button>
        </div>

        {/* Input */}
        <div style={{padding:'20px 20px 0'}}>
          <label style={{fontSize:11,fontWeight:700,letterSpacing:'1px',
            textTransform:'uppercase',color:C.gold,display:'block',marginBottom:8}}>
            Naam
          </label>
          <input
            ref={inputRef} value={val}
            onChange={e=>setVal(e.target.value)}
            placeholder={cfg.ph}
            onKeyDown={e=>{ if(e.key==='Enter') confirm(); if(e.key==='Escape') handleClose(); }}
            style={{
              width:'100%',padding:'14px',
              border:`1.5px solid ${val.trim()?cfg.color:C.border}`,
              borderRadius:10,fontSize:16,
              fontFamily:"'DM Sans',sans-serif",
              background:C.bg,color:C.text,
              outline:'none',boxSizing:'border-box',
              transition:'border-color .15s',
            }}
          />
          <div style={{display:'flex',gap:10,marginTop:16}}>
            <button onClick={handleClose} style={{
              flex:1,padding:'15px 0',borderRadius:10,fontSize:14,
              border:`1px solid ${C.border}`,background:'transparent',
              color:C.muted,cursor:'pointer',fontFamily:'inherit',
            }}>Raho</button>
            <button onClick={confirm} disabled={!val.trim()} style={{
              flex:2,padding:'15px 0',borderRadius:10,fontSize:14,fontWeight:700,
              border:'none',
              background:val.trim()?cfg.color:'#ccc',
              color:'#fff',cursor:val.trim()?'pointer':'not-allowed',
              fontFamily:'inherit',transition:'background .15s',
            }}>{cfg.icon} {cfg.label} Jodo</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Edit / Delete / Move Bottom Sheet ───────────────────────── */
function EditModal({ person, allNodes, onSave, onDelete, onMove, onClose }) {
  const [name, setName]       = useState(person.name);
  const [moveToId, setMoveToId] = useState('');
  const [tab, setTab]         = useState('edit');
  const nameRef  = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => { setTimeout(()=>nameRef.current?.focus(), 120); }, []);

  useEffect(() => {
    if (!sheetRef.current) return;
    sheetRef.current.style.transform = 'translateY(100%)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }));
  }, []);

  const possibleParents = allNodes.filter(n =>
    !n.spouseOf && n.id!==person.id &&
    !(n.descendants||[]).includes(person.id)
  );

  const handleClose = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(100%)';
      setTimeout(onClose, 220);
    } else onClose();
  };

  const handleSave = () => {
    const t = name.trim(); if (!t) return;
    onSave(person.id, t); handleClose();
  };

  const handleDelete = () => {
    if (window.confirm(`"${person.name}" delete karna chahte ho? Saare descendants bhi hatenge.`)) {
      onDelete(person.id); handleClose();
    }
  };

  const handleMove = () => {
    if (!moveToId) return;
    if (window.confirm(`"${person.name}" ko naye parent se connect karein?`)) {
      onMove(person.id, moveToId); handleClose();
    }
  };

  const tabSt = (t) => ({
    flex:1,padding:'12px 4px',fontSize:12,fontWeight:600,
    border:'none',cursor:'pointer',minHeight:44,
    borderBottom:tab===t?`2.5px solid ${C.maroon}`:'2.5px solid transparent',
    background:'transparent',color:tab===t?C.maroon:C.muted,
    fontFamily:"'DM Sans',sans-serif",transition:'color .12s',
  });

  return (
    <div onClick={handleClose} style={{
      position:'fixed',inset:0,zIndex:600,
      background:'rgba(0,0,0,0.45)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',
    }}>
      <div ref={sheetRef} onClick={e=>e.stopPropagation()} style={{
        width:'100%',maxWidth:520,
        background:C.cream,
        borderRadius:'18px 18px 0 0',
        boxShadow:'0 -8px 40px rgba(60,15,15,0.22)',
        transform:'translateY(100%)',
        transition:'transform 0.25s cubic-bezier(.32,1,.46,1)',
        willChange:'transform',
        paddingBottom:36,
        maxHeight:'90vh',overflowY:'auto',
      }}>
        {/* Handle */}
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 4px'}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
        </div>

        {/* Header */}
        <div style={{background:C.maroon,padding:'12px 18px',
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'#fff',fontFamily:"'DM Serif Display',serif",fontSize:15}}>
            ✏️ {person.name}
          </span>
          <button onClick={handleClose} style={{background:'transparent',border:'none',
            color:'rgba(255,255,255,0.7)',fontSize:20,cursor:'pointer',lineHeight:1}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,background:'#fdf8f0'}}>
          <button style={tabSt('edit')}   onClick={()=>setTab('edit')}>✏️ Rename</button>
          <button style={tabSt('move')}   onClick={()=>setTab('move')}>🔗 Fix Relation</button>
          <button style={tabSt('delete')} onClick={()=>setTab('delete')}>🗑️ Delete</button>
        </div>

        <div style={{padding:'18px 18px 0'}}>

          {tab==='edit'&&(
            <div>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:1,
                textTransform:'uppercase',color:C.muted,display:'block',marginBottom:8}}>
                New Name
              </label>
              <input ref={nameRef} value={name} onChange={e=>setName(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') handleSave(); if(e.key==='Escape') handleClose(); }}
                style={{width:'100%',padding:'14px',border:`1.5px solid ${C.gold}`,
                  borderRadius:10,fontSize:16,fontFamily:"'DM Sans',sans-serif",
                  background:C.bg,color:C.text,outline:'none',boxSizing:'border-box'}}/>
              <div style={{fontSize:10,color:C.muted,marginTop:5}}>
                Gen: G{person.gen} &nbsp;|&nbsp; ID: {person.id}
              </div>
              <div style={{display:'flex',gap:10,marginTop:16}}>
                <button onClick={handleClose} style={{flex:1,padding:'15px 0',borderRadius:10,
                  fontSize:14,border:`1px solid ${C.border}`,background:'transparent',
                  color:C.muted,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
                <button onClick={handleSave} style={{flex:2,padding:'15px 0',borderRadius:10,
                  fontSize:14,fontWeight:700,border:'none',background:C.maroon,
                  color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>💾 Save Name</button>
              </div>
            </div>
          )}

          {tab==='move'&&(
            <div>
              <div style={{fontSize:13,color:C.muted,marginBottom:12,
                background:'#fdf5e0',border:`1px solid ${C.border}`,
                borderRadius:8,padding:'10px 12px',lineHeight:1.6}}>
                ℹ️ <strong>{person.name}</strong> ka parent galat hai?
                Naya parent select karo — purana connection hat jayega.
              </div>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:1,
                textTransform:'uppercase',color:C.muted,display:'block',marginBottom:8}}>
                Naya Parent
              </label>
              <select value={moveToId} onChange={e=>setMoveToId(e.target.value)}
                style={{width:'100%',padding:'14px',border:`1.5px solid ${C.gold}`,
                  borderRadius:10,fontSize:14,fontFamily:"'DM Sans',sans-serif",
                  background:C.bg,color:C.text,outline:'none',boxSizing:'border-box'}}>
                <option value=''>— Parent select karo —</option>
                {possibleParents.map(n=>(
                  <option key={n.id} value={n.id}>{n.name} (G{n.gen})</option>
                ))}
              </select>
              <div style={{display:'flex',gap:10,marginTop:16}}>
                <button onClick={handleClose} style={{flex:1,padding:'15px 0',borderRadius:10,
                  fontSize:14,border:`1px solid ${C.border}`,background:'transparent',
                  color:C.muted,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
                <button onClick={handleMove} disabled={!moveToId} style={{flex:2,padding:'15px 0',
                  borderRadius:10,fontSize:14,fontWeight:700,border:'none',fontFamily:'inherit',
                  background:moveToId?C.blue:'#ccc',color:'#fff',
                  cursor:moveToId?'pointer':'not-allowed'}}>
                  🔗 Move Here
                </button>
              </div>
            </div>
          )}

          {tab==='delete'&&(
            <div>
              <div style={{background:'#fff5f5',border:'1px solid #fca5a5',
                borderRadius:10,padding:'14px 16px',marginBottom:16}}>
                <div style={{fontWeight:700,color:C.red,fontSize:14,marginBottom:5}}>
                  ⚠️ Yeh action undo nahi hoga!
                </div>
                <div style={{fontSize:13,color:'#7f1d1d',lineHeight:1.6}}>
                  <strong>{person.name}</strong> (G{person.gen}) aur uske saare
                  descendants permanently delete ho jayenge.
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={handleClose} style={{flex:1,padding:'15px 0',borderRadius:10,
                  fontSize:14,border:`1px solid ${C.border}`,background:'transparent',
                  color:C.muted,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
                <button onClick={handleDelete} style={{flex:2,padding:'15px 0',borderRadius:10,
                  fontSize:14,fontWeight:700,border:'none',background:C.red,
                  color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>
                  🗑️ Haan, Delete Karo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small CTA button ─────────────────────────────────────────── */
function Cta({ label, color, onClick }) {
  const [h,setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        fontSize:11,fontWeight:500,padding:'7px 10px',minHeight:36,
        borderRadius:6,border:`1.5px solid ${color}`,cursor:'pointer',
        background:h?color:`${color}18`,color:h?'#fff':color,
        fontFamily:"'DM Sans',sans-serif",transition:'all .12s',
        whiteSpace:'nowrap',lineHeight:1.2,
        WebkitTapHighlightColor:'transparent',
      }}>
      {label}
    </button>
  );
}

/* ── Single person card ───────────────────────────────────────── */
function PersonCard({ person, isSpouse, isOldest, hasSpouse, isFocused,
  onSpouse, onSibling, onChild, onAncestor, onEditOpen, cardRef }) {
  return (
    <div ref={cardRef} style={{
      background:isSpouse?'#fdf8f0':C.cream,
      border:isFocused
        ?`2.5px solid ${C.gold}`
        :`1.5px solid ${isOldest?C.maroon:isSpouse?'rgba(196,153,58,0.45)':C.border}`,
      borderRadius:8,padding:'12px 12px 10px',
      minWidth:150,maxWidth:200,
      boxShadow:isFocused
        ?`0 0 0 4px rgba(196,153,58,0.25), 0 2px 12px rgba(60,15,15,0.18)`
        :'0 2px 8px rgba(60,15,15,0.1)',
      transition:'box-shadow 0.4s, border-color 0.4s',
      position:'relative',
    }}>
      {/* Edit button */}
      <button
        onClick={e=>{e.stopPropagation();onEditOpen&&onEditOpen();}}
        title="Edit / Delete / Fix"
        style={{
          position:'absolute',top:6,right:6,
          background:'transparent',border:`1px solid ${C.border}`,
          borderRadius:5,padding:'4px 8px',fontSize:13,
          minWidth:30,minHeight:30,
          cursor:'pointer',color:C.muted,lineHeight:1,
          WebkitTapHighlightColor:'transparent',
        }}
        onMouseEnter={e=>{e.currentTarget.style.background=C.gold;e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor=C.gold;}}
        onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=C.muted;e.currentTarget.style.borderColor=C.border;}}
      >✏️</button>

      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:14,
        marginBottom:3,lineHeight:1.3,wordBreak:'break-word',paddingRight:28}}>
        {person.name}
      </div>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',
        color:C.gold,marginBottom:isSpouse?0:10}}>G{person.gen}</div>

      {!isSpouse&&(
        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
          {!hasSpouse&&<Cta label="⚖ Spouse"  color={C.rust}   onClick={onSpouse}  />}
          <Cta label="❧ Sibling"  color={C.sage}   onClick={onSibling} />
          <Cta label="⬦ Child"    color={C.blue}   onClick={onChild}   />
          {isOldest&&<Cta label="↑ Ancestor" color={C.maroon} onClick={onAncestor}/>}
        </div>
      )}
    </div>
  );
}

/* ── NodeGroup ─────────────────────────────────────────────────── */
function NodeGroup({ personId, nodeMap, spouseMap, childMap,
  pending, onPending, addSpouse, addSibling, addChild, addAncestor,
  oldest, focusId, focusRefs, allNodes, onEditOpen }) {

  const person  = nodeMap[personId];
  if (!person) return null;
  const spouse   = spouseMap[personId];
  const children = childMap[personId] || [];
  const isFocused = focusId === personId;
  const cardRef = useRef(null);
  if (isFocused && focusRefs) focusRefs.current = cardRef;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'flex',alignItems:'center'}}>
        <PersonCard person={person} isSpouse={false}
          isOldest={person.gen===oldest} hasSpouse={!!spouse}
          isFocused={isFocused} cardRef={cardRef}
          onSpouse={()   => onPending({personId,personName:person.name,type:'spouse'  })}
          onSibling={()  => onPending({personId,personName:person.name,type:'sibling' })}
          onChild={()    => onPending({personId,personName:person.name,type:'child'   })}
          onAncestor={() => onPending({personId,personName:person.name,type:'ancestor'})}
          onEditOpen={()=>onEditOpen&&onEditOpen(person)} />
        {spouse&&<>
          <div style={{width:22,height:2,background:C.gold,flexShrink:0,position:'relative'}}>
            <span style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',
              fontSize:13,color:C.gold,background:C.bg,padding:'0 2px'}}>∞</span>
          </div>
          <PersonCard person={spouse} isSpouse={true} isOldest={false} hasSpouse={false}
            isFocused={false} cardRef={null}
            onEditOpen={()=>onEditOpen&&onEditOpen(spouse)} />
        </>}
      </div>
      {children.length>0&&(
        <div style={{marginLeft:28,paddingLeft:14,
          borderLeft:'2px dashed rgba(196,153,58,0.35)',
          display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
          {children.map(child=>(
            <NodeGroup key={child.id} personId={child.id}
              nodeMap={nodeMap} spouseMap={spouseMap} childMap={childMap}
              pending={pending} onPending={onPending}
              addSpouse={addSpouse} addSibling={addSibling}
              addChild={addChild} addAncestor={addAncestor}
              oldest={oldest} focusId={focusId} focusRefs={focusRefs}
              allNodes={allNodes} onEditOpen={onEditOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main EditView ────────────────────────────────────────────── */
export default function EditView({
  nodes,
  addSpouse, addSibling, addChild, addAncestor,
  focusId,
  onRenamePerson,
  onDeletePerson,
  onMovePerson,
}) {
  const [pending,       setPending]       = useState(null);
  const [editingPerson, setEditingPerson] = useState(null);
  const focusRefs = useRef(null);

  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      focusRefs.current?.current?.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
    }, 150);
    return () => clearTimeout(t);
  }, [focusId]);

  const { nodeMap, spouseMap, childMap, roots, oldest } = useMemo(() => {
    const nodeMap={}, spouseMap={}, childMap={};
    const allChildIds = new Set();
    nodes.forEach(n => { nodeMap[n.id]=n; });
    nodes.forEach(n => {
      if (n.spouseOf) { spouseMap[n.spouseOf]=n; return; }
      (n.descendants||[]).forEach(cid => {
        const child = nodeMap[cid];
        if (child&&!child.spouseOf) {
          if (!childMap[n.id]) childMap[n.id]=[];
          childMap[n.id].push(child);
          allChildIds.add(cid);
        }
      });
    });
    const roots  = nodes.filter(n=>!n.spouseOf&&!allChildIds.has(n.id));
    const ns     = nodes.filter(n=>!n.spouseOf);
    const oldest = ns.length ? Math.max(...ns.map(n=>n.gen)) : 1;
    return { nodeMap, spouseMap, childMap, roots, oldest };
  }, [nodes]);

  if (roots.length===0) return null;

  const genGroups = {};
  roots.forEach(r => { if (!genGroups[r.gen]) genGroups[r.gen]=[]; genGroups[r.gen].push(r); });
  const sortedGens = Object.keys(genGroups).map(Number).sort((a,b)=>b-a);

  return (
    <div style={{padding:'20px 16px 100px',overflowX:'auto',
      background:C.bg,minHeight:'calc(100vh - 54px)'}}>

      <div style={{fontSize:13,color:C.muted,background:'#fdf5e0',
        border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 14px',
        marginBottom:20,lineHeight:1.6}}>
        ℹ️ <strong>Spouse / Sibling / Child</strong> tap karo — bottom sheet khulega naam dalne ke liye.
        <strong> ✏️</strong> se edit, delete, ya relation fix karo.
      </div>

      {sortedGens.map(g=>(
        <div key={g} style={{display:'flex',alignItems:'flex-start',marginBottom:32,gap:0}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',
            color:C.gold,writingMode:'vertical-lr',transform:'rotate(180deg)',
            minWidth:32,paddingTop:18,flexShrink:0}}>G{g}</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'flex-start',flex:1}}>
            {genGroups[g].map(person=>(
              <NodeGroup key={person.id} personId={person.id}
                nodeMap={nodeMap} spouseMap={spouseMap} childMap={childMap}
                pending={pending} onPending={setPending}
                addSpouse={addSpouse} addSibling={addSibling}
                addChild={addChild} addAncestor={addAncestor}
                oldest={oldest} focusId={focusId} focusRefs={focusRefs}
                allNodes={nodes}
                onEditOpen={p=>setEditingPerson(p)} />
            ))}
          </div>
        </div>
      ))}

      {/* Add member bottom sheet */}
      {pending&&(
        <AddBottomSheet
          pending={pending}
          onConfirm={v=>{
            if      (pending.type==='spouse')   addSpouse(pending.personId,v);
            else if (pending.type==='sibling')  addSibling(pending.personId,v);
            else if (pending.type==='ancestor') addAncestor(pending.personId,v);
            else                                addChild(pending.personId,v);
            setPending(null);
          }}
          onCancel={()=>setPending(null)}
        />
      )}

      {/* Edit/Delete/Move bottom sheet */}
      {editingPerson&&(
        <EditModal
          person={editingPerson}
          allNodes={nodes}
          onSave={(id,newName)     => onRenamePerson&&onRenamePerson(id,newName)}
          onDelete={id             => onDeletePerson&&onDeletePerson(id)}
          onMove={(id,newParentId) => onMovePerson&&onMovePerson(id,newParentId)}
          onClose={()=>setEditingPerson(null)}
        />
      )}
    </div>
  );
}