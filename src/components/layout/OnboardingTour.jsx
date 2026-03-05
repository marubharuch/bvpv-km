// ─── OnboardingTour.jsx ───────────────────────────────────────────────────────
// Usage:
//   <OnboardingTour steps={TOUR_STEPS} onFinish={() => setTourActive(false)} />
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

// ── Tooltip position calculator ───────────────────────────────────────────────
function getTooltipStyle(rect) {
  const vw       = window.innerWidth;
  const vh       = window.innerHeight;
  const tooltipW = Math.min(vw - 32, 320);
  const tooltipH = 220;

  if (!rect) return { top: vh / 2 - tooltipH / 2, left: (vw - tooltipW) / 2, width: tooltipW };

  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;

  let top;
  if (spaceAbove >= tooltipH + 12) {
    // Element ની ઉપર જગ્યા છે
    top = rect.top - tooltipH - 12;
  } else if (spaceBelow >= tooltipH + 12) {
    // Element ની નીચે જગ્યા છે
    top = rect.bottom + 12;
  } else {
    // જગ્યા નથી — screen ની વચ્ચે બતાવો
    top = Math.max(16, vh / 2 - tooltipH / 2);
  }

  let left = rect.left + rect.width / 2 - tooltipW / 2;
  left = Math.max(16, Math.min(left, vw - tooltipW - 16));
  top  = Math.max(16, Math.min(top, vh - tooltipH - 16));

  return { top, left, width: tooltipW };
}

// ── Arrow pointer ─────────────────────────────────────────────────────────────
function Arrow({ position, targetRect, tooltipLeft, tooltipWidth }) {
  if (!targetRect) return null;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const arrowLeft = Math.max(16, Math.min(targetCenterX - tooltipLeft - 10, tooltipWidth - 32));

  const arrowStyle =
    position === "bottom"
      ? { top: -9, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderBottom: "10px solid #1a1a2e" }
      : { bottom: -9, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "10px solid #1a1a2e" };

  return (
    <div style={{ position: "absolute", left: arrowLeft, width: 0, height: 0, ...arrowStyle }} />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingTour({ steps, onFinish }) {
  const [step, setStep]       = useState(0);
  const [rects, setRects]     = useState({});
  const [visible, setVisible] = useState(false);

  const current      = steps[step];
  const rect         = rects[current?.target];
  const PADDING      = rect && (rect.width < 50 || rect.height < 50) ? 14 : 6;
  const tooltipStyle = getTooltipStyle(rect);

  // Measure all target elements
  useEffect(() => {
    const measure = () => {
      const map = {};
      steps.forEach((s) => {
        const el = document.getElementById(s.target);
        if (el) map[s.target] = el.getBoundingClientRect();
      });
      setRects(map);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [steps]);

  // Animate in on each step change
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [step]);

  const handleNext = () => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else onFinish();
  };

  return (
    <>
      {/* ── Dark overlay with spotlight hole ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none" }}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <mask id="tour-hole">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - PADDING}   y={rect.top - PADDING}
                  width={rect.width + PADDING * 2} height={rect.height + PADDING * 2}
                  rx={10} fill="black"
                />
              )}
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tour-hole)" />
          {rect && (
            <rect
              x={rect.left - PADDING}   y={rect.top - PADDING}
              width={rect.width + PADDING * 2} height={rect.height + PADDING * 2}
              rx={10} fill="none" stroke="#C9A84C"
              strokeWidth={PADDING > 6 ? 3.5 : 2.5}
              opacity={0.95}
            />
          )}
        </svg>
      </div>

      {/* ── Tooltip ── */}
      <div
        style={{
          position:   "fixed",
          zIndex:     9999,
          ...tooltipStyle,
          background: "#1a1a2e",
          borderRadius: 14,
          padding:    "18px 18px 14px",
          boxShadow:  "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,76,0.3)",
          transform:  `translateY(${visible ? 0 : 8}px)`,
          opacity:    visible ? 1 : 0,
          transition: "opacity 0.22s ease, transform 0.22s ease",
          pointerEvents: "all",
        }}
      >
        {/* Auto arrow — tooltip નીચે છે તો ઉપર arrow, ઉપર છે તો નીચે arrow */}
        <Arrow
          position={rect && tooltipStyle.top > rect.top ? "bottom" : "top"}
          targetRect={rect}
          tooltipLeft={tooltipStyle.left || 0}
          tooltipWidth={tooltipStyle.width || 300}
        />

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              height: 4, flex: i === step ? 2 : 1, borderRadius: 4,
              background: i <= step ? "#C9A84C" : "rgba(255,255,255,0.15)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6, fontFamily: "'Segoe UI', sans-serif" }}>
          {current?.title}
        </div>

        {/* Description */}
        <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.55, marginBottom: 14, fontFamily: "'Segoe UI', sans-serif" }}>
          {current?.desc}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onFinish}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", padding: "6px 0", fontFamily: "'Segoe UI', sans-serif" }}>
            Skip
          </button>
          <button onClick={handleNext}
            style={{
              background:   "linear-gradient(135deg, #C9A84C, #8B6914)",
              color:        "#fff",
              border:       "none",
              borderRadius: 20,
              padding:      "9px 22px",
              fontSize:     13.5,
              fontWeight:   600,
              cursor:       "pointer",
              fontFamily:   "'Segoe UI', sans-serif",
              boxShadow:    "0 3px 14px rgba(201,168,76,0.4)",
            }}>
            {step < steps.length - 1 ? "આગળ →" : "✓ Done"}
          </button>
        </div>
      </div>
    </>
  );
}