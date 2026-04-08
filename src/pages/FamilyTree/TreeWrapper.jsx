// pages/FamilyTree/TreeWrapper.jsx
// Registered user ka entry point — /tree route
//
// RULE: User khud tree nahi bana sakta.
//       Sirf admin invite karta hai — WhatsApp link + PIN ke zariye.
//
// Flow:
//   1. uid se getTreesByUid → trees load karo
//   2. Koi tree nahi → "Admin se invite maango" screen
//   3. Ek tree      → seedha open
//   4. Multiple     → list dikhao, select karo

import { useState, useEffect } from 'react';
import { useAuth }             from '../../store/AuthContext';
import { getTreesByUid }       from '../../db/treeDb';
import FamilyTree              from './index';
import { useNavigate }         from 'react-router-dom';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a',
};

// Admin WhatsApp — same as Home.jsx
const ADMIN_WA_TREE = `https://wa.me/919974021397?text=${encodeURIComponent("નમસ્તે, મારે Family Tree નો access જોઈએ છે. Invite link મોકલશો?")}`;

// ── No tree screen ─────────────────────────────────────────────────────────────
function NoTreeScreen() {
  return (
    <div style={{minHeight:'100vh',background:C.bg,
      fontFamily:"'DM Sans',sans-serif",
      display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',padding:24,textAlign:'center'}}>
      <div style={{fontSize:56,marginBottom:16}}>🌳</div>
      <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,
        color:C.maroon,marginBottom:10,fontWeight:400}}>
        કોઈ Family Tree મળ્યું નહીં
      </h2>
      <p style={{fontSize:14,color:C.muted,lineHeight:1.7,
        maxWidth:300,marginBottom:28}}>
        તમને હજી invite મળ્યું નથી.
        <br/>Admin ને WhatsApp કરો — invite link મળશે.
      </p>
      <a
        href={ADMIN_WA_TREE}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display:'flex',alignItems:'center',justifyContent:'center',
          gap:10,width:'100%',maxWidth:320,padding:'14px 0',
          borderRadius:12,border:'none',
          background:'#25D366',color:'#fff',
          fontSize:15,fontWeight:700,
          cursor:'pointer',textDecoration:'none',
        }}
      >
        <span style={{fontSize:20}}>💬</span>
        Admin ને WhatsApp કરો
      </a>
      <div style={{background:'#fff',border:`1.5px solid ${C.border}`,
        borderRadius:12,padding:'16px 20px',maxWidth:320,width:'100%',
        fontSize:13,color:C.muted,lineHeight:1.8,textAlign:'left',marginTop:20}}>
        <div style={{fontWeight:700,color:C.maroon,marginBottom:8}}>
          📲 Invite મળ્યા પછી:
        </div>
        <div>1. WhatsApp link ખોલો</div>
        <div>2. Mobile number + PIN નાખો</div>
        <div>3. Tree જુઓ અને edit કરો</div>
        <div>4. Register કરો — permanent access</div>
      </div>
    </div>
  );
}

