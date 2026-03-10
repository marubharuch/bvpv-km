// pages/VanshTreeView/components/ReviewSaveSheet.jsx
// Shows all pending local changes (edits + adds) as a diff popup,
// then lets the user confirm and push to Firestore in one tap.

import { useState } from "react";

const mono  = "'JetBrains Mono', monospace";
const serif = "'Playfair Display', serif";
const C = {
  primary:"#7B1C2E", primaryDark:"#5A1020", primaryLight:"#9B2335",
  gold:"#C9A84C", goldLight:"#F0D080", goldFaint:"#FDF6EC", goldFaint2:"#FDF0D0",
  border:"#f0e6e6", text:"#3D0010", textSecondary:"#9B6060", dim:"#C0A0A0",
  white:"#FFFFFF", green:"#2E7D32", greenFaint:"#F0FFF4", greenBorder:"#A5D6A7",
  red:"#C0302A", redFaint:"#FFF0F0", redBorder:"#f0b0b0",
};

function DiffRow({ label, before, after }) {
  const changed = before !== after && !(before == null && after == null);
  if (!changed && !after) return null;
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"4px 0",
      borderBottom:`1px dashed ${C.border}` }}>
      <span style={{ fontSize:"0.52rem", color:C.dim, fontFamily:mono, minWidth:56,
        paddingTop:2, textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</span>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
        {before && before !== after && (
          <span style={{ fontSize:"0.7rem", fontFamily:serif, color:C.red,
            textDecoration:"line-through", opacity:0.7 }}>{String(before)}</span>
        )}
        <span style={{ fontSize:"0.74rem", fontFamily:serif,
          color:changed ? C.green : C.text, fontWeight:changed ? 600 : 400 }}>
          {after != null ? String(after) : <span style={{ color:C.dim }}>—</span>}
        </span>
      </div>
      {changed && (
        <span style={{ fontSize:"0.58rem", padding:"1px 6px", borderRadius:4,
          background:C.greenFaint, color:C.green, border:`1px solid ${C.greenBorder}`,
          fontFamily:mono, flexShrink:0 }}>changed</span>
      )}
    </div>
  );
}

