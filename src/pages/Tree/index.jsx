// pages/Tree/index.jsx
// Guest / Invited member entry point — /tree/:treeId
//
// ── New Flow ──────────────────────────────────────────────────────────────────
//
//   1. Page loads → show tree in READ-ONLY behind a blurred overlay
//   2. Overlay immediately shows PIN entry popup (no "Edit karo" button needed)
//   3. If already a verified/registered user → skip popup, go straight to edit
//   4. PIN verified → look up name from invited[] list
//   5. Show registration popup (Google / Email / Anonymous)
//   6. After auth → full edit access, overlay gone
//
// ── Auth check on load ────────────────────────────────────────────────────────
//   - Firebase Auth currentUser exists?
//     → Creator?       → skip everything, full edit
//     → Verified editor (has mobile in RTDB)? → skip everything, full edit
//   - Not logged in / unknown → show PIN popup immediately

import { useState, useEffect }  from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getAuth }               from 'firebase/auth';
import {
  getTree, verifyPinAndSaveEditor, isVerifiedEditor,
  getTreesByUid, getInvitedName,
}                                from '../../db/treeDb';
import {
  validateInvite, markInviteUsed, checkLockout, recordFailedAttempt, clearFailedAttempts,
}                                from '../../db/inviteDb';
import { rtdb }                  from '../../db/rtdb';
import { toMobileKey, toFullMobile } from '../../lib/phone';
import JoinDirectory             from './JoinDirectory';
import FamilyTree                from '../FamilyTree/index';
import MobileInput               from '../../components/ui/MobileInput';

const C = {
  maroon: '#6b1f1f', gold: '#c4993a', border: '#d6c99a',
  cream: '#fefcf5', bg: '#f9f5e7', muted: '#9c7c5a',
};

const labelSt = {
  fontSize: 11, fontWeight: 700, color: C.gold,
  textTransform: 'uppercase', letterSpacing: '1px',
  display: 'block', marginBottom: 6,
};

// ── PIN Entry Popup ───────────────────────────────────────────────────────────
// ipin = 6-digit one-time invite PIN from WhatsApp link (?ipin=XXXXXX)
// Each invite has its own PIN — cannot be reused by another person.
//
// Flow:
//   1. ipin pre-filled from URL — user just enters their mobile
//   2. validateInvite(ipin) → checks not expired, not used, phone matches
//   3. markInviteUsed(ipin, uid) → PIN retired, nobody else can use it
//   4. verifyPinAndSaveEditor() → saved as editor in RTDB

