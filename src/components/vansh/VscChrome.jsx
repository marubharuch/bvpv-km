// components/vansh/VscChrome.jsx
// Chrome elements — light cream theme matching app's COLORS exactly.

import { VSC, TAB_LABELS } from "../../constants/vanshConstants";

const mono = "'JetBrains Mono', monospace";

// ── Title Bar — maroon gradient (matches AppLayout header) ────────
export function VscTitlebar() {
  return (
    <div style={{
      height:       38,
      background:   "linear-gradient(135deg,#5A1020,#7B1C2E,#9B2335)",
      borderBottom: "1px solid rgba(201,168,76,0.4)",
      boxShadow:    "0 2px 12px rgba(90,16,32,0.3)",
      display:      "flex",
      alignItems:   "center",
      padding:      "0 14px",
      gap:          10,
      flexShrink:   0,
      position:     "relative",
    }}>
      {/* Gold top line (matches AppLayout) */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 2, background: VSC.gold,
      }} />
      {/* Traffic lights */}
      <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
        {["#ff5f56","#ffbd2e","#27c93f"].map((c,i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
        ))}
      </div>
      {/* Title */}
      <div style={{
        position:      "absolute",
        left:          "50%",
        transform:     "translateX(-50%)",
        fontSize:      "0.72rem",
        color:         VSC.goldBright,
        fontFamily:    mono,
        whiteSpace:    "nowrap",
        letterSpacing: "0.03em",
      }}>
        🌳 વંશ વૃક્ષ — Family Tree Builder
      </div>
    </div>
  );
}

// ── Tabs — cream bg, maroon active indicator ───────────────────────
export function VscTabs({ currentStep, onJump }) {
  return (
    <div style={{
      background:     "#fff",
      borderBottom:   `2px solid ${VSC.border}`,
      display:        "flex",
      overflowX:      "auto",
      flexShrink:     0,
      scrollbarWidth: "none",
    }}>
      {TAB_LABELS.map((tab, i) => {
        const stepNum  = i + 1;
        const isActive = stepNum === currentStep;
        const isDone   = stepNum < currentStep;
        return (
          <button
            key={stepNum}
            onClick={() => onJump(stepNum)}
            style={{
              flexShrink:   0,
              height:       36,
              padding:      "0 12px",
              display:      "flex",
              alignItems:   "center",
              gap:          4,
              fontSize:     "0.65rem",
              color:        isActive ? VSC.kwColor : VSC.dim,
              background:   isActive ? VSC.bg : "#fff",
              borderRight:  `1px solid ${VSC.border}`,
              borderTop:    "none",
              borderLeft:   "none",
              borderBottom: isActive ? `2px solid ${VSC.kwColor}` : "2px solid transparent",
              cursor:       stepNum <= currentStep ? "pointer" : "default",
              opacity:      stepNum > currentStep ? 0.4 : 1,
              whiteSpace:   "nowrap",
              fontFamily:   mono,
              fontWeight:   isActive ? 700 : 400,
              position:     "relative",
              marginBottom: "-2px",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
            <span style={{ fontSize: "0.5rem", color: VSC.dim }}>{tab.ext}</span>
            {isDone && (
              <span style={{
                position: "absolute", top: 5, right: 6,
                width: 5, height: 5, borderRadius: "50%",
                background: VSC.green,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Progress Bar — gold fill on cream ─────────────────────────────
export function VscProgressBar({ currentStep, totalSteps }) {
  return (
    <div style={{
      background:   "#fff",
      borderBottom: `1px solid ${VSC.border}`,
      padding:      "6px 14px",
      display:      "flex",
      alignItems:   "center",
      gap:          10,
      flexShrink:   0,
    }}>
      <div style={{ display: "flex", gap: 3, flex: 1 }}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const n = i + 1;
          return (
            <div key={n} style={{
              flex:         1,
              height:       3,
              borderRadius: 2,
              background:   n < currentStep  ? VSC.goldDark
                          : n === currentStep ? VSC.gold
                          : VSC.border,
              transition:   "background 0.25s",
            }} />
          );
        })}
      </div>
      <span style={{
        fontSize:   "0.58rem",
        color:      VSC.dim,
        fontFamily: mono,
        whiteSpace: "nowrap",
      }}>
        {currentStep} / {totalSteps}
      </span>
    </div>
  );
}

// ── Status Bar — gold line on maroon (matches BottomNavbar style) ─
export function VscStatusBar({ memberCount }) {
  return (
    <div style={{
      flexShrink:  0,
      height:      24,
      background:  "linear-gradient(135deg,#5A1020,#7B1C2E)",
      borderTop:   "1px solid rgba(201,168,76,0.3)",
      display:     "flex",
      alignItems:  "center",
      padding:     "0 12px",
      gap:         14,
      fontSize:    "0.58rem",
      color:       "rgba(240,208,128,0.75)",
      fontFamily:  mono,
    }}>
      <span>🌿 main</span>
      <span>⚡ vansh-vriksha</span>
      <span>👥 {memberCount} members</span>
      <span style={{ marginLeft: "auto" }}>TypeScript · UTF-8</span>
    </div>
  );
}

// ── Bottom Action Bar — maroon gradient (matches BottomNavbar) ────
export function VscBottomBar({ currentStep, totalSteps, onBack, onNext, saving = false }) {
  return (
    <div style={{
      position:    "fixed",
      bottom:      0,
      left:        0,
      right:       0,
      background:  "linear-gradient(135deg,#5A1020,#7B1C2E)",
      borderTop:   "1px solid rgba(201,168,76,0.4)",
      boxShadow:   "0 -4px 20px rgba(90,16,32,0.35)",
      padding:     "8px 14px",
      display:     "flex",
      gap:         8,
      zIndex:      50,
    }}>
      {currentStep > 1 && (
        <button
          onClick={onBack}
          style={{
            padding:      "10px 16px",
            background:   "rgba(201,168,76,0.12)",
            border:       "1px solid rgba(201,168,76,0.35)",
            borderRadius: 10,
            color:        VSC.goldBright,
            fontSize:     "0.8rem",
            cursor:       "pointer",
            fontFamily:   mono,
          }}
        >
          ← પાછળ
        </button>
      )}
      <button
        onClick={onNext}
        style={{
          flex:          1,
          padding:       11,
          background:    `linear-gradient(135deg,${VSC.gold},${VSC.goldBright})`,
          border:        "none",
          borderRadius:  10,
          color:         "#4a0f1a",
          fontSize:      "0.88rem",
          fontWeight:    700,
          cursor:        "pointer",
          fontFamily:    mono,
          letterSpacing: "0.03em",
          boxShadow:     "0 2px 8px rgba(201,168,76,0.4)",
        }}
      >
        {currentStep === totalSteps ? "✓ Tree સાચવો" : "આગળ →"}
      </button>
    </div>
  );
}
