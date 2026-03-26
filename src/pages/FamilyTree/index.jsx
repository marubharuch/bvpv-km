// pages/FamilyTree/index.jsx
import { useState, useRef, useEffect } from 'react';
import { useFamilyTree }   from '../../hooks/useFamilyTree';
import { createTree, buildWhatsAppInvite, addInvitedContacts, checkInvite } from '../../db/treeDb';
import { createInvite } from '../../db/inviteDb';
import { useContactPicker } from '../../hooks/useContactPicker';
import { toFullMobile }     from '../../lib/phone';
import MobileInput          from '../../components/ui/MobileInput';
import EditView  from './EditView';
import TableView from './TableView';
import TreeAnimView from './TreeAnimView';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a', green:'#2e7d32',
};

// Gujarati font style — apply wherever Gujarati text appears
const GJ = { fontFamily: "'Noto Sans Gujarati', sans-serif" };

// ── Button style helpers ───────────────────────────────────────────────────────
const ghostBtn = {
  background: 'rgba(255,255,255,0.13)', color: '#fff',
  border: '1px solid rgba(255,255,255,0.22)', borderRadius: 8,
  padding: '7px 12px', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', flexShrink: 0, display: 'flex',
  alignItems: 'center', gap: 5, lineHeight: 1,
  fontFamily: 'inherit', whiteSpace: 'nowrap',
};

const inviteBtn = {
  background: '#25D366', color: '#fff', border: 'none',
  borderRadius: 8, padding: '7px 12px', fontSize: 12,
  fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  fontFamily: 'inherit', whiteSpace: 'nowrap',
};

const saveBtn = {
  background: '#c4993a', color: '#fff', border: 'none',
  borderRadius: 8, padding: '7px 12px', fontSize: 12,
  fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  fontFamily: 'inherit', whiteSpace: 'nowrap',
};

const keyBtn = {
  background: '#c4993a', color: '#fff', border: 'none',
  borderRadius: 8, padding: '7px 12px', fontSize: 12,
  fontWeight: 600, cursor: 'pointer', flexShrink: 0,
  fontFamily: 'inherit', whiteSpace: 'nowrap',
};

const tableBtn = {
  background: '#fff', color: '#6b1f1f', border: 'none',
  borderRadius: 8, padding: '7px 12px', fontSize: 12,
  fontWeight: 700, cursor: 'pointer', flexShrink: 0,
  fontFamily: 'inherit', whiteSpace: 'nowrap',
};

function BtnGhost({ onClick, icon, label, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...ghostBtn,
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}>
      {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      {label}
    </button>
  );
}

// ── Init Dialog ───────────────────────────────────────────────────────────────
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
        <h2 style={{...GJ,fontSize:24,fontWeight:700,
          color:C.maroon,textAlign:'center',marginBottom:8}}>
          🌳 વંશ વૃક્ષ
        </h2>
        <p style={{...GJ,fontSize:13,color:C.muted,textAlign:'center',marginBottom:26,lineHeight:1.8}}>
          નામ લખો <strong>સૌથી નાનાથી સૌથી મોટા સુધી</strong>, space વડે અલગ કરો.<br/>
          દા.ત. <em>ધ્રુવ સંજય ગુણવંતલાલ લક્ષ્મીચંદ</em>
        </p>
        <label style={{...GJ,fontSize:11,fontWeight:600,letterSpacing:'1px',
          color:C.gold,display:'block',marginBottom:6}}>
          પરિવારના નામ (નાનો પહેલો)
        </label>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') go(); }}
          placeholder="આપ  પિતા  દાદા  પરદાદા…"
          style={{...GJ,width:'100%',padding:'11px 14px',background:C.bg,
            border:`1.5px solid ${C.border}`,borderRadius:6,fontSize:15,
            color:'#2d1a0e',outline:'none',boxSizing:'border-box'}}/>
        <button onClick={go} style={{...GJ,display:'block',width:'100%',marginTop:22,
          padding:13,background:C.maroon,border:'none',borderRadius:7,
          fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer'}}>
          શરૂ કરો →
        </button>
      </div>
    </div>
  );
}