function PinPopup({ tree, urlIpin, onVerified }) {
  const [phone,   setPhone]   = useState('');
  const [cc,      setCc]      = useState('+91');
  // ipin = the 6-digit one-time invite PIN
  const [ipin,    setIpin]    = useState(urlIpin || '');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  // Device ID for brute-force protection
  const deviceId = (() => {
    try {
      let id = localStorage.getItem('_did');
      if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('_did', id); }
      return id;
    } catch { return 'unknown'; }
  })();

  const handleVerify = async () => {
    if (!phone.trim())       { setErr('Apna mobile number daalo'); return; }
    if (ipin.length !== 6)   { setErr('6 digit PIN daalo'); return; }
    setLoading(true); setErr('');
    try {
      const fullPhone = toFullMobile(cc, phone);

      // Brute-force check
      const lockout = await checkLockout(deviceId);
      if (lockout.locked) {
        const mins = Math.ceil((lockout.lockedUntil - Date.now()) / 60000);
        setErr(`Bahut zyada galat try. ${mins} minute baad dobara try karo.`);
        return;
      }

      // Already verified before? Skip PIN check
      const already = await isVerifiedEditor(tree.id, fullPhone);
      if (already) {
        onVerified(fullPhone, '');
        return;
      }

      // Validate one-time invite PIN
      const { valid, reason, invite } = await validateInvite(ipin);
      if (!valid) {
        await recordFailedAttempt(deviceId);
        if (reason === 'not_found')  { setErr('Yeh PIN valid nahi hai. WhatsApp message se PIN copy karo.'); return; }
        if (reason === 'expired')    { setErr('Yeh invite expire ho gaya. Admin se naya link maango.'); return; }
        if (reason === 'used_up')    { setErr('Yeh PIN pehle hi use ho chuka hai. Admin se naya link maango.'); return; }
        setErr('PIN invalid hai. Dobara try karo.');
        return;
      }

      // Phone must match what admin saved — security check
      if (invite.phone && invite.phone !== fullPhone) {
        await recordFailedAttempt(deviceId);
        setErr('Yeh PIN is number ke liye nahi hai. Sahi number daalo.');
        return;
      }

      // All good — save as verified editor
      await verifyPinAndSaveEditor(tree.id, tree.pin, fullPhone);
      await markInviteUsed(ipin, null);   // retire PIN immediately
      await clearFailedAttempts(deviceId);

      onVerified(fullPhone, invite.name || '');

    } catch (e) {
      setErr('Network error. Dobara try karo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(60,15,15,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: C.cream, border: `2px solid ${C.gold}`,
        borderRadius: 16, padding: '32px 24px',
        maxWidth: 380, width: '100%',
        boxShadow: '0 24px 64px rgba(60,15,15,0.45)',
      }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44 }}>🌳</div>
          <h2 style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 20,
            color: C.maroon, margin: '8px 0 4px',
          }}>
            {tree.treeName}
          </h2>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            Aapko is family tree mein invite kiya gaya hai.
            <br />Apna number aur PIN daalo.
          </p>
        </div>

        <label style={labelSt}>Aapka Mobile Number</label>
        <MobileInput
          value={phone} onChange={setPhone}
          countryCode={cc} onCountryCodeChange={setCc}
          placeholder="Mobile number"
          style={{ marginBottom: 14 }}
        />

        <label style={labelSt}>PIN (6 digits — WhatsApp message mein tha)</label>
        <input
          type="number" value={ipin}
          onChange={e => setIpin(e.target.value.slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          placeholder="123456"
          style={{
            width: '100%', padding: '13px', borderRadius: 8,
            border: `1.5px solid ${urlIpin ? '#a5d6a7' : C.border}`, fontSize: 26,
            textAlign: 'center', letterSpacing: 8, fontWeight: 700,
            background: urlIpin ? '#e8f5e9' : C.bg, marginBottom: 14, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {urlIpin && (
          <p style={{ fontSize: 11, color: '#2e7d32', textAlign: 'center', marginTop: -10, marginBottom: 12 }}>
            ✓ PIN auto-filled from your invite link
          </p>
        )}

        {err && (
          <div style={{
            color: '#c0392b', fontSize: 12,
            marginBottom: 12, textAlign: 'center',
            padding: '8px 12px', background: '#ffeaea', borderRadius: 7,
          }}>{err}</div>
        )}

        <button onClick={handleVerify} disabled={loading} style={{
          width: '100%', padding: 13, borderRadius: 10, border: 'none',
          background: C.maroon, color: '#fff', fontWeight: 700,
          fontSize: 15, cursor: loading ? 'wait' : 'pointer',
        }}>
          {loading ? 'Verify ho raha hai…' : '✓ Continue karo'}
        </button>

        <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 12 }}>
          PIN aapke WhatsApp message mein tha
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TreeGuestPage() {
  const { treeId } = useParams();
  const [searchParams] = useSearchParams();
  const urlIpin = searchParams.get('ipin') || '';

  const [tree,        setTree]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);

  // Access control
  const [canEdit,     setCanEdit]     = useState(false);
  const [isCreator,   setIsCreator]   = useState(false);

  // Popup visibility
  const [showPin,     setShowPin]     = useState(false);   // PIN popup
  const [showJoin,    setShowJoin]    = useState(false);   // Registration popup

  // Verified person details (set after PIN verified)
  const [editorPhone, setEditorPhone] = useState('');
  const [editorName,  setEditorName]  = useState('');
  const [isUser,      setIsUser]      = useState(false);   // has Firebase Auth account?
  const [editorUid,   setEditorUid]   = useState('');

  // ── On mount: load tree + check auth ──────────────────────────────────────
  useEffect(() => {
    if (!treeId) return;

    const init = async () => {
      try {
        // 1. Load tree metadata
        const data = await getTree(treeId);
        if (!data) { setNotFound(true); return; }
        setTree(data);

        // 2. Check Firebase Auth
        const auth        = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          // Not logged in → show PIN popup immediately
          setShowPin(true);
          return;
        }

        const uid = currentUser.uid;

        // 3. Creator check
        const myTrees = await getTreesByUid(uid);
        if (myTrees[treeId]) {
          setCanEdit(true);
          setIsCreator(true);
          setIsUser(true);
          setEditorUid(uid);
          return;
        }

        // 4. Already a verified editor with registered account?
        const userData = await rtdb.get(`users/${uid}`);
        if (userData?.mobile) {
          const mobileKey  = toMobileKey(userData.mobile);
          const editorData = await rtdb.get(`treeEditors/${treeId}/${mobileKey}`);
          if (editorData) {
            setCanEdit(true);
            setEditorPhone(userData.mobile);
            setEditorName(editorData.name || userData.displayName || '');
            setEditorUid(uid);
            setIsUser(true);
            return;
          }
        }

        // 5. Logged in but not a verified editor → show PIN popup
        setShowPin(true);

      } catch (e) {
        console.error('TreeGuestPage init error:', e);
        setShowPin(true); // fallback — show PIN
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [treeId]);

  // ── PIN verified callback ──────────────────────────────────────────────────
  // Called by PinPopup after phone+PIN accepted.
  // phone = full mobile, name = from invited[] list (may be '')
  const handlePinVerified = (phone, name) => {
    setEditorPhone(phone);
    setEditorName(name);
    setShowPin(false);
    // Give edit access immediately
    setCanEdit(true);
    // Show registration popup (Google / Email / Anonymous)
    setShowJoin(true);
  };

  // ── Registration complete callback ─────────────────────────────────────────
  const handleJoinSuccess = ({ uid, name }) => {
    setShowJoin(false);
    setIsUser(true);
    if (name) setEditorName(name);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: C.bg,
      fontFamily: "'DM Sans', sans-serif", color: C.muted,
    }}>
      Loading…
    </div>
  );

  // ── Tree not found ─────────────────────────────────────────────────────────
  if (notFound) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: C.bg, fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ fontSize: 48 }}>🌳</div>
      <h2 style={{ color: C.maroon, fontFamily: "'DM Serif Display', serif" }}>
        Tree nahi mila
      </h2>
      <p style={{ color: C.muted, fontSize: 13 }}>
        Tree ID "{treeId}" exist nahi karta.
      </p>
    </div>
  );

  return (
    <>
      {/* PIN popup — shown immediately for unrecognised visitors */}
      {showPin && tree && (
        <PinPopup
          tree={tree}
          urlIpin={urlIpin}
          onVerified={handlePinVerified}
        />
      )}

      {/* Registration popup — shown after PIN verified */}
      {showJoin && !isUser && (
        <JoinDirectory
          treeId={treeId}
          phone={editorPhone}
          name={editorName}
          onSuccess={handleJoinSuccess}
          onSkip={() => setShowJoin(false)}
        />
      )}

      {/* Family tree — always rendered, read-only until verified */}
      <FamilyTree
        treeId={treeId}
        pin={tree?.pin}
        isCreator={isCreator}
        readOnly={!canEdit}
        onRequestEdit={null}
        editorName={editorName}
        editorPhone={editorPhone}
        editorUid={editorUid}
      />
    </>
  );
}
