// pages/Tree/JoinDirectory.jsx
//
// Registration popup shown AFTER phone + PIN verified.
// Person's name is already known from invited[] list.
//
// ── 3 Auth options ────────────────────────────────────────────────────────────
//   1. Google Sign-In          → best, links to Google account
//   2. Email + Password        → good, can log in later from any device
//   3. Continue anonymously    → silent, no form, instant — uses name from invite
//
// ── What this does after auth ─────────────────────────────────────────────────
//   - Saves user profile to RTDB users/{uid}
//   - Links tree to user in RTDB userTrees/{uid}/{treeId}
//   - Marks treeEditors entry as isUser: true
//   - Calls onSuccess() → parent gives edit access

import { useState } from 'react';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
} from 'firebase/auth';
import { registerTreeGuestAsUser } from '../../db/treeDb';

const C = {
  maroon: '#6b1f1f', gold: '#c4993a', border: '#d6c99a',
  cream: '#fefcf5', bg: '#f9f5e7', muted: '#9c7c5a', green: '#2e7d32',
};

const s = {
  label: {
    fontSize: 11, fontWeight: 700, color: C.gold,
    textTransform: 'uppercase', letterSpacing: '1px',
    display: 'block', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '10px 14px',
    border: `1.5px solid ${C.border}`, borderRadius: 7,
    fontSize: 14, background: C.cream, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  },
};