// ── Invite Dialog ─────────────────────────────────────────────────────────────
function InviteDialog({ treeId, pin, treeName, inviterName, inviterUid, onClose }) {
  const { pick, picking, isSupported } = useContactPicker();

  const [name,    setName]    = useState('');
  const [num,     setNum]     = useState('');
  const [cc,      setCc]      = useState('+91');
  const [err,     setErr]     = useState('');
  const [busy,    setBusy]    = useState(false);
  const [sent,    setSent]    = useState(null);

  const handlePick = async () => {
    setErr('');
    const picked = await pick();
    if (!picked.length) return;
    const first = picked[0];
    setName(first.name || '');
    setNum(first.phone || '');
    if (first.countryCode) setCc(first.countryCode);
  };

  const handleSend = async () => {
    setErr('');
    const trimName = name.trim();
    const trimNum  = num.trim();
    if (!trimName) { setErr('નામ જરૂરી છે'); return; }
    if (!trimNum)  { setErr('ફોન નંબર જરૂરી છે'); return; }

    const fullPhone = toFullMobile(cc, trimNum);
    if (fullPhone.replace(/\D/g, '').length < 10) {
      setErr('માન્ય ફોન નંબર દાખલ કરો'); return;
    }

    setBusy(true);
    try {
      const { pin: invitePin } = await createInvite({
        familyId: treeId,
        name:     trimName,
        phone:    fullPhone,
        type:     'join',
        sentBy:   inviterUid || null,
        maxUses:  1,
      });

      const joinUrl  = `${window.location.origin}/tree/${treeId}?ipin=${invitePin}`;
      const waText   = `🌳 ${treeName || 'Family Tree'} માં જોડાઓ!\nLink: ${joinUrl}\nPIN: ${invitePin}\n\nLink ખોલો, PIN નાખો અને family tree જુઓ / edit કરો.`;
      const stripped = fullPhone.replace(/\D/g, '');
      window.open(`https://wa.me/${stripped}?text=${encodeURIComponent(waText)}`, '_blank');

      setSent({ name: trimName, phone: fullPhone });
      setName(''); setNum('');
    } catch (e) {
      setErr('Send નથી થયું. ફરી try કરો.');
    } finally {
      setBusy(false);
    }
  };

  const canSend = !!name.trim() && !!num.trim() && !busy;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(60,15,15,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: C.cream, border: `2px solid ${C.gold}`,
        borderRadius: '16px 16px 0 0',
        padding: '20px 20px 32px', width: '100%', maxWidth: 480,
        boxShadow: '0 -8px 32px rgba(60,15,15,0.3)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 16px' }} />

        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ ...GJ, fontSize: 18, color: C.maroon, fontWeight: 700 }}>
            📲 આમંત્રણ આપો
          </div>
          <div style={{ ...GJ, fontSize: 12, color: C.muted, marginTop: 3 }}>{treeName}</div>
        </div>

        {sent && (
          <div style={{
            background: '#e8f5e9', border: '1px solid #a5d6a7',
            borderRadius: 9, padding: '10px 14px', marginBottom: 14,
            fontSize: 12, color: '#2e7d32', ...GJ,
          }}>
            ✅ <strong>{sent.name}</strong> ને આમંત્રણ મોકલ્યું!
            <br /><span style={{ fontSize: 11, color: C.muted }}>આગળના વ્યક્તિનો નંબર નાખો ↓</span>
          </div>
        )}

        {isSupported && (
          <button onClick={handlePick} disabled={picking || busy} style={{
            ...GJ,
            width: '100%', padding: '10px 0', borderRadius: 9,
            border: `1.5px dashed ${C.gold}`, background: 'transparent',
            color: C.maroon, fontWeight: 700, fontSize: 13,
            cursor: picking ? 'wait' : 'pointer', marginBottom: 14,
          }}>
            {picking ? 'Contacts ખોલાઈ રહ્યા છે…' : '📱 Phone માંથી Contact પસંદ કરો'}
          </button>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{
            ...GJ, fontSize: 11, fontWeight: 700, color: C.gold,
            textTransform: 'uppercase', letterSpacing: '1px',
            display: 'block', marginBottom: 5,
          }}>નામ</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="દા.ત. રમેશ શર્મા"
            style={{
              ...GJ, width: '100%', padding: '10px 12px', borderRadius: 7,
              border: `1.5px solid ${C.border}`, fontSize: 13,
              background: C.bg, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{
            ...GJ, fontSize: 11, fontWeight: 700, color: C.gold,
            textTransform: 'uppercase', letterSpacing: '1px',
            display: 'block', marginBottom: 5,
          }}>મોબાઇલ નંબર</label>
          <MobileInput
            countryCode={cc}
            onCountryCodeChange={setCc}
            value={num}
            onChange={setNum}
            placeholder="Mobile number"
          />
        </div>

        {err && (
          <div style={{
            ...GJ, color: '#c0392b', fontSize: 12, marginBottom: 12,
            padding: '8px 12px', background: '#ffeaea', borderRadius: 7,
          }}>{err}</div>
        )}

        <button onClick={handleSend} disabled={!canSend} style={{
          ...GJ,
          width: '100%', padding: 13, borderRadius: 9, border: 'none',
          background: canSend ? C.maroon : '#ccc',
          color: '#fff', fontWeight: 700, fontSize: 14,
          cursor: canSend ? 'pointer' : 'not-allowed', marginBottom: 10,
        }}>
          {busy ? '⏳ મોકલી રહ્યા છે…' : '📲 WhatsApp પર Invite મોકલો'}
        </button>

        <button onClick={onClose} style={{
          ...GJ,
          width: '100%', padding: 10, borderRadius: 9,
          border: `1px solid ${C.border}`, background: 'transparent',
          color: C.muted, fontSize: 13, cursor: 'pointer',
        }}>
          બંધ કરો
        </button>
      </div>
    </div>
  );
}

