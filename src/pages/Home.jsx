import { useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "91XXXXXXXXXX"; // ← અહીં number મૂકો
const WHATSAPP_MSG    = "વંશ%20વૃક્ષ%20બનાવવું%20છે";

// ── Slide content ──────────────────────────────────────────────────

const VANSH_BENEFITS = [
  { icon: "🏛️", text: "સાત પેઢી સુધીના પૂર્વજોના નામ અને ઈતિહાસ જીવંત રાખો" },
  { icon: "🤝", text: "નવી જનરેશન લોહીના સંબંધો સ્પષ્ટ સમજે" },
  { icon: "📱", text: "ડિજિટલ — એક ક્લિક પર આખું કુટુંબ સાથે" },
  { icon: "🌟", text: "વડવાઓના સંસ્કાર અને ગૌરવનો પરિચય" },
];

function SlideVanshIntro({ onNext }) {
  return (
    <div
      className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#0a1f3a 0%,#1a3a6e 60%,#2a5298 100%)" }}
    >
      <div className="text-center space-y-3">
        <div className="pt-4">
          <div
            className="inline-block rounded-2xl px-5 py-3 w-full"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(100,160,255,0.3)" }}
          >
            <p className="text-base font-bold mb-3" style={{ color: "#e8d8a0" }}>
              🌳 વંશ વૃક્ષ
            </p>
            <p
              className="text-sm leading-relaxed mb-4 text-left"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              સંજોગોના વાવાઝોડાએ આપણને આપણા મૂળ ગામથી દૂર તો કરી દીધા, પણ “ડાંગે માર્યા પાણી જુદા ન થાય” — આપણા હૃદયના સંબંધો ક્યારેય દૂર નથી થયા...

સમય બદલાયો, પેઢીઓ બદલાઈ રહી છે, પણ આપણા કુટુંબનો પ્રેમ, એકતા અને સંસ્કાર આજે પણ એ જ રીતે જીવંત છે.

ચાલો, હવે એક નાનું પણ હૃદયસ્પર્શી પગલું ભરીએ... આપણા સંતાનોને આપણા મૂળ, આપણા લોકો અને આપણા સંસ્કાર સાથે પરિચિત કરાવીએ, તેથી તેઓ પણ આ અમૂલ્ય બંધનને સમજશે, અનુભવશે અને ગૌરવથી આગળ વધારશે...

કેમ કે અંતે, આપણે ક્યાંય પણ હોઈએ — આપણા મૂળ તો હંમેશા એક જ છે ❤️
              <br /><br />
              
            </p>

     
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 mt-4"
        style={{ background: "rgba(100,160,255,0.15)", color: "#6ab4ff", border: "1.5px solid rgba(100,160,255,0.4)" }}
      >
        વધુ માહિતી &nbsp; ↓
      </button>
    </div>
  );
}

function SlideVanshBenefits({ onNext }) {
  return (
    <div
      className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#0a2e1a 0%,#1a5c35 100%)" }}
    >
      <div>
        <span
          className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
        >
          01 / 03
        </span>
        <h2 className="text-2xl font-bold mb-4 leading-snug" style={{ color: "#fff" }}>
          🌿 શા માટે વંશ વૃક્ષ?
        </h2>

        <div className="space-y-2">
          {VANSH_BENEFITS.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="text-xl flex-shrink-0">{b.icon}</span>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.82)" }}>{b.text}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl text-sm font-bold mt-4"
        style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}
      >
        આગળ ↓
      </button>
    </div>
  );
}

function SlideVanshSample({ onNext }) {
  return (
    <div
      className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#2e1a00 0%,#7b4a00 60%,#c9730a 100%)" }}
    >
      <div>
        <span
          className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}
        >
          02 / 03
        </span>
        <h2 className="text-2xl font-bold mb-3 leading-snug" style={{ color: "#fef3c7" }}>
          🌳 નમૂનારૂપ વૃક્ષ
        </h2>

        <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.78)" }}>
          અહીં તમારા બનાવેલ વંશ વૃક્ષ નો ફોટો અથવા ગ્રાફિક મૂકી શકો છો.
        </p>

        {/* Placeholder — replace with actual <img src={...} /> */}
        <div
          className="rounded-2xl flex flex-col items-center justify-center mb-4"
          style={{
            background: "rgba(0,0,0,0.25)",
            border: "2px dashed rgba(251,191,36,0.35)",
            minHeight: 160,
          }}
        >
          <span style={{ fontSize: 56 }}>🌳</span>
          <p className="text-xs mt-2" style={{ color: "rgba(251,191,36,0.6)" }}>
            વંશ વૃક્ષ ફોટો / ગ્રાફિક
          </p>
        </div>

        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(251,191,36,0.2)" }}
        >
          <p className="text-xs leading-relaxed" style={{ color: "rgba(251,191,36,0.8)" }}>
            💡 આ વૃક્ષ માત્ર નામોની યાદી નથી — વડવાઓના આશીર્વાદ અને
            આવનારી પેઢી માટેનું માર્ગદર્શન છે.
          </p>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 rounded-2xl text-sm font-bold mt-4"
        style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        આગળ ↓
      </button>
    </div>
  );
}

