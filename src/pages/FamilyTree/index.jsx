// pages/FamilyTree/index.jsx
import { useState, useRef, useEffect } from 'react';
import { useFamilyTree }   from '../../hooks/useFamilyTree';
import { createTree, buildWhatsAppInvite, addInvitedContacts } from '../../db/treeDb'; // treeDb.js ke functions  
import { useContactPicker } from '../../hooks/useContactPicker';
import MobileInput          from '../../components/ui/MobileInput';
import EditView  from './EditView';
import TableView from './TableView';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a', green:'#2e7d32',
};

// ── Init Dialog (purana — names enter karo) ───────────────────────────────────
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
          color:C.maroon,textAlign:'center',marginBottom:8}}>
          🌳 Vansh Vriksha
        </h2>
        <p style={{fontSize:13,color:C.muted,textAlign:'center',marginBottom:26,lineHeight:1.7}}>
          Naam likho <strong>sabse chhote se sabse bade tak</strong>, space se alag karo.<br/>
          e.g. <em>Dhruv Sanjay Gunvantlal Laxmichand Hargovind</em>
        </p>
        <label style={{fontSize:11,fontWeight:600,letterSpacing:'1.5px',
          textTransform:'uppercase',color:C.gold,display:'block',marginBottom:6}}>
          Parivaar ke naam (chhota pehle)
        </label>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') go(); }}
          placeholder="Aap  Pita  Dada  Pardada…"
          style={{width:'100%',padding:'11px 14px',background:C.bg,
            border:`1.5px solid ${C.border}`,borderRadius:6,fontSize:15,
            color:'#2d1a0e',outline:'none'}}/>
        <div style={{fontSize:11,color:C.muted,marginTop:6,fontStyle:'italic'}}>
          Pehla = aap / sabse chhhote. Aakhri = sabse bade purvaaj.
        </div>
        <button onClick={go} style={{display:'block',width:'100%',marginTop:22,
          padding:13,background:C.maroon,border:'none',borderRadius:7,
          fontSize:14,fontWeight:600,color:'#fff',cursor:'pointer'}}>
          Shuru karo →
        </button>
      </div>
    </div>
  );
}