export default function JoinDirectory({ treeId, phone, name: invitedName, onSuccess, onSkip }) {
  // 'choose' | 'email'
  const [screen,  setScreen]  = useState('choose');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [isLogin, setIsLogin] = useState(false);  // toggle between signup/login
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  // ── After any auth method succeeds, save to DB and call onSuccess ──────────
  const afterAuth = async (firebaseUser) => {
    try {
      const name = invitedName || firebaseUser.displayName || 'Family Member';
      await registerTreeGuestAsUser(firebaseUser.uid, treeId, {
        name,
        phone,
        email: firebaseUser.email || '',
      });
      onSuccess({ uid: firebaseUser.uid, name });
    } catch (e) {
      console.error('afterAuth error:', e);
      setErr('Account bana par data save nahi hua. Dobara try karo.');
    }
  };

  // ── 1. Google Sign-In ──────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); setErr('');
    try {
      const auth     = getAuth();
      const provider = new GoogleAuthProvider();
      const cred     = await signInWithPopup(auth, provider);
      await afterAuth(cred.user);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setErr('Google sign-in fail hua. Dobara try karo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 2. Email + Password ────────────────────────────────────────────────────
  const handleEmail = async () => {
    if (!email.trim())   { setErr('Email daalo'); return; }
    if (pass.length < 6) { setErr('Password kam se kam 6 characters ka ho'); return; }
    setLoading(true); setErr('');
    try {
      const auth = getAuth();
      let cred;
      if (isLogin) {
        // Existing user logging in
        cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      } else {
        // New user registering
        cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
        await updateProfile(cred.user, { displayName: invitedName || 'Family Member' });
      }
      await afterAuth(cred.user);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        setErr('Yeh email already registered hai — neeche Login karo.');
        setIsLogin(true);
      } else if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        setErr('Email ya password galat hai.');
      } else {
        setErr('Kuch problem aayi: ' + e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 3. Anonymous — silent, no form, uses invited name ─────────────────────
  const handleAnonymous = async () => {
    setLoading(true); setErr('');
    try {
      const auth = getAuth();
      const cred = await signInAnonymously(auth);
      await afterAuth(cred.user);
    } catch (e) {
      setErr('Kuch problem aayi. Dobara try karo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Overlay wrapper ────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(60,15,15,0.82)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: C.cream, border: `2px solid ${C.gold}`,
        borderRadius: 16, padding: '28px 24px',
        maxWidth: 400, width: '100%',
        boxShadow: '0 24px 64px rgba(60,15,15,0.4)',
      }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 42 }}>👋</div>
          <h2 style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 21,
            color: C.maroon, margin: '8px 0 4px',
          }}>
            Welcome{invitedName ? `, ${invitedName}!` : '!'}
          </h2>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Account banao — family tree edit karo aur apni pehchaan bachao.
          </p>
        </div>

        {/* ── Phone confirmed badge ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#e8f5e9', border: '1px solid #a5d6a7',
          borderRadius: 8, padding: '8px 12px', marginBottom: 18,
        }}>
          <span style={{ fontSize: 16 }}>✓</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2e7d32' }}>
            {phone}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}> verified</span>
        </div>

        {err && (
          <div style={{
            color: '#c0392b', fontSize: 12, marginBottom: 14,
            padding: '8px 12px', background: '#ffeaea', borderRadius: 7,
          }}>{err}</div>
        )}

        {/* ══ SCREEN: choose ══════════════════════════════════════════════════ */}
        {screen === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Google */}
            <button onClick={handleGoogle} disabled={loading} style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 14, fontWeight: 700, color: '#3c4043',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>
              {/* Google G icon */}
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Google se Continue karo
            </button>

            {/* Email */}
            <button onClick={() => { setScreen('email'); setErr(''); }} disabled={loading} style={{
              width: '100%', padding: '12px 0', borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: '#fff',
              fontSize: 14, fontWeight: 700, color: C.maroon,
              cursor: loading ? 'wait' : 'pointer',
            }}>
              ✉️ Email se Continue karo
            </button>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0',
            }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 11, color: C.muted }}>ya</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Anonymous — no form, instant */}
            <button onClick={handleAnonymous} disabled={loading} style={{
              width: '100%', padding: '11px 0', borderRadius: 10,
              border: `1.5px dashed ${C.border}`, background: 'transparent',
              fontSize: 13, fontWeight: 600, color: C.muted,
              cursor: loading ? 'wait' : 'pointer',
            }}>
              {loading ? 'Please wait…' : '→ Abhi ke liye bina account ke continue karo'}
            </button>

            {/* Skip entirely */}
            <button onClick={onSkip} disabled={loading} style={{
              background: 'none', border: 'none',
              fontSize: 11, color: C.muted, cursor: 'pointer',
              textDecoration: 'underline', marginTop: 2,
            }}>
              Baad mein
            </button>
          </div>
        )}

        {/* ══ SCREEN: email ═══════════════════════════════════════════════════ */}
        {screen === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Login / Signup toggle */}
            <div style={{
              display: 'flex', background: '#f0ede6',
              borderRadius: 8, padding: 3, marginBottom: 4,
            }}>
              {[false, true].map(login => (
                <button key={String(login)} onClick={() => { setIsLogin(login); setErr(''); }} style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, border: 'none',
                  background: isLogin === login ? C.maroon : 'transparent',
                  color: isLogin === login ? '#fff' : C.muted,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  {login ? 'Login' : 'New Account'}
                </button>
              ))}
            </div>

            <div>
              <label style={s.label}>Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                style={s.input}
                autoFocus
              />
            </div>

            <div>
              <label style={s.label}>Password</label>
              <input
                type="password" value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder={isLogin ? 'Aapka password' : 'Naya password (min 6 chars)'}
                style={s.input}
                onKeyDown={e => e.key === 'Enter' && handleEmail()}
              />
            </div>

            <button onClick={handleEmail} disabled={loading} style={{
              width: '100%', padding: 13, borderRadius: 10, border: 'none',
              background: C.maroon, color: '#fff',
              fontWeight: 700, fontSize: 14,
              cursor: loading ? 'wait' : 'pointer',
            }}>
              {loading ? 'Please wait…' : isLogin ? '→ Login karo' : '→ Account banao'}
            </button>

            <button onClick={() => { setScreen('choose'); setErr(''); }} style={{
              background: 'none', border: 'none',
              fontSize: 12, color: C.muted, cursor: 'pointer',
              textDecoration: 'underline',
            }}>
              ← Wapas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
