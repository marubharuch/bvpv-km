// components/EditAddSheet.jsx
// Bottom sheet triggered by tapping any cell in the Lineage Table.
// Two tabs: ✏️ Edit (current person) | ➕ Add (child/sibling/spouse/ancestor)
//
// Props:
//   node     — { name, gender, year, rip, spouse, nodeType, spouseKey, ancIdx, descIdx, sibKey, sibType, sibIdx }
//   treeData — full tree (to read context)
//   onEdit   — (mutations) => void  e.g. editMemberAncestor(0, {name:"..."})
//   onAdd    — (type, data) => void
//   onClose  — () => void

import { useState } from "react";

const mono  = "'JetBrains Mono', monospace";
const serif = "'Playfair Display', serif";
const C = {
  primary:     "#7B1C2E",
  primaryDark: "#5A1020",
  gold:        "#C9A84C",
  goldFaint:   "#FDF6EC",
  border:      "#f0e6e6",
  text:        "#2d1a1e",
  dim:         "#C0A0A0",
  red:         "#C0302A",
  green:       "#2E7D32",
};

// ── Add options per nodeType ──────────────────────────────────────────────────
function getAddOptions(node, treeData) {
  const ancestors = (treeData?.ancestors || []).filter(a => a?.name);
  const options = [];

  if (node.nodeType === "desc" || node.nodeType === "self") {
    options.push({ key:"child",   label:"➕ Add Child",         icon:"👶" });
    options.push({ key:"sibling", label:"➕ Add Sibling",        icon:"🤝" });
    if (!node.spouse) {
      options.push({ key:"spouse", label:"➕ Add Spouse",        icon:"💑" });
    }
  }
  if (node.nodeType === "anc") {
    options.push({ key:"sibling", label:"➕ Add Sibling of "+node.name, icon:"🤝" });
    if (!node.spouse) {
      options.push({ key:"spouse", label:"➕ Add Spouse",        icon:"💑" });
    }
    // Only allow adding ancestor above the topmost one
    if (node.ancIdx === ancestors.length - 1) {
      options.push({ key:"ancestor", label:"➕ Add Ancestor Above", icon:"⬆️" });
    }
  }
  return options;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EditAddSheet({ node, treeData, onEdit, onAdd, onClose }) {
  const [tab,        setTab]        = useState("edit");
  const [addType,    setAddType]    = useState(null);   // child | sibling | spouse | ancestor
  const [sibType,    setSibType]    = useState("younger"); // elder | younger (for sibling add)

  // Form fields — pre-filled from node
  const [name,   setName]   = useState(node?.name   || "");
  const [gender, setGender] = useState(node?.gender || "M");
  const [year,   setYear]   = useState(node?.year   || "");
  const [rip,    setRip]    = useState(node?.rip    || false);

  // Spouse fields
  const [spName,   setSpName]   = useState(node?.spouse?.name   || "");
  const [spGender, setSpGender] = useState(node?.spouse?.gender || (node?.gender === "M" ? "F" : "M"));

  // Add form fields
  const [addName,   setAddName]   = useState("");
  const [addGender, setAddGender] = useState("M");
  const [addYear,   setAddYear]   = useState("");

  const addOptions = getAddOptions(node, treeData);

  // ── Save edit ───────────────────────────────────────────────────────────────
  const handleSaveEdit = () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), gender, year, rip };
    onEdit(node, data, spName.trim() ? { name: spName.trim(), gender: spGender, rip: false } : null);
    onClose();
  };

  // ── Save add ────────────────────────────────────────────────────────────────
  const handleSaveAdd = () => {
    if (!addName.trim()) return;
    onAdd(node, addType, { name: addName.trim(), gender: addGender, year: addYear, rip: false }, sibType);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, background:"rgba(90,16,32,0.25)", zIndex:200,
        animation:"fadeIn 0.2s ease",
      }} />

      {/* Sheet */}
      <div style={{
        position:     "fixed",
        bottom:       0, left:0, right:0,
        background:   "#fff",
        borderRadius: "18px 18px 0 0",
        borderTop:    `2px solid ${C.gold}`,
        padding:      "0 0 40px",
        zIndex:       201,
        maxHeight:    "85vh",
        overflowY:    "auto",
        animation:    "slideUp 0.25s ease",
        boxShadow:    "0 -8px 32px rgba(90,16,32,0.15)",
      }}>

        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 0" }}>
          <div style={{ width:36, height:4, borderRadius:2, background:C.border }} />
        </div>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 18px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:"1.3rem" }}>{node?.gender === "F" ? "👩" : "👨"}</span>
            <div>
              <div style={{ fontFamily:serif, fontSize:"1rem", color:C.primaryDark, fontWeight:700 }}>
                {node?.name}
              </div>
              <div style={{ fontSize:"0.6rem", color:C.dim, fontFamily:mono }}>
                {node?.nodeType === "self" ? "📍 YOU" : node?.relation || node?.nodeType}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"1.1rem", color:C.dim, cursor:"pointer", padding:4 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, margin:"12px 18px 0", gap:4 }}>
          {["edit","add"].map(t => (
            <button key={t} onClick={() => { setTab(t); setAddType(null); }} style={{
              flex:1, padding:"8px 0",
              background:   "none",
              border:       "none",
              borderBottom: tab===t ? `2px solid ${C.gold}` : "2px solid transparent",
              color:        tab===t ? C.primaryDark : C.dim,
              fontSize:     "0.78rem",
              fontWeight:   tab===t ? 700 : 400,
              cursor:       "pointer",
              fontFamily:   mono,
              transition:   "all 0.15s",
            }}>
              {t === "edit" ? "✏️ Edit" : "➕ Add"}
            </button>
          ))}
        </div>

        <div style={{ padding:"16px 18px" }}>

          {/* ── EDIT TAB ── */}
          {tab === "edit" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

              <Field label="Name *">
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Full name" style={inp(name)} />
              </Field>

              <Field label="Gender">
                <GenderPicker value={gender} onChange={setGender} />
              </Field>

              <Field label="Birth Year">
                <input type="number" value={year} onChange={e => setYear(e.target.value)}
                  placeholder="e.g. 1971" min="1800" max="2024" style={inp(true)} />
              </Field>

              <Field label="Status">
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:"0.82rem", color:C.text }}>
                  <input type="checkbox" checked={rip} onChange={e => setRip(e.target.checked)}
                    style={{ width:16, height:16, accentColor:C.primary }} />
                  🪔 Deceased
                </label>
              </Field>

              <div style={{ height:1, background:C.border, margin:"4px 0" }} />

              <Field label={`Spouse of ${node?.name}`}>
                <input value={spName} onChange={e => setSpName(e.target.value)}
                  placeholder="Spouse name (leave blank to remove)" style={inp(true)} />
                {spName && <GenderPicker value={spGender} onChange={setSpGender} label="Spouse gender" />}
              </Field>

              <button onClick={handleSaveEdit} disabled={!name.trim()} style={{
                width:"100%", padding:12, marginTop:4,
                background: name.trim() ? `linear-gradient(135deg,${C.gold},#D4B060)` : C.border,
                border:     "none", borderRadius:10,
                color:      name.trim() ? C.primaryDark : C.dim,
                fontSize:   "0.9rem", fontWeight:700,
                cursor:     name.trim() ? "pointer" : "default",
                fontFamily: "'Lato',sans-serif",
                transition: "all 0.15s",
              }}>
                ✓ Save Changes
              </button>
            </div>
          )}

          {/* ── ADD TAB ── */}
          {tab === "add" && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

              {/* Add type selector */}
              {!addType && (
                <>
                  <div style={{ fontSize:"0.65rem", color:C.dim, fontFamily:mono, marginBottom:4 }}>
                    What would you like to add?
                  </div>
                  {addOptions.map(opt => (
                    <button key={opt.key} onClick={() => setAddType(opt.key)} style={{
                      display:        "flex",
                      alignItems:     "center",
                      gap:            10,
                      padding:        "12px 14px",
                      background:     C.goldFaint,
                      border:         `1.5px solid ${C.border}`,
                      borderLeft:     `3px solid ${C.gold}`,
                      borderRadius:   10,
                      cursor:         "pointer",
                      fontSize:       "0.85rem",
                      color:          C.text,
                      fontFamily:     "'Lato',sans-serif",
                      transition:     "all 0.15s",
                    }}>
                      <span style={{ fontSize:"1.1rem" }}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                  {addOptions.length === 0 && (
                    <p style={{ color:C.dim, fontSize:"0.78rem", textAlign:"center", padding:"16px 0" }}>
                      No add options available for this person.
                    </p>
                  )}
                </>
              )}

              {/* Add form */}
              {addType && (
                <>
                  <button onClick={() => setAddType(null)} style={{
                    background:"none", border:"none", color:C.dim, fontSize:"0.75rem",
                    cursor:"pointer", textAlign:"left", padding:0, fontFamily:mono, marginBottom:4,
                  }}>
                    ← Back
                  </button>

                  <div style={{ fontSize:"0.78rem", fontWeight:700, color:C.primaryDark, fontFamily:mono, marginBottom:8 }}>
                    {addType === "child"    && `👶 Add Child of ${node?.name}`}
                    {addType === "sibling"  && `🤝 Add Sibling of ${node?.name}`}
                    {addType === "spouse"   && `💑 Add Spouse of ${node?.name}`}
                    {addType === "ancestor" && `⬆️ Add Ancestor Above ${node?.name}`}
                  </div>

                  {/* Elder/Younger for sibling */}
                  {addType === "sibling" && (
                    <Field label="Sibling type">
                      <div style={{ display:"flex", gap:8 }}>
                        {["elder","younger"].map(t => (
                          <button key={t} onClick={() => setSibType(t)} style={{
                            flex:1, padding:"8px 0",
                            background:   sibType===t ? `${C.primary}10` : "#fff",
                            border:       `1.5px solid ${sibType===t ? C.primary : C.border}`,
                            borderRadius: 8,
                            color:        sibType===t ? C.primary : C.dim,
                            fontSize:     "0.78rem",
                            fontWeight:   sibType===t ? 700 : 400,
                            cursor:       "pointer",
                            fontFamily:   mono,
                          }}>
                            {t === "elder" ? "⬆️ Elder" : "⬇️ Younger"}
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}

                  <Field label="Name *">
                    <input autoFocus value={addName} onChange={e => setAddName(e.target.value)}
                      placeholder="Full name" style={inp(addName)}
                      onKeyDown={e => e.key === "Enter" && handleSaveAdd()} />
                  </Field>

                  <Field label="Gender">
                    <GenderPicker value={addGender} onChange={setAddGender} />
                  </Field>

                  <Field label="Birth Year (optional)">
                    <input type="number" value={addYear} onChange={e => setAddYear(e.target.value)}
                      placeholder="e.g. 2001" min="1800" max="2030" style={inp(true)} />
                  </Field>

                  <button onClick={handleSaveAdd} disabled={!addName.trim()} style={{
                    width:"100%", padding:12, marginTop:4,
                    background: addName.trim() ? `linear-gradient(135deg,${C.primary},${C.primaryDark})` : C.border,
                    border:     "none", borderRadius:10,
                    color:      addName.trim() ? "#fff" : C.dim,
                    fontSize:   "0.9rem", fontWeight:700,
                    cursor:     addName.trim() ? "pointer" : "default",
                    fontFamily: "'Lato',sans-serif",
                    transition: "all 0.15s",
                  }}>
                    ➕ Add Member
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp  { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn   { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

// ── Small shared components ───────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:"0.62rem", color:C.primary, fontWeight:700,
        letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:5, fontFamily:mono }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function GenderPicker({ value, onChange, label }) {
  return (
    <div style={{ display:"flex", gap:8, marginTop: label ? 6 : 0 }}>
      {[{g:"M",icon:"👨",l:"Male"},{g:"F",icon:"👩",l:"Female"}].map(({g,icon,l}) => (
        <button key={g} onClick={() => onChange(g)} style={{
          flex:1, padding:"8px 0",
          background:   value===g ? `${C.primary}10` : "#fff",
          border:       `1.5px solid ${value===g ? C.primary : C.border}`,
          borderRadius: 8,
          color:        value===g ? C.primary : C.dim,
          fontSize:     "0.78rem",
          fontWeight:   value===g ? 700 : 400,
          cursor:       "pointer",
          fontFamily:   mono,
          transition:   "all 0.15s",
        }}>
          {icon} {l}
        </button>
      ))}
    </div>
  );
}

const inp = (hasValue) => ({
  width:       "100%",
  background:  "#fff",
  border:      `1.5px solid ${hasValue ? C.primary+"40" : C.border}`,
  borderRadius: 8,
  padding:     "10px 12px",
  color:       C.text,
  fontSize:    16,
  fontFamily:  "'Lato',sans-serif",
  outline:     "none",
  display:     "block",
  transition:  "border-color 0.15s",
  boxSizing:   "border-box",
});