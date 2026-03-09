// pages/VanshVriksha/steps/SelfStep.jsx — Step 1

import { useState } from "react";
import { VSC } from "../../../constants/vanshConstants";

const mono = "'JetBrains Mono', monospace";

export default function SelfStep({ self, onChange }) {
  const [nameErr, setNameErr] = useState(false);
  const set = (field, val) => { onChange({ ...self, [field]: val }); if (field==="name") setNameErr(!val.trim()); };

  return (
    <div style={{ padding:"16px 14px 100px", background: VSC.bg, minHeight:"100%" }}>
      <StepBadge>Step 1 of 8</StepBadge>
      <h2 style={h2}>આપનો પરિચય</h2>
      <p style={sub}>Tree બનાવવા માટે પહેલાં તમારી માહિતી ભરો</p>

      <Field label="તમારું પૂરું નામ *">
        <input type="text" value={self.name} onChange={e=>set("name",e.target.value)}
          placeholder="દા.ત. રાહુલ પટેલ"
          style={{ ...input, borderColor: nameErr ? VSC.red : self.name ? VSC.gold : VSC.border }} />
        {nameErr && <Err>નામ ભરો</Err>}
      </Field>

      <Field label="લિંગ *">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[{g:"M",icon:"👨",label:"પુરુષ"},{g:"F",icon:"👩",label:"મહિલા"}].map(({g,icon,label})=>{
            const sel = self.gender === g;
            const col = g==="M" ? VSC.male : VSC.female;
            return (
              <button key={g} onClick={()=>set("gender",g)} style={{
                padding:"12px 8px", background: sel?"rgba(123,28,46,0.06)":"#fff",
                border:`1.5px solid ${sel?col:VSC.border}`, borderRadius:10,
                cursor:"pointer", textAlign:"center", transition:"all 0.15s",
              }}>
                <div style={{fontSize:"1.5rem"}}>{icon}</div>
                <div style={{fontSize:"0.75rem",color:sel?col:VSC.dim,marginTop:3,fontFamily:mono}}>{label}</div>
              </button>
            );
          })}
        </div>
        {!self.gender && <Err>લિંગ પસંદ કરો</Err>}
      </Field>

      <Field label="જન્મ વર્ષ (વૈકલ્પિક)">
        <input type="number" value={self.year} onChange={e=>set("year",e.target.value)}
          placeholder="દા.ત. 1985" min="1900" max="2024" style={input} />
      </Field>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────
const h2  = { fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color: VSC.text, marginBottom:4 };
const sub = { fontSize:"0.78rem", color: VSC.dim, marginBottom:20, lineHeight:1.5 };
const input = {
  width:"100%", background:"#fff", border:`1.5px solid ${VSC.border}`,
  borderRadius:10, padding:"11px 14px", color: VSC.text, fontSize:16,
  fontFamily:"'Lato',sans-serif", outline:"none", display:"block", transition:"border-color 0.15s",
};

function StepBadge({ children }) {
  return (
    <span style={{
      display:"inline-block", fontSize:"0.68rem", fontWeight:700,
      letterSpacing:"0.12em", padding:"3px 10px", borderRadius:20,
      background:`${VSC.kwColor}12`, color: VSC.kwColor,
      marginBottom:10, fontFamily: mono,
    }}>{children}</span>
  );
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:"0.7rem", color: VSC.kwColor,
        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6,
        fontFamily: mono, fontWeight:700 }}>{label}</label>
      {children}
    </div>
  );
}
function Err({ children }) {
  return <p style={{ fontSize:"0.65rem", color: VSC.red, marginTop:4, fontFamily: mono }}>⚠ {children}</p>;
}
