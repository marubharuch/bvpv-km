// pages/JoinTreePage.jsx
// Handles WhatsApp invite links: /join-tree?treeId=XXXXX&pin=1234
// Also used at /registration and /join routes.
//
// Flow:
//   1. Read treeId + pin from URL query params
//   2. If both present → auto-open tree guest page with PIN pre-filled
//   3. If missing → show manual entry form

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getTree } from '../db/treeDb';

const C = {
  maroon: '#6b1f1f', gold: '#c4993a', border: '#d6c99a',
  cream: '#fefcf5', bg: '#f9f5e7', muted: '#9c7c5a',
};

export default function JoinTreePage() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();

  const [treeId,   setTreeId]   = useState(searchParams.get('treeId') || '');
  const [pin,      setPin]      = useState(searchParams.get('pin')    || '');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');

  // If both treeId and pin came via URL, redirect straight to tree page
  useEffect(() => {
    const tid = searchParams.get('treeId');
    const p   = searchParams.get('pin');
    if (tid && p) {
      navigate(`/tree/${tid}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const handleJoin = async () => {
    if (!treeId.trim()) { setErr('Tree ID daalo'); return; }
    setLoading(true); setErr('');
    try {
      const tree = await getTree(treeId.trim().toUpperCase());
      if (!tree) { setErr('Yeh Tree ID exist nahi karta'); return; }
      navigate(`/tree/${treeId.trim().toUpperCase()}`);
    } catch (e) {
      setErr('Kuch problem aayi. Dobara try karo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: C.cream, border: `2px solid ${C.gold}`,
        borderRadius: 14, padding: '32px 24px',
        maxWidth: 400, width: '100%',
        boxShadow: '0 16px 48px rgba(60,15,15,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>🌳</div>
          <h2 style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 22,
            color: C.maroon, margin: '8px 0 4px',
          }}>Family Tree Join karo</h2>
          <p style={{ fontSize: 12, color: C.muted }}>
            Creator ne diya Tree ID daalo
          </p>
        </div>

        <label style={{
          fontSize: 11, fontWeight: 700, color: C.gold,
          textTransform: 'uppercase', letterSpacing: '1px',
          display: 'block', marginBottom: 6,
        }}>Tree ID</label>
        <input
          value={treeId}
          onChange={e => setTreeId(e.target.value.toUpperCase())}
          placeholder="e.g. AB12CD"
          maxLength={8}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 8,
            border: `1.5px solid ${C.border}`, fontSize: 20,
            textAlign: 'center', letterSpacing: 4, fontWeight: 700,
            background: C.bg, marginBottom: 20, outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {err && (
          <div style={{
            color: '#c0392b', fontSize: 12, marginBottom: 12,
            padding: '8px 12px', background: '#ffeaea', borderRadius: 6,
          }}>{err}</div>
        )}

        <button
          onClick={handleJoin}
          disabled={loading}
          style={{
            width: '100%', padding: 13, borderRadius: 8, border: 'none',
            background: C.maroon, color: '#fff', fontWeight: 700,
            fontSize: 15, cursor: loading ? 'wait' : 'pointer', marginBottom: 10,
          }}
        >
          {loading ? 'Dhundh raha hai…' : '→ Tree Dekho'}
        </button>

        <button
          onClick={() => navigate(-1)}
          style={{
            width: '100%', padding: 10, borderRadius: 8,
            border: `1px solid ${C.border}`, background: 'transparent',
            color: C.muted, fontSize: 13, cursor: 'pointer',
          }}
        >
          Wapas Jao
        </button>
      </div>
    </div>
  );
}
