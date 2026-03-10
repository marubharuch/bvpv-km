// pages/FamilyTree/index.jsx
import { useState, useRef, useEffect } from 'react';
import { useFamilyTree } from '../../hooks/useFamilyTree';
import EditView from './EditView';
import TableView from './TableView';

const C = {
  maroon:'#6b1f1f', maroon2:'#8a2c2c', gold:'#c4993a',
  border:'#d6c99a', cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a',
};

function InitDialog({ onStart }) {
  const [val, setVal] = useState('');
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 100); }, []);
  const go = () => { if (val.trim()) onStart(val); };
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,
      background:'rgba(60,15,15,0.75)',backdropFilter:'blur(6px)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:C.cream,border:`2px solid ${C.gold}`,borderRadius:10,
        padding:'44px 48px',maxWidth:520,width:'100%',
        boxShadow:'0 24px 64px rgba(60,15,15,0.45)'}}>
        <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:24,fontWeight:400,
          color:C.maroon,textAlign:'center',marginBottom:8,display:'flex',
          alignItems:'center',justifyContent:'center',gap:10}}>
          🌳 Family Tree
        </h2>
        <p style={{fontSize:13,color:C.muted,textAlign:'center',marginBottom:26,lineHeight:1.7}}>
          Enter names from <strong>youngest → oldest</strong>, separated by spaces.<br/>
          e.g. <em>Dhruv Sanjay Gunvantlal Laxmichand Hargovind</em>
        </p>
        <label style={{fontSize:11,fontWeight:600,letterSpacing:'1.5px',textTransform:'uppercase',
          color:C.gold,display:'block',marginBottom:6}}>
          Family Members (youngest first)
        </label>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') go(); }}
          placeholder="Child Father Grandfather Great-Grandfather…"
          style={{width:'100%',padding:'11px 14px',background:C.bg,
            border:`1.5px solid ${C.border}`,borderRadius:6,
            fontFamily:"'DM Sans',sans-serif",fontSize:15,color:'#2d1a0e',
            outline:'none'}}
        />
        <div style={{fontSize:11,color:C.muted,marginTop:6,fontStyle:'italic'}}>
          First = you / youngest. Last = oldest known ancestor.
        </div>
        <button onClick={go} style={{display:'block',width:'100%',marginTop:22,padding:13,
          background:C.maroon,border:'none',borderRadius:7,fontFamily:"'DM Sans',sans-serif",
          fontSize:14,fontWeight:600,color:'#fff',cursor:'pointer'}}>
          Start Building →
        </button>
      </div>
    </div>
  );
}

function Toast({ msg }) {
  return (
    <div style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',
      background:'#2e7d32',color:'#fff',padding:'10px 24px',borderRadius:20,
      fontSize:13,fontWeight:500,boxShadow:'0 4px 16px rgba(0,0,0,0.18)',
      opacity:msg?1:0,transition:'opacity 0.3s',pointerEvents:'none',zIndex:999}}>
      {msg}
    </div>
  );
}

export default function FamilyTree({ uid }) {
  const { nodes, treeName, rowOrder, loading, saving, initDone,
    initTree, addSpouse, addSibling, addChild, addAncestor,
    saveRowOrder, resetRowOrder, reset,
  } = useFamilyTree(uid);

  const [view,    setView]    = useState('edit');
  const [focusId, setFocusId] = useState(null);
  const [toast,   setToast]   = useState('');
  const toastRef = useRef(null);

  useEffect(() => { if (initDone) setView('edit'); }, [initDone]);

  const showToast = msg => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2200);
  };

  // Called when user clicks a name in the table → switch to edit, focus that card
  const handleEditPerson = (personId) => {
    setFocusId(personId);
    setView('edit');
    // Clear highlight after 2.5s
    setTimeout(() => setFocusId(null), 2500);
  };

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.muted,fontSize:14}}>
      Loading…
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;}
        button{font-family:inherit;}
      `}</style>

      {!initDone && <InitDialog onStart={v => { initTree(v); setView('edit'); }} />}

      {/* Top bar */}
      <div style={{background:C.maroon,color:'#fff',display:'flex',alignItems:'center',
        justifyContent:'space-between',padding:'0 20px',height:54,gap:12,
        position:'sticky',top:0,zIndex:10,boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,fontWeight:400,
          display:'flex',alignItems:'center',gap:10}}>
          🌳 <span>{treeName}</span>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {saving && (
            <span style={{fontSize:11,color:'rgba(255,255,255,0.55)',fontStyle:'italic'}}>saving…</span>
          )}
          {initDone && view==='table' && (
            <button onClick={()=>setView('edit')} style={{
              background:'rgba(255,255,255,0.15)',color:'#fff',
              border:'1px solid rgba(255,255,255,0.3)',borderRadius:6,
              padding:'7px 16px',fontSize:13,fontWeight:500,cursor:'pointer'}}>
              ✏️ Edit
            </button>
          )}
          {initDone && view==='edit' && (
            <button onClick={()=>{ setView('table'); showToast('✓ View updated'); }} style={{
              background:'#fff',color:C.maroon,border:'none',borderRadius:6,
              padding:'7px 18px',fontSize:13,fontWeight:700,cursor:'pointer',
              display:'flex',alignItems:'center',gap:6}}>
              📋 Submit &amp; View Table
            </button>
          )}
          {initDone && (
            <button
              onClick={()=>{ if(window.confirm('Reset tree? This cannot be undone.')) { reset(); setView('edit'); }}}
              style={{background:'transparent',color:'rgba(255,255,255,0.45)',
                border:'1px solid rgba(255,255,255,0.2)',borderRadius:6,
                padding:'7px 12px',fontSize:12,cursor:'pointer'}}>
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {initDone && view==='edit' && (
        <EditView nodes={nodes}
          addSpouse={addSpouse} addSibling={addSibling}
          addChild={addChild} addAncestor={addAncestor}
          focusId={focusId} />
      )}
      {initDone && view==='table' && (
        <TableView nodes={nodes} onEditPerson={handleEditPerson}
          savedRowOrder={rowOrder}
          onSaveRowOrder={saveRowOrder}
          onResetRowOrder={resetRowOrder} />
      )}

      <Toast msg={toast} />
    </div>
  );
}