function SlideVanshContact() {
  return (
    <div
      className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#0a1f3a 0%,#1a3a6e 100%)" }}
    >
      <div>
        <span
          className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(100,160,255,0.2)", color: "#6ab4ff" }}
        >
          03 / 03
        </span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#e8d8a0" }}>
          📲 સંપર્ક કરો
        </h2>
        <p className="text-sm mb-5" style={{ color: "rgba(232,216,160,0.6)" }}>
          WhatsApp પર મેસેજ કરો અથવા QR સ્કેન કરો
        </p>

        <div className="flex justify-center mb-5">
          <div
            className="rounded-2xl p-4"
            style={{ background: "#fff8ee", border: "2px solid rgba(232,216,160,0.4)" }}
          >
            {/* Replace this div with: <img src={qrImage} width={160} height={160} /> */}
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: 8,
                background: "#f0e8d0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 64,
              }}
            >
              📱
            </div>
          </div>
        </div>

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold mb-3"
          style={{ background: "rgba(100,160,255,0.15)", color: "#6ab4ff", border: "1.5px solid rgba(100,160,255,0.4)" }}
        >
          👉 wa.me/{WHATSAPP_NUMBER}
        </a>

        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(42,82,152,0.4)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "rgba(150,200,255,0.9)" }}>
            ⚠️ ફક્ત સમાજના સભ્યો માટે
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-bold"
          style={{
            background: "linear-gradient(135deg,#1a5c35,#34d399)",
            color: "#fff",
            boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
          }}
        >
          💬 WhatsApp પર મેસેજ કરો
        </a>
        <Link
          to="/registration"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-bold"
          style={{
            background: "linear-gradient(135deg,#c9a84c,#f0d080)",
            color: "#0a1f3a",
            boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
          }}
        >
          🏠 પરિવાર રજીસ્ટ્રેશન કરો
        </Link>
      </div>
    </div>
  );
}

// ── Dot indicators ─────────────────────────────────────────────────
function Dots({ total, current }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width:        i === current ? 20 : 6,
            height:       6,
            borderRadius: 3,
            background:   i === current ? "#6ab4ff" : "rgba(100,160,255,0.25)",
            transition:   "all 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

const TOTAL_SLIDES = 4;

// ── Main ───────────────────────────────────────────────────────────
export default function Home() {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir]  = useState(1);
  const [visible, setVisible]  = useState(true);
  const touchStartY = useRef(null);

  const goTo = useCallback((index, dir = 1) => {
    if (index < 0 || index >= TOTAL_SLIDES) return;
    setAnimDir(dir);
    setVisible(false);
    setTimeout(() => {
      setCurrent(index);
      setVisible(true);
    }, 220);
  }, []);

  const goNext = useCallback(() => goTo(current + 1,  1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  const slides = useMemo(() => [
    <SlideVanshIntro    key={0} onNext={goNext} />,
    <SlideVanshBenefits key={1} onNext={goNext} />,
    <SlideVanshSample   key={2} onNext={goNext} />,
    <SlideVanshContact  key={3} />,
  ], [goNext]);

  const onTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) delta > 0 ? goNext() : goPrev();
    touchStartY.current = null;
  }, [goNext, goPrev]);

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 112px)", overflow: "hidden", position: "relative" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide area */}
      <div
        style={{
          flex:       1,
          overflow:   "hidden",
          opacity:    visible ? 1 : 0,
          transform:  visible ? "translateY(0)" : `translateY(${animDir * 18}px)`,
          transition: "opacity 0.22s ease, transform 0.22s ease",
        }}
      >
        {slides[current]}
      </div>

      {/* Bottom bar — dots + nav */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: "#0a1428", borderTop: "1px solid rgba(100,160,255,0.15)" }}
      >
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg disabled:opacity-20 transition-opacity"
          style={{ background: "rgba(100,160,255,0.1)", color: "#6ab4ff" }}
        >
          ↑
        </button>

        <Dots total={TOTAL_SLIDES} current={current} />

        <button
          onClick={goNext}
          disabled={current === TOTAL_SLIDES - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg disabled:opacity-20 transition-opacity"
          style={{ background: "rgba(100,160,255,0.1)", color: "#6ab4ff" }}
        >
          ↓
        </button>
      </div>
    </div>
  );
}