// ── Share Dialog ──────────────────────────────────────────────────────────────
function ShareDialog({ onShareTable, onShareTree, onClose, sharing }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:500,
      background:'rgba(60,15,15,0.6)',backdropFilter:'blur(4px)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',
    }} onClick={onClose}>
      <div style={{
        background:'#fefcf5',borderRadius:'16px 16px 0 0',
        padding:'0 0 32px',width:'100%',maxWidth:480,
        boxShadow:'0 -8px 32px rgba(60,15,15,0.25)',
      }} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 6px'}}>
          <div style={{width:40,height:4,borderRadius:2,background:'#d6c99a'}}/>
        </div>
        <div style={{padding:'4px 20px 20px',borderBottom:'1px solid #d6c99a',textAlign:'center'}}>
          <div style={{...GJ,fontSize:18,color:'#6b1f1f',fontWeight:700}}>
            📸 શું share કરવું છે?
          </div>
        </div>
        <div style={{padding:'20px 20px 0',display:'flex',flexDirection:'column',gap:12}}>
          <button onClick={onShareTable} disabled={sharing}
            style={{width:'100%',padding:'14px',borderRadius:10,border:'1.5px solid #d6c99a',
              background:'#f9f5e7',cursor:'pointer',textAlign:'left',
              display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:28}}>📋</span>
            <div>
              <div style={{...GJ,fontWeight:700,color:'#6b1f1f',fontSize:14}}>Table View</div>
              <div style={{...GJ,fontSize:12,color:'#9c7c5a',marginTop:2}}>બધા સભ્યોની table share કરો</div>
            </div>
          </button>
          <button onClick={onShareTree} disabled={sharing}
            style={{width:'100%',padding:'14px',borderRadius:10,border:'1.5px solid #d6c99a',
              background:'#f9f5e7',cursor:'pointer',textAlign:'left',
              display:'flex',alignItems:'center',gap:14}}>
            <span style={{fontSize:28}}>🌳</span>
            <div>
              <div style={{...GJ,fontWeight:700,color:'#6b1f1f',fontSize:14}}>Tree View</div>
              <div style={{...GJ,fontSize:12,color:'#9c7c5a',marginTop:2}}>Animated tree નો screenshot share કરો</div>
            </div>
          </button>
          <button onClick={onClose}
            style={{...GJ,width:'100%',padding:11,borderRadius:10,
              border:'1px solid #d6c99a',background:'transparent',
              color:'#9c7c5a',fontSize:13,cursor:'pointer',marginTop:4}}>
            રહેવા દો
          </button>
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
      opacity:msg?1:0,transition:'opacity 0.3s',pointerEvents:'none',zIndex:999,...GJ}}>
      {msg}
    </div>
  );
}