// ── Tree list (multiple trees) ─────────────────────────────────────────────────
function TreeList({ trees, onSelect }) {
  return (
    <div style={{minHeight:'100vh',background:C.bg,
      fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:C.maroon,color:'#fff',height:54,
        display:'flex',alignItems:'center',padding:'0 20px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <span style={{fontFamily:"'DM Serif Display',serif",fontSize:18}}>
          🌳 Vansh Vriksha
        </span>
      </div>
      <div style={{padding:20,maxWidth:480,margin:'0 auto'}}>
        <h3 style={{color:C.maroon,fontSize:13,fontWeight:700,
          textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>
          Mera Vansh Vriksha
        </h3>
        {Object.entries(trees).map(([tid, info]) => (
          <div key={tid} onClick={() => onSelect(tid, info)}
            style={{background:'#fff',border:`1.5px solid ${C.border}`,
              borderRadius:10,padding:'14px 16px',marginBottom:10,
              cursor:'pointer',display:'flex',alignItems:'center',
              justifyContent:'space-between',
              boxShadow:'0 2px 6px rgba(60,15,15,0.06)'}}>
            <div>
              <div style={{fontWeight:600,fontSize:15,color:C.maroon}}>
                {info.treeName}
              </div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                Tree ID: <strong>{tid}</strong>
              </div>
            </div>
            <span style={{fontSize:22,color:C.gold}}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Not logged in — invite link ke bina /tree khola ──────────────────────────
function GuestPinEntry() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight:'100vh', background:C.bg,
      fontFamily:"'DM Sans',sans-serif",
      display:'flex', alignItems:'center',
      justifyContent:'center', padding:24,
    }}>
      <div style={{
        background:'#fefcf5', border:`2px solid ${C.gold}`,
        borderRadius:16, padding:'36px 24px',
        maxWidth:380, width:'100%',
        boxShadow:'0 24px 64px rgba(60,15,15,0.18)',
        textAlign:'center',
      }}>
        <div style={{fontSize:52, marginBottom:8}}>🌳</div>
        <h2 style={{
          fontFamily:"'DM Serif Display',serif", fontSize:20,
          color:C.maroon, margin:'0 0 10px',
        }}>
          Family Tree
        </h2>
        <p style={{fontSize:13, color:C.muted, marginBottom:28, lineHeight:1.7}}>
          Tree જોવા માટે WhatsApp invite link જોઈએ.
          <br/>Admin પાસેથી invite link મેળવો.
        </p>

        <a
          href={ADMIN_WA_TREE}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            gap:10, width:'100%', padding:'13px 0',
            borderRadius:10, border:'none',
            background:'#25D366', color:'#fff',
            fontSize:14, fontWeight:700,
            cursor:'pointer', textDecoration:'none',
            marginBottom:12, boxSizing:'border-box',
          }}
        >
          <span style={{fontSize:18}}>💬</span>
          Admin ને WhatsApp કરો
        </a>

        <button
          onClick={() => navigate('/login')}
          style={{
            width:'100%', padding:11, borderRadius:10,
            border:`1px solid ${C.border}`, background:'transparent',
            color:C.muted, fontSize:13, cursor:'pointer',
          }}
        >
          Login કરો
        </button>
      </div>
    </div>
  );
}

// ── Main TreeWrapper ───────────────────────────────────────────────────────────
export default function TreeWrapper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myTrees,   setMyTrees]   = useState(null);  // null = loading
  const [activeTid, setActiveTid] = useState(null);
  const [activePin, setActivePin] = useState(null);
  const [showList,  setShowList]  = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const lsCacheKey = `vt_treelist_${user.uid}`;

    // localStorage cache — instant load
    try {
      const cached = localStorage.getItem(lsCacheKey);
      if (cached) {
        const trees = JSON.parse(cached);
        const ids   = Object.keys(trees || {});
        if (ids.length === 1) {
          const pin = trees[ids[0]]?.pin || null;
          // Only use cache if pin is present — otherwise fall through to Firestore
          if (pin) {
            setMyTrees(trees);
            setActiveTid(ids[0]);
            setActivePin(pin);
            return;
          }
        } else if (ids.length > 1) {
          setMyTrees(trees);
          setShowList(true);
          return;
        }
      }
    } catch {}

    // Firestore se load karo
    getTreesByUid(user.uid)
      .then(async trees => {
        const ids = Object.keys(trees || {});
        try { localStorage.setItem(lsCacheKey, JSON.stringify(trees)); } catch {}

        if (ids.length === 0) {
          setMyTrees({});  // koi tree nahi — NoTreeScreen dikhega
        } else if (ids.length === 1) {
          const tid = ids[0];
          let pin = trees[tid]?.pin || null;
          // If pin missing in RTDB (anonymous users), fetch from Firestore
          if (!pin) {
            const { getTree } = await import('../../db/treeDb');
            const treeData = await getTree(tid);
            pin = treeData?.pin || null;
            // Backfill RTDB so next load is instant
            if (pin) {
              const { rtdb } = await import('../../db/rtdb');
              rtdb.update(`userTrees/${user.uid}/${tid}`, { pin }).catch(() => {});
            }
          }
          setMyTrees(trees);
          setActiveTid(tid);
          setActivePin(pin);
        } else {
          setMyTrees(trees);
          setShowList(true);
        }
      })
      .catch(console.error);
  }, [user?.uid]);

  // Login નથી → Tree ID + PIN entry screen
  if (!user?.uid) return <GuestPinEntry />;

  // Loading
  if (myTrees === null) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',
      justifyContent:'center',background:C.bg,
      fontFamily:"'DM Sans',sans-serif",color:C.muted}}>
      Loading…
    </div>
  );

  // Koi tree nahi
  if (Object.keys(myTrees).length === 0) return <NoTreeScreen />;

  // Multiple trees list
  if (showList && !activeTid) return (
    <TreeList
      trees={myTrees}
      onSelect={(tid, info) => {
        setActiveTid(tid);
        setActivePin(info?.pin || null);
        setShowList(false);
      }}
    />
  );

  // Active tree open
  if (activeTid) return (
    <FamilyTree
      treeId={activeTid}
      email={user?.email}
      isCreator={true}
      pin={activePin}
      readOnly={false}
      onBack={Object.keys(myTrees).length > 1
        ? () => { setActiveTid(null); setShowList(true); }
        : null
      }
    />
  );

  return null;
}