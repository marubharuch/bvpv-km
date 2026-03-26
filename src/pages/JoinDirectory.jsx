// pages/JoinDirectory.jsx
// Tree guest → Directory user registration
// PIN already verified — fill details and create/link Firebase Auth account.
//
// OUR PLAN: Closed invite system — no anonymous accounts.
//
// CASES handled:
//   A. User already logged in (Google/Email) → skip auth creation, just save RTDB
//   B. User provides email → createUserWithEmailAndPassword
//   C. No email → save RTDB only (no Firebase Auth account created)
//      User can register later via Google/Email from profile page

import { useState }  from 'react';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { registerTreeGuestAsUser } from '../db/treeDb';
import { saveUserMobile }          from '../db/userDb';
import { toFullMobile, splitMobile } from '../lib/phone';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a',
};

export default function JoinDirectory({ treeId, phone, name: initName, onSuccess, onSkip }) {
  const [name,    setName]    = useState(initName || '');
  const [email,   setEmail]   = useState('');
  const [city,    setCity]    = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setErr('નામ નાખો'); return; }
    if (!city.trim()) { setErr('શહેર નાખો'); return; }
    setLoading(true); setErr('');

    try {
      const auth        = getAuth();
      const currentUser = auth.currentUser;
      let uid = null;

      // ── CASE A: Already logged in (Google or Email) ───────────────────────
      if (currentUser) {
        uid = currentUser.uid;

        // If Google user has no mobile saved, save it now
        if (phone && currentUser.uid) {
          const { countryCode } = splitMobile(phone);
          await saveUserMobile(currentUser.uid, phone, countryCode || '+91').catch(console.warn);
        }

      // ── CASE B: Email provided → create Firebase Auth account ─────────────
      } else if (email.trim()) {
        // Generate a secure temp password — user will use Google or
        // "forgot password" to set their own password later
        const tempPass = `FT_${Date.now()}_${Math.random().toString(36).slice(2,8)}!`;
        try {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), tempPass);
          uid = cred.user.uid;
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch (e) {
          if (e.code === 'auth/email-already-in-use') {
            setErr('આ email already registered છે. Login કરો અને tree ખોલો.');
            setLoading(false); return;
          }
          throw e;
        }

      // ── CASE C: No email — save RTDB data only, no Firebase Auth account ──
      // uid = null, data saved with phone as key
      // User can register later via Google/Email from their profile
      } else {
        uid = null; // intentional — RTDB only
      }

      // ── Save to RTDB ──────────────────────────────────────────────────────
      const { countryCode } = splitMobile(phone || '');
      const result = await registerTreeGuestAsUser(uid, treeId, {
        name:        name.trim(),
        phone:       phone || '',
        countryCode: countryCode || '+91',
        email:       email.trim(),
        city:        city.trim(),
      });

      onSuccess({
        uid,
        name:        name.trim(),
        wasExisting: result.wasExisting,
        familyId:    result.familyId,
      });

    } catch (e) {
      console.error('[JoinDirectory]', e);
      setErr('કોઈ problem આવી. ફરી try કરો.');
    } finally {
      setLoading(false);
    }
  };

  const auth        = getAuth();
  const currentUser = auth.currentUser;
  const isLoggedIn  = !!currentUser;

  return (
    <div style={{position:'fixed',inset:0,zIndex:400,
      background:'rgba(60,15,15,0.8)',backdropFilter:'blur(6px)',
      display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:C.cream,border:`2px solid ${C.gold}`,
        borderRadius:'16px 16px 0 0',padding:'28px 24px 36px',
        maxWidth:480,width:'100%',
        boxShadow:'0 -8px 32px rgba(60,15,15,0.3)'}}>

        {/* Handle bar */}
        <div style={{width:40,height:4,borderRadius:2,background:C.border,
          margin:'0 auto 20px'}} />

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:20}}>
          <div style={{fontSize:36,marginBottom:8}}>🌳</div>
          <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,
            color:C.maroon,margin:'0 0 6px'}}>
            Directory માં જોડાઓ
          </h2>
          <p style={{fontSize:12,color:C.muted,margin:0,lineHeight:1.6}}>
            Family directory માં દેખાશો — members તમને contact કરી શકશે
          </p>
        </div>

        {/* Phone — read only, already verified */}
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Mobile Number</label>
          <div style={{padding:'10px 14px',background:'#f0ede6',
            border:`1px solid ${C.border}`,borderRadius:8,
            fontSize:14,color:C.muted,display:'flex',
            alignItems:'center',gap:8}}>
            <span style={{color:'#2e7d32',fontSize:16}}>✓</span>
            <span style={{fontWeight:600,color:C.maroon}}>{phone}</span>
            <span style={{fontSize:11}}>(verified)</span>
          </div>
        </div>

        {/* Name */}
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>નામ *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="પૂરું નામ"
            style={inputStyle}/>
        </div>

        {/* City */}
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>શહેર *</label>
          <input value={city} onChange={e => setCity(e.target.value)}
            placeholder="દા.ત. સુરત, અમદાવાદ, મુંબઈ"
            style={inputStyle}/>
        </div>

        {/* Email — only show if NOT already logged in */}
        {!isLoggedIn && (
          <div style={{marginBottom:20}}>
            <label style={labelStyle}>
              Email{" "}
              <span style={{color:C.muted,fontWeight:400,textTransform:'none',
                letterSpacing:0}}>(optional — permanent login માટે)</span>
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              style={inputStyle}/>
            {!email && (
              <p style={{fontSize:11,color:C.muted,marginTop:4}}>
                Email વગર પણ data save થશે — Google/Email login પછી permanent access મળશે
              </p>
            )}
          </div>
        )}

        {/* Already logged in info */}
        {isLoggedIn && (
          <div style={{marginBottom:16,padding:'10px 14px',
            background:'#f0f9f0',border:'1px solid #c3e6cb',
            borderRadius:8,fontSize:12,color:'#2e7d32'}}>
            ✓ {currentUser.email || 'Logged in'} — already registered
          </div>
        )}

        {err && (
          <div style={{color:'#c0392b',fontSize:12,marginBottom:12,
            padding:'8px 12px',background:'#ffeaea',borderRadius:6}}>
            {err}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{width:'100%',padding:'14px 0',borderRadius:10,
            border:'none',background:C.maroon,color:'#fff',
            fontWeight:700,fontSize:15,cursor:'pointer',marginBottom:10}}>
          {loading ? 'Save થઈ રહ્યું છે…' : '✓ Directory માં Join કરો'}
        </button>

        <button onClick={onSkip}
          style={{width:'100%',padding:'10px 0',borderRadius:10,
            border:`1.5px solid ${C.border}`,background:'transparent',
            color:C.muted,fontSize:13,cursor:'pointer'}}>
          પછી
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize:11, fontWeight:700, color:'#c4993a',
  textTransform:'uppercase', letterSpacing:'1px',
  display:'block', marginBottom:6,
};

const inputStyle = {
  width:'100%', padding:'11px 14px',
  border:'1.5px solid #d6c99a', borderRadius:8,
  fontSize:14, background:'#fefcf5', outline:'none',
  fontFamily:'inherit', boxSizing:'border-box',
};