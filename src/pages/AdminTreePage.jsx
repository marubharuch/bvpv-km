// pages/AdminTreePage.jsx
// Admin invite page — /inv_tree
//
// FLOW:
//   1. Pick contact (Contact Picker API) OR enter manually
//   2. Edit name if needed
//   3. Tap "Invite" →
//        - createTree() on FIRST invite (then reuse for session)
//        - saveInvite() → saves name+phone to RTDB treeInvites
//        - buildWhatsAppInvite() → opens WhatsApp directly to that contact
//   4. Admin sees Tree ID + PIN, can invite next person immediately
//
// ONE person at a time. Tree created once per session, reused for all invites.

import { useState } from 'react';
import { useAuth }          from '../store/AuthContext';
import { useContactPicker } from '../hooks/useContactPicker';
import { createTree } from '../db/treeDb';
import { createInvite } from '../db/inviteDb';
import { toFullMobile } from '../lib/phone';
import MobileInput      from '../components/ui/MobileInput';
import { useNavigate }  from 'react-router-dom';

const C = {
  maroon: '#6b1f1f', gold: '#c4993a', border: '#d6c99a',
  cream: '#fefcf5', bg: '#f9f5e7', muted: '#9c7c5a',
  green: '#2e7d32', greenBg: '#e8f5e9',
  red: '#c0392b', redBg: '#fdecea',
};

const labelSt = {
  fontSize: 11, fontWeight: 700, color: C.gold,
  textTransform: 'uppercase', letterSpacing: '1px',
  display: 'block', marginBottom: 6,
};

const inputSt = {
  width: '100%', padding: '11px 14px', borderRadius: 8,
  border: `1.5px solid ${C.border}`, fontSize: 14,
  background: C.bg, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
};

