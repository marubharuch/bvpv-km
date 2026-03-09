// pages/VanshVriksha/steps/AncestorsStep.jsx — Steps 2 & 3
// Step 2: starts with 1 slot. Typing in the last slot auto-adds a new empty one.

import { useCallback } from "react";
import BranchCard from "../../../components/vansh/BranchCard";
import { VSC, ANC_RELATIONS, DESC_RELATIONS } from "../../../constants/vanshConstants";

const mono = "'JetBrains Mono', monospace";

// ── Step 2: Ancestors ─────────────────────────────────────────────
export default function AncestorsStep({ ancestors, onChange }) {
  // Always show saved entries, but minimum 1 slot
  const list = ancestors.length > 0 ? ancestors : [{}];

  const update = useCallback((idx, val) => {
    const next = [...list];
    next[idx] = val;
    // If user started typing in the last slot, append a new empty one
    if (idx === next.length - 1 && (val.name || val.year)) {
      next.push({});
    }
    onChange(next);
  }, [list, onChange]);

  return (
    <div style={wrap}>
      <StepBadge>Step 2 of 8</StepBadge>
      <h2 style={h2}>ઉપરની શાખા</h2>
      <p style={sub}>પૂર્વજોની માહિતી — પિતા, દાદા, પરદાદા...<br/>જેટલી ખબર હોય તેટલી ભરો</p>
      <InfoBox>💡 નામ ખબર ન હોય? ખાલી છોડો. છેલ્લા slot માં ભરો એટલે નવો આવે.</InfoBox>
      {list.map((item, i) => (
        <BranchCard
          key={i}
          relation={ANC_RELATIONS[i] || `ancestor+${i+1}`}
          value={item}
          onChange={val => update(i, val)}
        />
      ))}
    </div>
  );
}

// ── Step 3: Descendants ───────────────────────────────────────────
export function DescendantsStep({ descendants, onChange }) {
  const list = descendants.length > 0 ? descendants : [{}];

  const update = (idx, val) => {
    const next = [...list];
    next[idx] = val;
    if (idx === next.length - 1 && (val.name || val.year)) {
      next.push({});
    }
    onChange(next);
  };

  return (
    <div style={wrap}>
      <StepBadge>Step 3 of 8</StepBadge>
      <h2 style={h2}>નીચેની શાખા</h2>
      <p style={sub}>સંતાન, પૌત્ર, પ્રપૌત્ર... ની માહિતી ભરો</p>
      <InfoBox>💡 સંતાન ન હોય? "આગળ" દબાવો. છેલ્લા slot માં ભરો એટલે નવો આવે.</InfoBox>
      {list.map((item, i) => (
        <BranchCard
          key={i}
          relation={DESC_RELATIONS[i] || `gen+${i+1}`}
          value={item}
          onChange={val => update(i, val)}
        />
      ))}
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────
const wrap = { padding: "16px 14px 100px", background: VSC.bg, minHeight: "100%" };
const h2   = { fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: VSC.text, marginBottom: 4 };
const sub  = { fontSize: "0.78rem", color: VSC.dim, marginBottom: 16, lineHeight: 1.5 };

function StepBadge({ children }) {
  return <span style={{
    display: "inline-block", fontSize: "0.68rem", fontWeight: 700,
    letterSpacing: "0.12em", padding: "3px 10px", borderRadius: 20,
    background: `${VSC.kwColor}12`, color: VSC.kwColor, marginBottom: 10, fontFamily: mono,
  }}>{children}</span>;
}
function InfoBox({ children }) {
  return <div style={{
    background: `${VSC.kwColor}08`, border: `1px solid ${VSC.border}`,
    borderLeft: `3px solid ${VSC.gold}`, borderRadius: 8,
    padding: "9px 12px", marginBottom: 14,
    fontSize: "0.75rem", color: VSC.textSecondary, lineHeight: 1.6,
    fontFamily: "'Lato',sans-serif",
  }}>{children}</div>;
}
