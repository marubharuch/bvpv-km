// pages/Tree/index.jsx
// Guest / Editor page — /tree/:treeId
// Koi bhi dekh sakta hai (viewer)
// PIN daalkar edit kar sakta hai (editor)

import { useState, useEffect } from 'react';
import { useParams }           from 'react-router-dom';
import { getTree, verifyPinAndSaveEditor, isVerifiedEditor } from '../../db/treedb'; // treeDb.js ke functions      
import FamilyTree              from '../FamilyTree/index';
import MobileInput             from '../../components/ui/MobileInput';
import { toFullMobile }        from '../../lib/phone';

const C = {
  maroon: '#6b1f1f', gold: '#c4993a', border: '#d6c99a',
  cream: '#fefcf5', bg: '#f9f5e7', muted: '#9c7c5a',
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
      // Pehle check karo — already verified editor hai?
      const already = await isVerifiedEditor(treeId, fullPhone);
      if (already) { onVerified(fullPhone); return; }

      // PIN verify karo
      const result = await verifyPinAndSaveEditor(treeId, pin, fullPhone);
      if (result.ok) {
        onVerified(fullPhone);
      } else {
        setErr(result.reason === 'wrong_pin' ? 'Galat PIN hai' : 'Kuch problem aayi, dobara try karo');
      }
    } catch (e) {
      setErr('Network error. Dobara try karo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(60,15,15,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.cream, border: `2px solid ${C.gold}`,
        borderRadius: 12, padding: '32px 24px', maxWidth: 380, width: '100%',
        boxShadow: '0 24px 64px rgba(60,15,15,0.4)' }}>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40 }}>🔑</div>
          <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20,
            color: C.maroon, margin: '8px 0 4px' }}>
            Edit karna chahte ho?
          </h2>
          <p style={{ fontSize: 12, color: C.muted }}>
            {treeName} — PIN daalo jo creator ne bheja tha
          </p>
        </div>

        {/* Phone */}
        <label style={{ fontSize: 11, fontWeight: 700, color: C.gold,
          textTransform: 'uppercase', letterSpacing: '1px',
          display: 'block', marginBottom: 6 }}>
          Aapka Mobile Number
        </label>
        <MobileInput
          value={phone} onChange={setPhone}
          countryCode={cc} onCountryCodeChange={setCc}
          placeholder="Mobile number"
          style={{ marginBottom: 14 }} />

        {/* PIN */}
        <label style={{ fontSize: 11, fontWeight: 700, color: C.gold,
          textTransform: 'uppercase', letterSpacing: '1px',
          display: 'block', marginBottom: 6 }}>
          PIN (4 digits)
        </label>
        <input
          type="number" value={pin}
          onChange={e => setPin(e.target.value.slice(0, 4))}
          placeholder="1234"
          style={{ width: '100%', padding: '12px', borderRadius: 8,
            border: `1.5px solid ${C.border}`, fontSize: 24,
            textAlign: 'center', letterSpacing: 8, fontWeight: 700,
            background: C.bg, marginBottom: 14 }} />

        {err && (
          <div style={{ color: '#c0392b', fontSize: 12,
            marginBottom: 10, textAlign: 'center' }}>{err}</div>
        )}

        <button onClick={handleVerify} disabled={loading}
          style={{ width: '100%', padding: 12, borderRadius: 8,
            border: 'none', background: C.maroon, color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            marginBottom: 10 }}>
          {loading ? 'Verify ho raha hai…' : '✓ PIN Verify karo'}
        </button>

        <button onClick={onSkip}
          style={{ width: '100%', padding: 10, borderRadius: 8,
            border: `1px solid ${C.border}`, background: 'transparent',
            color: C.muted, fontSize: 13, cursor: 'pointer' }}>
          Sirf dekhna hai (View Only)
        </button>
      </div>
    </div>
  );
}

// ── Main Tree Guest Page ──────────────────────────────────────────────────────
export default function TreeGuestPage() {
  const { treeId }  = useParams();
  const [tree,      setTree]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [showPin,   setShowPin]   = useState(false);
  const [canEdit,   setCanEdit]   = useState(false);  // PIN verified

  useEffect(() => {
    if (!treeId) return;
    getTree(treeId)
      .then(data => {
        if (!data) { setNotFound(true); return; }
        setTree(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [treeId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: C.bg,
      fontFamily: "'DM Sans',sans-serif", color: C.muted }}>
      Loading tree…
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: C.bg,
      fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ fontSize: 48 }}>🌳</div>
      <h2 style={{ color: C.maroon, fontFamily: "'DM Serif Display',serif" }}>
        Tree nahi mila
      </h2>
      <p style={{ color: C.muted, fontSize: 13 }}>
        Tree ID "{treeId}" exist nahi karta.
      </p>
    </div>
  );

  return (
    <>
      {/* PIN dialog — sirf jab edit button dabaya */}
      {showPin && (
        <PinEntry
          treeId={treeId}
          treeName={tree.treeName}
          onVerified={() => { setCanEdit(true); setShowPin(false); }}
          onSkip={() => setShowPin(false)}
        />
      )}

      {/* FamilyTree component — readOnly agar PIN verify nahi hua */}
      <FamilyTree
        treeId={treeId}
        isCreator={false}
        readOnly={!canEdit}
        onRequestEdit={() => setShowPin(true)}
      />
    </>
  );
}