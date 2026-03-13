// pages/FamilyTree/TreeWrapper.jsx
// Creator ka entry point — /tree route
// PrivateRoute ke andar hai — user hamesha logged in hoga
//
// Flow:
//   1. uid se getTreesByUid → koi tree hai?
//   2. Nahi → FamilyTree kholo (InitDialog dikhega)
//   3. Ek tree → seedha open
//   4. Multiple → list dikhao, select karo

import { useState, useEffect } from 'react';
import { useAuth }             from '../../store/AuthContext';
import { getTreesByUid, createTree, saveTreeData } from '../../db/treeDb'; // treeDb.js ke functions    
import FamilyTree              from './index';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a',
};

// ── Tree list (multiple trees) ────────────────────────────────────────────────
function TreeList({ trees, onSelect, onCreate }) {
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
        <button onClick={onCreate}
          style={{width:'100%',padding:'13px 0',borderRadius:10,
            border:`2px dashed ${C.gold}`,background:'transparent',
            color:C.maroon,fontWeight:700,fontSize:14,
            cursor:'pointer',marginTop:6}}>
          + Naya Vansh Vriksha
        </button>
      </div>
    </div>
  );
}

// ── Main TreeWrapper ──────────────────────────────────────────────────────────
export default function TreeWrapper() {
  const { user } = useAuth();
  const [myTrees,     setMyTrees]     = useState(null);  // null = loading
  const [activeTid,   setActiveTid]   = useState(null);
  const [activePin,   setActivePin]   = useState(null);
  const [showList,    setShowList]    = useState(false);

  // Load trees on mount
  useEffect(() => {
    if (!user?.uid) return;

    // Step 1: localStorage se cache check karo (instant)
    const lsCacheKey = `vt_treelist_${user.uid}`;
    try {
      const cached = localStorage.getItem(lsCacheKey);
      if (cached) {
        const trees = JSON.parse(cached);
        const ids   = Object.keys(trees || {});
        if (ids.length === 1) {
          setMyTrees(trees);
          setActiveTid(ids[0]);
          setActivePin(trees[ids[0]]?.pin || null);
          return; // Firestore check background mein bhi kar sakte hain
        } else if (ids.length > 1) {
          setMyTrees(trees);
          setShowList(true);
          return;
        }
      }
    } catch {}

    // Step 2: Firestore se load karo (cache miss ya naya user)
    getTreesByUid(user.uid)
      .then(trees => {
        const ids = Object.keys(trees || {});

        // Cache save karo
        try { localStorage.setItem(lsCacheKey, JSON.stringify(trees)); } catch {}

        if (ids.length === 0) {
          setMyTrees({});
          setActiveTid('__new__');
        } else if (ids.length === 1) {
          setMyTrees(trees);
          setActiveTid(ids[0]);
          setActivePin(trees[ids[0]]?.pin || null);
        } else {
          setMyTrees(trees);
          setShowList(true);
        }
      })
      .catch(console.error);
  }, [user?.uid]);

  // Naya tree Firestore mein save karo jab InitDialog se naam milta hai
  // FamilyTree/index.jsx ka initTree() local state set karta hai
  // Hamen Firestore mein createTree() call karna hai
  // Isliye onTreeInit callback pass karte hain
  const handleTreeInit = async (rawInput, nodes) => {
    // rawInput = "Dhruv Sanjay Gunvantlal..."
    // nodes = useFamilyTree ne jo banaye — Firestore mein bhi save honge
    const names = rawInput.trim().split(/\s+/).filter(Boolean);
    if (!names.length) return;
    const treeName = names[0] + "'s Vansh Vriksha";
    try {
      // nodes ke saath createTree — Firestore mein data bhi rahega
      const { treeId, pin } = await createTree(user.uid, treeName, nodes || [], []);

      // localStorage '__new__' → real treeId pe migrate karo
      try {
        const tmpNodes = localStorage.getItem('vt_nodes___new__');
        if (tmpNodes) localStorage.setItem(`vt_nodes_${treeId}`, tmpNodes);
        localStorage.setItem(`vt_meta_${treeId}`,
          JSON.stringify({ treeName, rowOrder: null }));
        localStorage.removeItem('vt_nodes___new__');
        localStorage.removeItem('vt_meta___new__');
      } catch {}

      const updatedTrees = {
        ...(myTrees || {}),
        [treeId]: { role: 'creator', treeName, pin, createdAt: Date.now() },
      };
      // localStorage cache update karo
      try {
        localStorage.setItem(`vt_treelist_${user.uid}`, JSON.stringify(updatedTrees));
      } catch {}

      setActiveTid(treeId);
      setActivePin(pin);
      setMyTrees(updatedTrees);
    } catch(e) {
      console.error('createTree failed:', e);
    }
  };

  // Loading
  if (myTrees === null) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',
      justifyContent:'center',background:C.bg,
      fontFamily:"'DM Sans',sans-serif",color:C.muted}}>
      Loading…
    </div>
  );

  // Multiple trees list
  if (showList && !activeTid) return (
    <TreeList
      trees={myTrees}
      onSelect={(tid, info) => {
        setActiveTid(tid);
        setActivePin(info?.pin || null);
        setShowList(false);
      }}
      onCreate={() => {
        setActiveTid('__new__');
        setShowList(false);
      }}
    />
  );

  // Active tree open
  if (activeTid) return (
    <FamilyTree
      treeId={activeTid === '__new__' ? null : activeTid}
      email={user?.email}
      isCreator={true}
      pin={activePin}
      readOnly={false}
      onTreeInit={handleTreeInit}
      onBack={Object.keys(myTrees).length > 1
        ? () => { setActiveTid(null); setShowList(true); }
        : null
      }
    />
  );

  return null;
}