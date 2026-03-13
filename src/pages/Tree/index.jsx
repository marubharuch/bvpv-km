// pages/Tree/index.jsx
// Guest / Editor page — /tree/:treeId
//
// Auth check sequence (mount par):
//   1. Firebase Auth → currentUser hai?
//   2. Haan → treesByUid check → creator hai? → seedha edit
//   3. Haan → treeEditors check → verified editor hai? → seedha edit
//   4. Nahi / unknown → view only, "Edit karo" button → PIN screen

import { useState, useEffect }  from 'react';
import { useParams }             from 'react-router-dom';
import { getAuth }               from 'firebase/auth';
import { getTree, verifyPinAndSaveEditor, isVerifiedEditor,
         getTreesByUid }         from '../../db/treeDb';
import { rtdb }                  from '../../db/rtdb';
import { toMobileKey, toFullMobile } from '../../lib/phone';
import JoinDirectory             from '../JoinDirectory';
import FamilyTree                from '../FamilyTree/index';
import MobileInput               from '../../components/ui/MobileInput';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a',
};

// ── PIN Entry Screen ──────────────────────────────────────────────────────────
function PinEntry({ treeId, treeName, onVerified, onSkip }) {
  const [phone,   setPhone]   = useState('');
  const [cc,      setCc]      = useState('+91');
  const [pin,     setPin]     = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const handleVerify = async () => {
    if (!phone.trim()) { setErr('Apna mobile number daalo'); return; }
    if (pin.length !== 4) { setErr('4 digit PIN daalo'); return; }
    setLoading(true); setErr('');
    try {
      const fullPhone = toFullMobile(cc, phone);
      const already   = await isVerifiedEditor(treeId, fullPhone);
      if (already) { onVerified(fullPhone); return; }
      const result = await verifyPinAndSaveEditor(treeId, pin, fullPhone);
      if (result.ok) {
        onVerified(fullPhone);
      } else {
        setErr(result.reason === 'wrong_pin' ? 'Galat PIN hai' : 'Kuch problem aayi');
      }
    } catch (e) {
      setErr('Network error. Dobara try karo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:200,
      background:'rgba(60,15,15,0.8)',backdropFilter:'blur(6px)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:C.cream,border:`2px solid ${C.gold}`,
        borderRadius:12,padding:'32px 24px',maxWidth:380,width:'100%',
        boxShadow:'0 24px 64px rgba(60,15,15,0.4)'}}>
        <div style={{textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:40}}>🔑</div>
          <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,
            color:C.maroon,margin:'8px 0 4px'}}>
            Edit karna chahte ho?
          </h2>
          <p style={{fontSize:12,color:C.muted}}>
            {treeName} — PIN daalo jo creator ne bheja tha
          </p>
        </div>

        <label style={labelSt}>Aapka Mobile Number</label>
        <MobileInput value={phone} onChange={setPhone}
          countryCode={cc} onCountryCodeChange={setCc}
          placeholder="Mobile number"
          style={{marginBottom:14}}/>

        <label style={labelSt}>PIN (4 digits)</label>
        <input type="number" value={pin}
          onChange={e=>setPin(e.target.value.slice(0,4))}
          placeholder="1234"
          style={{width:'100%',padding:'12px',borderRadius:8,
            border:`1.5px solid ${C.border}`,fontSize:24,
            textAlign:'center',letterSpacing:8,fontWeight:700,
            background:C.bg,marginBottom:14}}/>

        {err && <div style={{color:'#c0392b',fontSize:12,
          marginBottom:10,textAlign:'center'}}>{err}</div>}

        <button onClick={handleVerify} disabled={loading}
          style={{width:'100%',padding:12,borderRadius:8,border:'none',
            background:C.maroon,color:'#fff',fontWeight:700,
            fontSize:14,cursor:'pointer',marginBottom:10}}>
          {loading ? 'Verify ho raha hai…' : '✓ PIN Verify karo'}
        </button>
        <button onClick={onSkip}
          style={{width:'100%',padding:10,borderRadius:8,
            border:`1px solid ${C.border}`,background:'transparent',
            color:C.muted,fontSize:13,cursor:'pointer'}}>
          Sirf dekhna hai (View Only)
        </button>
      </div>
    </div>
  );
}

const labelSt = {
  fontSize:11,fontWeight:700,color:C.gold,
  textTransform:'uppercase',letterSpacing:'1px',
  display:'block',marginBottom:6,
};

