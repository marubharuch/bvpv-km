// components/vansh/BranchCard.jsx
// Input card — light cream theme matching app's COLORS.

import { VSC } from "../../constants/vanshConstants";

const mono = "'JetBrains Mono', monospace";

export default function BranchCard({ relation, value = {}, onChange }) {
  const { name = "", gender = "M", year = "", rip = false } = value;
  const set = (field, val) => onChange({ ...value, name, gender, year, rip, [field]: val });

  return (
    <div style={{
      background:   "#fff",
      border:       `1.5px solid ${name ? VSC.gold : VSC.border}`,
      borderLeft:   `3px solid ${name ? VSC.kwColor : VSC.border}`,
      borderRadius: 10,
      padding:      "10px 12px",
      marginBottom: 8,
      boxShadow:    name ? "0 2px 8px rgba(90,16,32,0.07)" : "none",
      transition:   "border-color 0.15s, box-shadow 0.15s",
    }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ flex:1, fontSize:"0.62rem", color: VSC.kwColor, fontFamily: mono, fontWeight: 700 }}>
          {relation}
        </span>
        <button
          onClick={() => set("rip", !rip)}
          style={{
            fontSize:     "0.62rem",
            padding:      "2px 8px",
            border:       `1.5px solid ${rip ? VSC.red : VSC.border}`,
            borderRadius: 8,
            background:   rip ? "#FDE8EC" : "#fff",
            color:        rip ? VSC.red : VSC.dim,
            cursor:       "pointer",
            fontFamily:   mono,
          }}
        >
          {rip ? "🪔 મૃત્યુ" : "🕊️ હયાત"}
        </button>
      </div>

      {/* Gender picker */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
        {[
          { g:"M", icon:"👨", label:"પુરુષ" },
          { g:"F", icon:"👩", label:"મહિલા" },
        ].map(({ g, icon, label }) => {
          const sel = gender === g;
          const col = g === "M" ? VSC.male : VSC.female;
          return (
            <button key={g} onClick={() => set("gender", g)} style={{
              padding:      "8px 6px",
              background:   sel ? (g==="M" ? "rgba(123,28,46,0.07)" : "rgba(155,35,53,0.07)") : "#fff",
              border:       `1.5px solid ${sel ? col : VSC.border}`,
              borderRadius: 8,
              cursor:       "pointer",
              textAlign:    "center",
              transition:   "all 0.13s",
            }}>
              <div style={{ fontSize:"1.1rem" }}>{icon}</div>
              <div style={{ fontSize:"0.62rem", color: sel ? col : VSC.dim, marginTop:2, fontFamily: mono }}>{label}</div>
            </button>
          );
        })}
      </div>

      {/* Name input */}
      <input
        type="text"
        value={name}
        onChange={e => set("name", e.target.value)}
        placeholder="નામ (ખાલી = skip)"
        style={{
          width:"100%", background:"#fff",
          border:`1.5px solid ${name ? VSC.gold : VSC.border}`,
          borderRadius:8, padding:"9px 12px",
          color: VSC.text, fontSize:16,
          fontFamily:"'Lato', sans-serif",
          outline:"none", marginBottom:6, display:"block",
          transition:"border-color 0.15s",
        }}
      />

      {/* Year input */}
      <input
        type="number"
        value={year}
        onChange={e => set("year", e.target.value)}
        placeholder="જન્મ વર્ષ (વૈ.)"
        min="1850" max="2024"
        style={{
          width:"100%", background:"#fff",
          border:`1.5px solid ${VSC.border}`,
          borderRadius:8, padding:"8px 12px",
          color: VSC.numColor, fontSize:14,
          fontFamily: mono, outline:"none", display:"block",
        }}
      />
    </div>
  );
}
