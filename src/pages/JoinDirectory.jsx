// pages/Tree/JoinDirectory.jsx
// Tree guest → Directory user registration
// PIN already verified hai — sirf details fill karo

import { useState }  from 'react';
import { getAuth, createUserWithEmailAndPassword,
         signInAnonymously, updateProfile } from 'firebase/auth';
import { registerTreeGuestAsUser } from '../db/treeDb'; // treeDb.js ke functions


const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a', green:'#2e7d32',
};

export default function JoinDirectory({ treeId, phone, name: initName, onSuccess, onSkip }) {
  const [name,    setName]    = useState(initName || '');
  const [email,   setEmail]   = useState('');
  const [city,    setCity]    = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setErr('Naam daalo'); return; }
    setLoading(true); setErr('');

    try {
      const auth = getAuth();
      let uid;

      // Firebase Auth account banao
      if (email.trim()) {
        // Email se account — temporary password (user baad mein set karega)
        const tempPass = `Tree${Date.now()}!`;
        try {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), tempPass);
          uid = cred.user.uid;
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch (e) {
          if (e.code === 'auth/email-already-in-use') {
            setErr('Yeh email already registered hai. Login karo.');
            setLoading(false); return;
          }
          throw e;
        }
      } else {
        // Email nahi diya — anonymous account
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
      }

      // RTDB mein save karo
      await registerTreeGuestAsUser(uid, treeId, {
        name:  name.trim(),
        phone,
        email: email.trim(),
        city:  city.trim(),
      });

      onSuccess({ uid, name: name.trim() });
    } catch (e) {
      console.error(e);
      setErr('Kuch problem aayi. Dobara try karo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:400,
      background:'rgba(60,15,15,0.8)',backdropFilter:'blur(6px)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:C.cream,border:`2px solid ${C.gold}`,
        borderRadius:12,padding:'32px 24px',maxWidth:420,width:'100%',
        boxShadow:'0 24px 64px rgba(60,15,15,0.4)'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:40,marginBottom:8}}>🌳→📋</div>
          <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,
            color:C.maroon,margin:'0 0 6px'}}>
            Directory mein join karo
          </h2>
          <p style={{fontSize:12,color:C.muted,margin:0,lineHeight:1.6}}>
            Apni details bharo — aap community directory mein dikh jayenge
          </p>
        </div>

        {/* Phone — read only, already verified */}
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Mobile Number</label>
          <div style={{padding:'10px 14px',background:'#f0ede6',
            border:`1px solid ${C.border}`,borderRadius:7,
            fontSize:14,color:C.muted,display:'flex',
            alignItems:'center',gap:8}}>
            <span style={{fontSize:16}}>✓</span>
            <span style={{fontWeight:600,color:C.maroon}}>{phone}</span>
            <span style={{fontSize:11}}>(verified)</span>
          </div>
        </div>

        {/* Naam */}
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Aapka Naam *</label>
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="Poora naam"
            style={inputStyle}/>
        </div>

        {/* Email */}
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Email <span style={{color:C.muted,fontWeight:400}}>(optional)</span></label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="email@example.com"
            style={inputStyle}/>
          <div style={{fontSize:10,color:C.muted,marginTop:4}}>
            Email doge to login kar sakte ho
          </div>
        </div>

        {/* City */}
        <div style={{marginBottom:20}}>
          <label style={labelStyle}>Shahar / City *</label>
          <input value={city} onChange={e=>setCity(e.target.value)}
            placeholder="e.g. Surat, Ahmedabad, Mumbai"
            style={inputStyle}/>
        </div>

        {err && (
          <div style={{color:'#c0392b',fontSize:12,marginBottom:12,
            padding:'8px 12px',background:'#ffeaea',borderRadius:6}}>
            {err}
          </div>
        )}

        {/* Buttons */}
        <button onClick={handleSubmit} disabled={loading}
          style={{width:'100%',padding:'13px 0',borderRadius:8,
            border:'none',background:C.maroon,color:'#fff',
            fontWeight:700,fontSize:15,cursor:'pointer',marginBottom:8}}>
          {loading ? 'Ho raha hai…' : '✓ Directory mein Join karo'}
        </button>

        <button onClick={onSkip}
          style={{width:'100%',padding:'10px 0',borderRadius:8,
            border:`1px solid ${C.border}`,background:'transparent',
            color:C.muted,fontSize:13,cursor:'pointer'}}>
          Baad mein
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize:11, fontWeight:700, color:C.gold,
  textTransform:'uppercase', letterSpacing:'1px',
  display:'block', marginBottom:6,
};

const inputStyle = {
  width:'100%', padding:'10px 14px',
  border:`1.5px solid #d6c99a`, borderRadius:7,
  fontSize:14, background:'#fefcf5', outline:'none',
  fontFamily:'inherit',
};