// ── Invite Dialog (table view ke baad) ───────────────────────────────────────
function InviteDialog({ treeId, pin, treeName, onClose }) {
  const { pick, picking, isSupported } = useContactPicker();
  const [contacts,    setContacts]    = useState([]);
  const [manualName,  setManualName]  = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCc,    setManualCc]    = useState('+91');
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [err,         setErr]         = useState('');

  const waUrl = buildWhatsAppInvite(treeId, pin, treeName);

  const handlePick = async () => {
    const picked = await pick();
    if (picked.length) {
      setContacts(prev => {
        const existing = new Set(prev.map(c => c.phone));
        return [...prev, ...picked.filter(p => !existing.has(p.phone))];
      });
    }
  };

  const addManual = () => {
    if (!manualPhone.trim()) { setErr('Phone number daalo'); return; }
    setContacts(prev => [...prev, {
      name: manualName.trim() || 'Guest',
      phone: manualPhone.trim(),
      countryCode: manualCc,
    }]);
    setManualName(''); setManualPhone(''); setErr('');
  };

  const handleSave = async () => {
    if (!contacts.length) { setErr('Koi contact add nahi kiya'); return; }
    setSaving(true);
    try {
      await addInvitedContacts(treeId, contacts);
      setSaved(true);
    } catch(e) {
      setErr('Save nahi hua. Dobara try karo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:300,
      background:'rgba(60,15,15,0.75)',backdropFilter:'blur(6px)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:C.cream,border:`2px solid ${C.gold}`,borderRadius:12,
        padding:'28px 24px',maxWidth:440,width:'100%',maxHeight:'90vh',
        overflowY:'auto',boxShadow:'0 24px 64px rgba(60,15,15,0.4)'}}>

        <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,
          color:C.maroon,marginBottom:6,textAlign:'center'}}>
          📲 Invite karo
        </h2>
        <p style={{fontSize:12,color:C.muted,textAlign:'center',marginBottom:16}}>
          {treeName}
        </p>

        {/* Tree ID + PIN */}
        <div style={{display:'flex',gap:10,marginBottom:16}}>
          <div style={{flex:1,background:'#fff',border:`1px solid ${C.border}`,
            borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
            <div style={{fontSize:9,color:C.muted,textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:3}}>Tree ID</div>
            <div style={{fontSize:22,fontWeight:800,color:C.maroon}}>{treeId}</div>
          </div>
          <div style={{flex:1,background:'#fff',border:`1px solid ${C.border}`,
            borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
            <div style={{fontSize:9,color:C.muted,textTransform:'uppercase',
              letterSpacing:'1px',marginBottom:3}}>PIN</div>
            <div style={{fontSize:22,fontWeight:800,color:C.gold,letterSpacing:4}}>{pin}</div>
          </div>
        </div>

        {/* WhatsApp button */}
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          style={{display:'block',width:'100%',padding:'11px 0',borderRadius:8,
            background:'#25D366',color:'#fff',fontWeight:700,fontSize:14,
            textDecoration:'none',textAlign:'center',marginBottom:16}}>
          📲 WhatsApp pe Share karo
        </a>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:700,color:C.gold,
            textTransform:'uppercase',letterSpacing:'1px',marginBottom:8}}>
            Contacts save karo (optional)
          </div>

          {/* Added contacts list */}
          {contacts.map((c,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,
              padding:'7px 10px',background:'#fff',borderRadius:7,
              border:`1px solid ${C.border}`,marginBottom:6}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:C.maroon,
                color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:12,fontWeight:700,flexShrink:0}}>
                {(c.name||'?')[0].toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:12}}>{c.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{c.phone}</div>
              </div>
              <button onClick={()=>setContacts(prev=>prev.filter((_,j)=>j!==i))}
                style={{background:'none',border:'none',cursor:'pointer',
                  color:'#c0392b',fontSize:16}}>×</button>
            </div>
          ))}

          {/* Contact picker */}
          {isSupported && (
            <button onClick={handlePick} disabled={picking}
              style={{width:'100%',padding:'8px 0',borderRadius:7,
                border:`1.5px dashed ${C.gold}`,background:'transparent',
                color:C.maroon,fontWeight:600,fontSize:12,
                cursor:'pointer',marginBottom:8}}>
              {picking ? 'Opening…' : '📱 Phone Contacts se add karo'}
            </button>
          )}

          {/* Manual */}
          <div style={{display:'flex',gap:6,marginBottom:6}}>
            <input value={manualName} onChange={e=>setManualName(e.target.value)}
              placeholder="Naam" style={{flex:1,padding:'7px 8px',borderRadius:6,
                border:`1px solid ${C.border}`,fontSize:12}}/>
            <MobileInput value={manualPhone} onChange={setManualPhone}
              countryCode={manualCc} onCountryCodeChange={setManualCc}
              placeholder="Mobile" style={{flex:2}}/>
            <button onClick={addManual}
              style={{padding:'7px 12px',borderRadius:6,border:'none',
                background:C.gold,color:'#fff',fontWeight:700,cursor:'pointer'}}>+</button>
          </div>
        </div>

        {err && <div style={{color:'#c0392b',fontSize:12,marginBottom:8}}>{err}</div>}
        {saved && <div style={{color:C.green,fontSize:12,marginBottom:8,fontWeight:600}}>
          ✓ Contacts save ho gaye!
        </div>}

        <div style={{display:'flex',gap:8,marginTop:8}}>
          <button onClick={onClose}
            style={{flex:1,padding:10,borderRadius:7,
              border:`1px solid ${C.border}`,background:'transparent',
              color:C.muted,cursor:'pointer',fontSize:13}}>
            Done
          </button>
          {contacts.length > 0 && !saved && (
            <button onClick={handleSave} disabled={saving}
              style={{flex:2,padding:10,borderRadius:7,border:'none',
                background:C.green,color:'#fff',fontWeight:700,
                cursor:'pointer',fontSize:13}}>
              {saving ? 'Save ho raha hai…' : '💾 Contacts Save karo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',
      background:C.green,color:'#fff',padding:'10px 24px',borderRadius:20,
      fontSize:13,fontWeight:500,boxShadow:'0 4px 16px rgba(0,0,0,0.18)',
      opacity:msg?1:0,transition:'opacity 0.3s',pointerEvents:'none',zIndex:999}}>
      {msg}
    </div>
  );
}