export default function AdminTreePage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { pick, picking, isSupported } = useContactPicker();

  // Contact being invited (reset after each send)
  const [name,    setName]    = useState('');
  const [num,     setNum]     = useState('');
  const [cc,      setCc]      = useState('+91');
  const [err,     setErr]     = useState('');

  // Tree — created once on first invite, reused after
  const [treeId,   setTreeId]   = useState('');
  const [pin,      setPin]      = useState('');
  const [treeName, setTreeName] = useState('');

  // UI
  const [busy,     setBusy]     = useState(false);
  const [lastSent, setLastSent] = useState(null); // { name, phone }
  const [sentList, setSentList] = useState([]);   // all invited this session

  // ── Pick from device contacts ───────────────────────────────────────────
  const handlePick = async () => {
    setErr('');
    const picked = await pick();
    if (!picked.length) return;
    const first = picked[0];
    setName(first.name || '');
    setNum(first.phone || '');
    if (first.countryCode) setCc(first.countryCode);
  };

  // ── Create tree once, reuse after ──────────────────────────────────────
  const getOrCreateTree = async () => {
    if (treeId) return { treeId, pin, treeName };
    if (!user?.uid) throw new Error('Pehle login karo');
    const defaultName = 'Family Tree';
    const result = await createTree(user.uid, defaultName);
    setTreeId(result.treeId);
    setPin(result.pin);
    setTreeName(defaultName);
    return { treeId: result.treeId, pin: result.pin, treeName: defaultName };
  };

  // ── Send invite ─────────────────────────────────────────────────────────
  const handleInvite = async () => {
    setErr('');
    const trimName = name.trim();
    const trimNum  = num.trim();
    if (!trimName)  { setErr('Naam zaroori hai'); return; }
    if (!trimNum)   { setErr('Phone number zaroori hai'); return; }

    const fullPhone = toFullMobile(cc, trimNum);
    if (fullPhone.replace(/\D/g, '').length < 10) {
      setErr('Valid phone number daalo'); return;
    }

    setBusy(true);
    try {
      const { treeId: tid, pin: p, treeName: tn } = await getOrCreateTree();

      // Create one-time 6-digit invite PIN for this person
      const { pin: invitePin } = await createInvite({
        familyId: tid,
        name:     trimName,
        phone:    fullPhone,
        type:     'join',
        sentBy:   user?.uid || null,
        maxUses:  1,
      });

      // Open WhatsApp directly to this contact with their unique PIN
      const joinUrl  = `${window.location.origin}/tree/${tid}?ipin=${invitePin}`;
      const waText   = `🌳 Family Tree mein join karo!\nLink: ${joinUrl}\nPIN: ${invitePin}\n\nLink kholo, PIN daalo aur family tree dekho / edit karo.`;
      const stripped = fullPhone.replace(/\D/g, '');
      window.open(`https://wa.me/${stripped}?text=${encodeURIComponent(waText)}`, '_blank');

      setLastSent({ name: trimName, phone: fullPhone });
      setSentList(prev => [...prev, { name: trimName, phone: fullPhone }]);

      // Reset for next invite
      setName(''); setNum('');

    } catch (e) {
      setErr(e.message || 'Kuch problem aayi. Dobara try karo.');
    } finally {
      setBusy(false);
    }
  };

  const canSend = !!name.trim() && !!num.trim() && !busy;

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: C.cream, border: `2px solid ${C.gold}`,
        borderRadius: 14, padding: '28px 24px',
        maxWidth: 440, width: '100%',
        boxShadow: '0 16px 48px rgba(60,15,15,0.2)',
      }}>

        {/* Header */}
        <h2 style={{
          fontFamily: "'DM Serif Display', serif", fontSize: 20,
          color: C.maroon, marginBottom: 6, textAlign: 'center',
        }}>🌳 Family Tree Invite</h2>
        <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 22 }}>
          Ek vyakti ko invite karo — WhatsApp pe seedha link jayega
        </p>

        {/* Tree badge — appears after first invite */}
        {treeId && (
          <div style={{
            display: 'flex', gap: 10, marginBottom: 18,
            background: C.greenBg, border: '1px solid #a5d6a7',
            borderRadius: 10, padding: '10px 14px',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Tree ID</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.maroon, letterSpacing: 3 }}>{treeId}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px' }}>PIN</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, letterSpacing: 6 }}>{pin}</div>
            </div>
            <button
              onClick={() => navigate(`/tree/${treeId}`)}
              style={{
                alignSelf: 'center', padding: '6px 12px', borderRadius: 6,
                border: 'none', background: C.maroon, color: '#fff',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Tree Kholo
            </button>
          </div>
        )}

        {/* Last sent success */}
        {lastSent && (
          <div style={{
            background: C.greenBg, border: '1px solid #a5d6a7',
            borderRadius: 9, padding: '10px 14px', marginBottom: 16,
            fontSize: 12, color: C.green,
          }}>
            ✅ <strong>{lastSent.name}</strong> ko invite bheja gaya!
            <br />
            <span style={{ fontSize: 11, color: C.muted }}>Agle vyakti ka number daalo ↓</span>
          </div>
        )}

        {/* Contact Picker — Chrome/Android */}
        {isSupported && (
          <button
            onClick={handlePick}
            disabled={picking || busy}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8,
              border: `1.5px dashed ${C.gold}`, background: 'transparent',
              color: C.maroon, fontWeight: 700, fontSize: 13,
              cursor: picking ? 'wait' : 'pointer', marginBottom: 16,
            }}
          >
            {picking ? 'Opening contacts…' : '📱 Phone se Contact Pick karo'}
          </button>
        )}

        {/* Manual entry */}
        <div style={{ marginBottom: 6 }}>
          <label style={labelSt}>Naam</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ramesh Sharma"
            style={{ ...inputSt, marginBottom: 12 }}
          />
          <label style={labelSt}>Mobile Number</label>
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
            color: C.red, fontSize: 12, margin: '10px 0',
            padding: '8px 12px', background: C.redBg, borderRadius: 7,
          }}>{err}</div>
        )}

        {/* Invite button */}
        <button
          onClick={handleInvite}
          disabled={!canSend}
          style={{
            width: '100%', padding: 13, borderRadius: 8, border: 'none',
            background: canSend ? C.maroon : '#ccc',
            color: '#fff', fontWeight: 700, fontSize: 15,
            cursor: canSend ? 'pointer' : 'not-allowed',
            marginTop: 12,
          }}
        >
          {busy ? '⏳ Bhej raha hai…' : '📲 WhatsApp pe Invite Bhejo'}
        </button>

        {/* Sent list for this session */}
        {sentList.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8,
            }}>
              Is session mein invite kiye ({sentList.length})
            </div>
            {sentList.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 0', borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: C.maroon, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {(s.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.maroon }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{s.phone}</div>
                </div>
                <span style={{ fontSize: 11, color: C.green }}>✓ Sent</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