function ChangeCard({ change, index }) {
  const [open, setOpen] = useState(false);
  const isAdd = change.type === "add";
  const accentColor  = isAdd ? C.green : C.gold;
  const accentBg     = isAdd ? C.greenFaint : C.goldFaint2;
  const accentBorder = isAdd ? C.greenBorder : `${C.gold}60`;
  const timeAgo = change.timestamp
    ? (() => { const s=Math.floor((Date.now()-change.timestamp)/1000); return s<60?`${s}s ago`:s<3600?`${Math.floor(s/60)}m ago`:`${Math.floor(s/3600)}h ago`; })()
    : null;

  return (
    <div style={{ background:C.white, border:`1.5px solid ${open?accentColor:C.border}`,
      borderLeft:`3px solid ${accentColor}`, borderRadius:10, overflow:"hidden",
      transition:"border-color 0.15s", marginBottom:8 }}>
      <div onClick={() => setOpen(o=>!o)} style={{ display:"flex", alignItems:"center",
        gap:10, padding:"10px 12px", cursor:"pointer",
        background:open?accentBg:C.white, transition:"background 0.15s", userSelect:"none" }}>
        <span style={{ width:22, height:22, borderRadius:"50%", background:accentColor,
          color:"#fff", fontSize:"0.55rem", fontFamily:mono, fontWeight:700,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {index+1}
        </span>
        <span style={{ fontSize:"1.05rem", flexShrink:0 }}>{change.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:"0.78rem", fontFamily:serif, fontWeight:600,
            color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {change.label}
          </div>
          <div style={{ display:"flex", gap:6, marginTop:2, alignItems:"center" }}>
            <span style={{ fontSize:"0.52rem", fontFamily:mono, padding:"1px 6px",
              borderRadius:4, background:isAdd?C.greenFaint:`${C.gold}20`,
              color:isAdd?C.green:C.primaryLight, border:`1px solid ${accentBorder}`,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>
              {isAdd ? "➕ New" : "✏️ Edit"}
            </span>
            {timeAgo && <span style={{ fontSize:"0.52rem", color:C.dim, fontFamily:mono }}>{timeAgo}</span>}
          </div>
        </div>
        <span style={{ fontSize:"0.6rem", color:C.dim,
          transform:open?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}>▼</span>
      </div>

      {open && (
        <div style={{ padding:"10px 14px 12px", borderTop:`1px solid ${C.border}`, background:"#FDFAF5" }}>
          {change.before && Object.keys(change.after||{}).map(field => (
            <DiffRow key={field} label={field}
              before={change.before?.[field]} after={change.after?.[field]} />
          ))}
          {isAdd && change.after && (
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {Object.entries(change.after).filter(([,v])=>v!=null&&v!=="").map(([k,v]) => (
                <div key={k} style={{ display:"flex", gap:8, padding:"3px 0",
                  borderBottom:`1px dashed ${C.border}` }}>
                  <span style={{ fontSize:"0.52rem", color:C.dim, fontFamily:mono,
                    minWidth:56, paddingTop:2, textTransform:"uppercase", letterSpacing:"0.07em" }}>{k}</span>
                  <span style={{ fontSize:"0.74rem", fontFamily:serif, color:C.green, fontWeight:600 }}>
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewSaveSheet({
  pendingChanges = [],
  meta,
  status,
  isOnline,
  syncError,
  onSyncNow,
  onClose,
  onDiscardAll,
}) {
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  const isSyncing  = status === "syncing" || saving;
  const editCount  = pendingChanges.filter(c=>c.type==="edit").length;
  const addCount   = pendingChanges.filter(c=>c.type==="add").length;

  const handleSave = async () => {
    if (!isOnline) return;
    setSaving(true); setSaveErr(null);
    try {
      await onSyncNow();
      setSaved(true);
      setTimeout(onClose, 1400);
    } catch(e) {
      setSaveErr(e?.message || "Save failed. Please retry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0,
        background:"rgba(61,0,16,0.35)", zIndex:300,
        backdropFilter:"blur(2px)", animation:"rvFadeIn 0.22s ease" }} />

      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.white,
        borderRadius:"20px 20px 0 0", borderTop:`2px solid ${C.gold}`, zIndex:301,
        maxHeight:"88vh", display:"flex", flexDirection:"column",
        animation:"rvSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow:"0 -12px 48px rgba(90,16,32,0.18)" }}>

        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 0" }}>
          <div style={{ width:40, height:4, borderRadius:2, background:C.border }} />
        </div>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"10px 18px 0", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:serif, fontSize:"1.1rem", color:C.primaryDark, fontWeight:700 }}>
              📋 Review Changes
            </div>
            <div style={{ fontSize:"0.58rem", color:C.dim, fontFamily:mono, marginTop:2 }}>
              {pendingChanges.length === 0 ? "No pending changes"
                : `${pendingChanges.length} change${pendingChanges.length!==1?"s":""} ready`}
              {editCount>0 && ` · ${editCount} edit${editCount!==1?"s":""}`}
              {addCount >0 && ` · ${addCount} new member${addCount!==1?"s":""}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            fontSize:"1.1rem", color:C.dim, cursor:"pointer", padding:4 }}>✕</button>
        </div>

        <div style={{ height:1, background:C.border, margin:"12px 18px 0", flexShrink:0 }} />

        {/* Scrollable list */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 18px",
          WebkitOverflowScrolling:"touch" }}>
          {pendingChanges.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <div style={{ fontSize:"2.5rem", marginBottom:10 }}>✅</div>
              <p style={{ fontSize:"0.8rem", color:C.dim, fontFamily:mono }}>Tree is already up to date.</p>
            </div>
          ) : (
            pendingChanges.map((c,i) => <ChangeCard key={c.id} change={c} index={i} />)
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 18px 36px", borderTop:`1px solid ${C.border}`,
          background:C.white, flexShrink:0, display:"flex", flexDirection:"column", gap:10 }}>

          {!isOnline && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
              borderRadius:8, background:"#FFF8F0", border:`1px solid ${C.border}` }}>
              <span>📵</span>
              <span style={{ fontSize:"0.65rem", color:C.dim, fontFamily:mono }}>
                Offline — changes saved locally, will sync when online.
              </span>
            </div>
          )}

          {(saveErr||syncError) && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
              borderRadius:8, background:C.redFaint, border:`1px solid ${C.redBorder}` }}>
              <span>⚠️</span>
              <span style={{ fontSize:"0.65rem", color:C.red, fontFamily:mono }}>
                {saveErr||syncError}
              </span>
            </div>
          )}

          {saved && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px",
              borderRadius:8, background:C.greenFaint, border:`1px solid ${C.greenBorder}`,
              animation:"rvFadeIn 0.3s ease" }}>
              <span>🎉</span>
              <span style={{ fontSize:"0.72rem", color:C.green, fontFamily:mono, fontWeight:700 }}>
                Saved to Firestore!
              </span>
            </div>
          )}

          {!saved && (
            <button onClick={handleSave}
              disabled={isSyncing || !isOnline || pendingChanges.length === 0}
              style={{ width:"100%", padding:14, borderRadius:12, border:"none",
                background: (isSyncing || !isOnline || pendingChanges.length===0)
                  ? C.border : `linear-gradient(135deg,${C.primary},${C.primaryDark})`,
                color: (isSyncing || !isOnline || pendingChanges.length===0) ? C.dim : C.white,
                fontSize:"0.9rem", fontWeight:700,
                cursor: (isSyncing || !isOnline || pendingChanges.length===0) ? "default" : "pointer",
                fontFamily:mono, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                transition:"all 0.2s",
                boxShadow: (isSyncing || !isOnline || pendingChanges.length===0)
                  ? "none" : `0 4px 16px ${C.primary}30` }}>
              {isSyncing ? (
                <><span style={{ width:16, height:16, borderRadius:"50%",
                  border:"2px solid rgba(255,255,255,0.3)", borderTopColor:C.white,
                  animation:"rvSpin 0.7s linear infinite", display:"inline-block" }}/>
                Saving…</>
              ) : pendingChanges.length===0 ? "Nothing to save"
                : <>☁️ Save {pendingChanges.length} Change{pendingChanges.length!==1?"s":""} to Firestore</>}
            </button>
          )}

          {onDiscardAll && !saved && pendingChanges.length > 0 && (
            <button onClick={()=>{onDiscardAll();onClose();}}
              style={{ width:"100%", padding:10, borderRadius:10,
                border:`1.5px solid ${C.border}`, background:C.white,
                color:C.red, fontSize:"0.75rem", fontFamily:mono, cursor:"pointer" }}>
              🗑️ Discard all local changes
            </button>
          )}

          {meta?.lastSyncedAt && (
            <div style={{ textAlign:"center", fontSize:"0.55rem", color:C.dim, fontFamily:mono }}>
              Last synced: {new Date(meta.lastSyncedAt).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes rvFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes rvSlideUp { from{transform:translateY(100%);opacity:0} to{transform:none;opacity:1} }
        @keyframes rvSpin    { to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}