// ── Main FamilyTree ───────────────────────────────────────────────────────────
// Props:
//   treeId       — Firestore trees/{treeId}  (creator + guest dono ke liye)
//   email        — top bar mein dikhane ke liye
//   isCreator    — true: invite button dikhao, false: PIN flow
//   readOnly     — true: sirf view, koi edit nahi
//   onRequestEdit — readOnly mode mein "Edit karo" button ka callback
//   onBack       — back button (TreeWrapper ke liye)
//   pin          — creator ke paas hota hai (invite ke liye)

export default function FamilyTree({
  treeId, email, isCreator = false,
  readOnly = false, onRequestEdit, onBack, pin,
  onTreeInit,   // TreeWrapper se aata hai — Firestore mein createTree karta hai
}) {
  const { nodes, treeName, rowOrder, loading, saving, initDone,
    initTree, addSpouse, addSibling, addChild, addAncestor,
    saveRowOrder, resetRowOrder, reset, flushToFirestore,
  } = useFamilyTree(treeId, readOnly);

  // Latest nodes ref — onTreeInit ko pass karne ke liye
  const nodesRef = useRef([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const [view,        setView]        = useState('table');
  const [focusId,     setFocusId]     = useState(null);
  const [toast,       setToast]       = useState('');
  const [showInvite,  setShowInvite]  = useState(false);
  const [treeSaving,  setTreeSaving]  = useState(false);
  const toastRef = useRef(null);

  // Naya tree init hone ke baad — Firestore mein createTree call karo
  // (TreeWrapper se uid + onTreeCreated pass hota hai)
  const handleInitTree = async (rawInput) => {
    // 1. Local state set karo — nodes ban jaate hain
    initTree(rawInput);
    setView('edit');

    if (onTreeInit) {
      // 2. Nodes ready hone ka wait karo (next tick)
      setTimeout(async () => {
        // nodesRef.current mein latest nodes hain (useFamilyTree se)
        await onTreeInit(rawInput, nodesRef.current);
      }, 100);
    }
  };

  useEffect(() => { if (initDone) setView('table'); }, [initDone]);

  const showToast = msg => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2200);
  };

  const handleEditPerson = (personId) => {
    setFocusId(personId);
    setView('edit');
    setTimeout(() => setFocusId(null), 2500);
  };

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',
      justifyContent:'center',background:C.bg,
      fontFamily:"'DM Sans',sans-serif",color:C.muted}}>
      Loading…
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box;} button{font-family:inherit;}
      `}</style>

      {/* Init dialog — sirf jab tree nahi hai */}
      {!initDone && !readOnly && (
        <InitDialog onStart={handleInitTree} />
      )}

      {/* Invite dialog */}
      {showInvite && (
        <InviteDialog
          treeId={treeId} pin={pin} treeName={treeName}
          onClose={() => setShowInvite(false)} />
      )}

      {/* ── Top bar ── */}
      <div style={{background:C.maroon,color:'#fff',display:'flex',
        alignItems:'center',justifyContent:'space-between',
        padding:'0 20px',height:54,gap:12,
        position:'sticky',top:0,zIndex:10,
        boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>

        {/* Left: back + title */}
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,
          fontWeight:400,display:'flex',alignItems:'center',gap:8,minWidth:0}}>
          {onBack && (
            <button onClick={onBack}
              style={{background:'none',border:'none',color:'rgba(255,255,255,0.7)',
                fontSize:22,cursor:'pointer',padding:'0 2px',lineHeight:1,flexShrink:0}}>
              ‹
            </button>
          )}
          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            🌳 {treeName}
          </span>
        </div>

        {/* Right: buttons */}
        <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
          {email && (
            <span style={{fontSize:11,color:'rgba(255,255,255,0.6)',
              background:'rgba(255,255,255,0.1)',borderRadius:4,
              padding:'3px 8px',maxWidth:160,overflow:'hidden',
              textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {email}
            </span>
          )}

          {saving && (
            <span style={{fontSize:11,color:'rgba(255,255,255,0.55)',
              fontStyle:'italic'}}>saving…</span>
          )}

          {/* Creator: Invite button (table view mein) */}
          {isCreator && initDone && view==='table' && (
            <button onClick={() => setShowInvite(true)}
              style={{background:'#25D366',color:'#fff',border:'none',
                borderRadius:6,padding:'7px 12px',fontSize:12,
                fontWeight:700,cursor:'pointer'}}>
              📲 Invite
            </button>
          )}

          {/* Edit button (table → edit) */}
          {initDone && view==='table' && !readOnly && (
            <button onClick={()=>setView('edit')}
              style={{background:'rgba(255,255,255,0.15)',color:'#fff',
                border:'1px solid rgba(255,255,255,0.3)',borderRadius:6,
                padding:'7px 14px',fontSize:13,fontWeight:500,cursor:'pointer'}}>
              ✏️ Edit
            </button>
          )}

          {/* Guest: PIN se edit karo */}
          {initDone && readOnly && onRequestEdit && (
            <button onClick={onRequestEdit}
              style={{background:C.gold,color:'#fff',border:'none',
                borderRadius:6,padding:'7px 14px',fontSize:13,
                fontWeight:600,cursor:'pointer'}}>
              🔑 Edit karo
            </button>
          )}

          {/* View Table button (edit → table) — sirf view change */}
          {initDone && view==='edit' && (
            <button onClick={() => setView('table')}
              style={{background:'#fff',color:C.maroon,border:'none',
                borderRadius:6,padding:'7px 16px',fontSize:13,
                fontWeight:700,cursor:'pointer'}}>
              📋 Table View
            </button>
          )}

          {/* Reset — sirf creator ke liye */}
          {isCreator && initDone && (
            <button
              onClick={()=>{ if(window.confirm('Reset? Yeh undo nahi hoga.')) {
                reset(); setView('edit');
              }}}
              style={{background:'transparent',color:'rgba(255,255,255,0.4)',
                border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,
                padding:'7px 10px',fontSize:11,cursor:'pointer'}}>
              ↺
            </button>
          )}
        </div>
      </div>

      {/* Read-only banner */}
      {readOnly && initDone && (
        <div style={{background:'#fff3cd',borderBottom:'1px solid #ffc107',
          padding:'8px 16px',fontSize:12,color:'#856404',
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span>👁 View Only mode — Edit karne ke liye PIN chahiye</span>
          {onRequestEdit && (
            <button onClick={onRequestEdit}
              style={{background:C.gold,color:'#fff',border:'none',
                borderRadius:5,padding:'4px 12px',fontSize:11,
                fontWeight:700,cursor:'pointer'}}>
              🔑 PIN dalo
            </button>
          )}
        </div>
      )}

      {/* Views */}
      {initDone && view==='edit' && (
        <EditView nodes={nodes}
          addSpouse={addSpouse} addSibling={addSibling}
          addChild={addChild} addAncestor={addAncestor}
          focusId={focusId} readOnly={readOnly} />
      )}
      {initDone && view==='table' && (
  <TableView
  nodes={nodes}
  onEditPerson={handleEditPerson}
  savedRowOrder={rowOrder}
  onSaveRowOrder={saveRowOrder}
  onResetRowOrder={resetRowOrder}
  onFlushToFirestore={flushToFirestore}
/>
      )}

      <Toast msg={toast} />
    </div>
  );
}