// ── Main Tree Guest Page ──────────────────────────────────────────────────────
export default function TreeGuestPage() {
  const { treeId } = useParams();

  const [tree,        setTree]        = useState(null);
  const [loading,     setLoading]     = useState(true);  // tree + auth check
  const [notFound,    setNotFound]    = useState(false);
  const [showPin,     setShowPin]     = useState(false);
  const [canEdit,     setCanEdit]     = useState(false);
  const [isCreator,   setIsCreator]   = useState(false);
  const [editorPhone, setEditorPhone] = useState('');
  const [editorName,  setEditorName]  = useState('');
  const [isUser,      setIsUser]      = useState(false);
  const [showJoin,    setShowJoin]    = useState(false);

  useEffect(() => {
    if (!treeId) return;

    const init = async () => {
      try {
        // 1. Tree load karo
        const data = await getTree(treeId);
        if (!data) { setNotFound(true); return; }
        setTree(data);

        // 2. Firebase Auth — currentUser check
        const auth        = getAuth();
        const currentUser = auth.currentUser;
        console.log('🔍 currentUser:', currentUser?.uid, currentUser?.email);

        if (!currentUser) {
          // Logged out — view only
          return;
        }

        const uid = currentUser.uid;

        // 3. Creator check — treesByUid mein yeh treeId hai?
        console.log('🔍 checking treesByUid for uid:', uid);
        const myTrees = await getTreesByUid(uid);
        console.log('🔍 myTrees:', myTrees);
        if (myTrees[treeId]) {
          // Creator hai — seedha edit
          setCanEdit(true);
          setIsCreator(true);
          setIsUser(true);
          return;
        }

        // 4. Verified editor check — RTDB treeEditors mein uid dhundho
        // User ka phone RTDB users/{uid}/mobile se milega
        console.log('🔍 checking RTDB users/', uid);
        const userData = await rtdb.get(`users/${uid}`);
        console.log('🔍 userData:', userData);
        if (userData?.mobile) {
          const phone     = userData.mobile;
          const mobileKey = toMobileKey(phone);
          const editorData = await rtdb.get(
            `treeEditors/${treeId}/${mobileKey}`
          );

          if (editorData) {
            // Verified editor — seedha edit
            setCanEdit(true);
            setEditorPhone(phone);
            setEditorName(editorData.name || userData.displayName || '');
            setIsUser(!!editorData.isUser);
            // Agar user nahi bana abhi tak — join prompt dikhao
            if (!editorData.isUser) {
              setTimeout(() => setShowJoin(true), 800);
            }
            return;
          }
        }

        // 5. Logged in hai but is tree ka editor nahi — view only
        // (PIN se join kar sakta hai)

      } catch (e) {
        console.error('Tree init error:', e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [treeId]);

  // PIN verified callback
  const handlePinVerified = (phone) => {
    setCanEdit(true);
    setShowPin(false);
    setEditorPhone(phone);
    // Invited list mein naam dhundho
    const match = (tree?.invited || []).find(i => i.phone === phone);
    if (match?.name) setEditorName(match.name);
    // Join directory prompt
    setTimeout(() => setShowJoin(true), 800);
  };

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',
      justifyContent:'center',background:C.bg,
      fontFamily:"'DM Sans',sans-serif",color:C.muted}}>
      Loading…
    </div>
  );

  if (notFound) return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',background:C.bg,
      fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:48}}>🌳</div>
      <h2 style={{color:C.maroon,fontFamily:"'DM Serif Display',serif"}}>
        Tree nahi mila
      </h2>
      <p style={{color:C.muted,fontSize:13}}>
        Tree ID "{treeId}" exist nahi karta.
      </p>
    </div>
  );

  return (
    <>
      {/* PIN dialog */}
      {showPin && (
        <PinEntry
          treeId={treeId}
          treeName={tree.treeName}
          onVerified={handlePinVerified}
          onSkip={() => setShowPin(false)}
        />
      )}

      {/* Join Directory dialog — sirf non-users ke liye */}
      {showJoin && !isUser && (
        <JoinDirectory
          treeId={treeId}
          phone={editorPhone}
          name={editorName}
          onSuccess={({ uid, name }) => {
            setShowJoin(false);
            setIsUser(true);
            setEditorName(name);
          }}
          onSkip={() => setShowJoin(false)}
        />
      )}

      {/* FamilyTree */}
      <FamilyTree
        treeId={treeId}
        isCreator={isCreator}
        readOnly={!canEdit}
        onRequestEdit={canEdit ? null : () => setShowPin(true)}
      />
    </>
  );
}