// ── Main FamilyTree ───────────────────────────────────────────────────────────
export default function FamilyTree({
  treeId, email, isCreator = false,
  readOnly = false, onRequestEdit, onBack, pin,
  onTreeInit,
  editorName = '', editorPhone = '', editorUid = '',
}) {
  const { nodes, treeName, rowOrder, activityLog, loading, saving, initDone,
    canUndo, canRedo, undo, redo,
    initTree, addSpouse, addSibling, addChild, addAncestor,
    renamePerson, deletePerson, movePerson,
    saveRowOrder, resetRowOrder, reset, flushToFirestore, setEditor,
  } = useFamilyTree(treeId, readOnly);

  const handleRenamePerson = (id, newName) => renamePerson(id, newName);
  const handleDeletePerson = (id) => deletePerson(id);
  const handleMovePerson   = (id, newParentId) => movePerson(id, newParentId);

  const nodesRef = useRef([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  useEffect(() => {
    if (editorName || editorPhone) {
      setEditor(editorPhone || 'unknown', editorName || editorPhone || 'Someone');
    }
  }, [editorName, editorPhone, setEditor]);

  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl || readOnly) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, readOnly]);

  const [view,         setView]         = useState('table');
  const [focusId,      setFocusId]      = useState(null);
  const [toast,        setToast]        = useState('');
  const [showInvite,   setShowInvite]   = useState(false);
  const [showLog,      setShowLog]      = useState(false);
  const toastRef                        = useRef(null);
  const [sharing,      setSharing]      = useState(false);
  const [showTree,     setShowTree]     = useState(false);
  const [showShareDlg, setShowShareDlg] = useState(false);
  const tableViewRef                    = useRef(null);
  const treeSnapRef                     = useRef(null);

  useEffect(() => {
    if (!initDone || !treeId) return;
    const flagKey = `vt_tree_seen_${treeId}`;
    const seen = localStorage.getItem(flagKey);
    if (!seen) { setShowTree(true); setView('table'); }
    else { setView('table'); }
  }, [initDone, treeId]);

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

  const handleShare = () => setShowShareDlg(true);

  const doShare = async (targetRef) => {
    if (sharing || !targetRef?.current) return;
    setSharing(true);
    setShowShareDlg(false);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: "#f9f5e7", scale: 2, useCORS: true, logging: false,
      });
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `${treeName || "FamilyTree"}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: treeName || "Family Tree" });
        } else {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${treeName || "FamilyTree"}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
          showToast("✅ Image download થઈ ગઈ!");
        }
      }, "image/png");
    } catch (e) {
      console.error("Share error:", e);
      showToast("Share નથી થઈ, ફરી try કરો.");
    } finally {
      setSharing(false);
    }
  };

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',
      justifyContent:'center',background:C.bg,...GJ,color:C.muted}}>
      લોડ થઈ રહ્યું છે…
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;} button{font-family:inherit;}
      `}</style>

      {/* Init dialog */}
      {!initDone && !readOnly && (
        <InitDialog onStart={async (raw) => {
          initTree(raw);
          setView('edit');
          if (onTreeInit) {
            setTimeout(async () => { await onTreeInit(raw, nodesRef.current); }, 100);
          }
        }} />
      )}

      {/* Log panel */}
      {showLog && <LogPanel activityLog={activityLog} onClose={() => setShowLog(false)} />}

      {/* Share dialog */}
      {showShareDlg && (
        <ShareDialog
          sharing={sharing}
          onClose={() => setShowShareDlg(false)}
          onShareTable={() => doShare(tableViewRef)}
          onShareTree={() => doShare(treeSnapRef)}
        />
      )}

      {/* Invite dialog */}
      {showInvite && (
        <InviteDialog
          treeId={treeId} pin={pin} treeName={treeName}
          inviterName={editorName} inviterUid={editorUid}
          onClose={() => setShowInvite(false)} />
      )}

      {/* ── Top bar ── */}
      <div style={{
        background: C.maroon, color: '#fff',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(60,15,15,0.3)',
      }}>
        {/* Row 1: Back + Title + Email */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 6px' }}>
          {onBack && (
            <button onClick={onBack} style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.65)', fontSize: 24,
              cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0,
            }}>‹</button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...GJ, fontSize: 17, fontWeight: 700, color: '#fff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
            }}>
              🌳 {treeName}
            </div>
            {email && (
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.55)',
                marginTop: 2, display: 'block',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {email}
              </span>
            )}
          </div>
          {saving && (
            <span style={{ ...GJ, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', flexShrink: 0 }}>
              સેવ થઈ રહ્યું છે…
            </span>
          )}
        </div>

        {/* Row 2: Scrollable action buttons (English labels) */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 12px 10px', overflowX: 'auto',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
        }}>
          <style>{`::-webkit-scrollbar { display: none; }`}</style>

          {/* Undo / Redo */}
          {initDone && view === 'edit' && !readOnly && (
            <div style={{ display: 'flex', flexShrink: 0 }}>
              <button onClick={undo} disabled={!canUndo}
                style={{ background: 'rgba(255,255,255,0.13)', color: canUndo ? '#fff' : 'rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255,255,255,0.22)', borderRadius: '8px 0 0 8px',
                  padding: '7px 11px', fontSize: 14, cursor: canUndo ? 'pointer' : 'not-allowed', lineHeight: 1 }}>↩</button>
              <button onClick={redo} disabled={!canRedo}
                style={{ background: 'rgba(255,255,255,0.13)', color: canRedo ? '#fff' : 'rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255,255,255,0.22)', borderLeft: 'none', borderRadius: '0 8px 8px 0',
                  padding: '7px 11px', fontSize: 14, cursor: canRedo ? 'pointer' : 'not-allowed', lineHeight: 1 }}>↪</button>
            </div>
          )}

          {initDone && <BtnGhost onClick={() => setShowLog(true)} icon="📋" label="Log" />}
          {initDone && view === 'table' && (
            <button onClick={() => setShowInvite(true)} style={inviteBtn}>📲 Invite</button>
          )}
          {initDone && view === 'table' && !readOnly && (
            <button onClick={() => { flushToFirestore?.(); showToast('✅ સેવ થઈ ગયું!'); }} style={saveBtn}>💾 Save</button>
          )}
          {initDone && view === 'table' && <BtnGhost onClick={() => setShowTree(true)} icon="🌳" label="Tree" />}
          {initDone && view === 'table' && (
            <BtnGhost onClick={handleShare} disabled={sharing} icon={sharing ? '⏳' : '📸'} label="Share" />
          )}
          {initDone && view === 'table' && !readOnly && (
            <BtnGhost onClick={() => setView('edit')} icon="✏️" label="Edit" />
          )}
          {initDone && readOnly && onRequestEdit && (
            <button onClick={onRequestEdit} style={keyBtn}>🔑 Edit</button>
          )}
          {initDone && view === 'edit' && (
            <button onClick={() => setView('table')} style={tableBtn}>📋 Table</button>
          )}
          {isCreator && initDone && (
            <button
              onClick={() => { if (window.confirm('Reset? આ undo નહીં થઈ શકે.')) { reset(); setView('edit'); } }}
              style={{ background: 'transparent', color: 'rgba(255,255,255,0.35)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                padding: '7px 10px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>↺</button>
          )}
        </div>
      </div>

      {/* Read-only banner */}
      {readOnly && initDone && (
        <div style={{background:'#fff3cd',borderBottom:'1px solid #ffc107',
          padding:'8px 16px',fontSize:12,color:'#856404',
          display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={GJ}>👁 માત્ર જોવાનો mode</span>
          {onRequestEdit && (
            <button onClick={onRequestEdit}
              style={{...GJ,background:C.gold,color:'#fff',border:'none',
                borderRadius:5,padding:'4px 12px',fontSize:11,
                fontWeight:700,cursor:'pointer'}}>
              🔑 PIN નાખો
            </button>
          )}
        </div>
      )}

      {/* Views */}
      {initDone && view==='edit' && (
        <EditView nodes={nodes}
          addSpouse={addSpouse} addSibling={addSibling}
          addChild={addChild} addAncestor={addAncestor}
          focusId={focusId} readOnly={readOnly}
          onRenamePerson={handleRenamePerson}
          onDeletePerson={handleDeletePerson}
          onMovePerson={handleMovePerson}
        />
      )}
      {initDone && view==='table' && (
        <div ref={tableViewRef}>
          <TableView
            nodes={nodes}
            onEditPerson={handleEditPerson}
            savedRowOrder={rowOrder}
            onSaveRowOrder={saveRowOrder}
            onResetRowOrder={resetRowOrder}
            onFlushToFirestore={flushToFirestore}
          />
        </div>
      )}

      <Toast msg={toast} />

      <div ref={treeSnapRef} style={{position:'absolute',pointerEvents:'none',opacity:0,zIndex:-1}} />

      {showTree && (
        <TreeAnimView
          nodes={nodes}
          treeName={treeName}
          autoPlay={true}
          onClose={() => {
            if (treeId) { try { localStorage.setItem(`vt_tree_seen_${treeId}`, '1'); } catch(e){} }
            setShowTree(false);
          }}
          onDone={() => {
            if (treeId) { try { localStorage.setItem(`vt_tree_seen_${treeId}`, '1'); } catch(e){} }
            setShowTree(false);
            setView('table');
          }}
        />
      )}
    </div>
  );
}

// ── Log Panel ─────────────────────────────────────────────────────────────────
export function LogPanel({ activityLog = [], onClose }) {
  const actionLabel = {
    initTree:    '🌱 Tree શરૂ',
    addSpouse:   '💍 જીવનસાથી ઉમેર્યા',
    addChild:    '👶 બાળક ઉમેર્યું',
    addSibling:  '👫 ભાઈ/બહેન ઉમેર્યા',
    addAncestor: '👴 પૂર્વજ ઉમેર્યા',
    reset:       '🔄 Reset',
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(60,15,15,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: C.cream, borderRadius: '16px 16px 0 0',
        padding: '0 0 32px', width: '100%', maxWidth: 520,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 32px rgba(60,15,15,0.25)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ ...GJ, fontSize: 17, color: C.maroon, fontWeight: 700 }}>
              📋 Activity Log
            </div>
            <div style={{ ...GJ, fontSize: 11, color: C.muted, marginTop: 2 }}>
              {activityLog.length} નોંધ — નવી પહેલાં
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, color: C.muted, cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          {activityLog.length === 0 ? (
            <div style={{ ...GJ, textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 13 }}>
              હજી સુધી કોઈ activity નથી
            </div>
          ) : (
            activityLog.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '10px 0',
                borderBottom: i < activityLog.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: C.maroon, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  {(entry.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      ...GJ, fontSize: 10, fontWeight: 700, padding: '2px 7px',
                      borderRadius: 20, background: `${C.gold}22`, color: C.gold, whiteSpace: 'nowrap',
                    }}>
                      {actionLabel[entry.action] || entry.action}
                    </span>
                    <span style={{ ...GJ, fontSize: 12, fontWeight: 700, color: C.maroon }}>
                      {entry.name}
                    </span>
                  </div>
                  <div style={{ ...GJ, fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.6 }}>
                    {entry.detail || `${entry.target} ઉમેર્યું`}
                  </div>
                  <div style={{ fontSize: 10, color: '#bbb', marginTop: 3 }}>
                    {formatTime(entry.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}