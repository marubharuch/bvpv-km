import { useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import qr from "../assets/qr.png"

const APP_URL = "https://bvpv-km.web.app/";

// ── Slide content ──────────────────────────────────────────────────

function SlideWelcome({ onNext }) {
  return (
    <div className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#3d0a18 0%,#7b1c2e 60%,#9b2035 100%)" }}>

      <div className="text-center space-y-3">
        <div className="pt-4">
          <div className="inline-block rounded-2xl px-5 py-3 w-full"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(201,151,58,0.3)" }}>
            <p className="text-base font-bold mb-3" style={{ color: "#f0d080" }}>
              📋 વિદ્યાર્થી ડેટા અભિયાન ૨૦૨૬
            </p>
            <p className="text-sm leading-relaxed mb-4 text-left"
              style={{ color: "rgba(255,255,255,0.85)" }}>
              સમાજના સમગ્ર વિદ્યાર્થીઓના ડેટા કલેક્શનનું મહત્વપૂર્ણ અભિયાન શરૂ કરવામાં આવ્યું છે.
              કેળવણી મંડળ વિદ્યાર્થીઓની જરૂરિયાતોને સમજીને આવનારા સમયમાં ઉપયોગી અને માર્ગદર્શક
              કાર્યક્રમોનું આયોજન કરવા પ્રતિબદ્ધ છે.
              <br /><br />
              <span style={{ fontWeight: "600", color: "#ffffff" }}>
                અશ્વિન શાહ (CA), માનદ મંત્રી
              </span>
            </p>

            <div className="flex gap-3">
              <div className="flex-1 rounded-2xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>ફોર્મ ઉપલબ્ધ (Online)</p>
                <p className="text-xl font-bold" style={{ color: "#c9a84c" }}>૦૬ માર્ચ</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>૨૦૨૬</p>
              </div>
              <div className="flex-1 rounded-2xl p-3 text-center"
                style={{ background: "rgba(232,87,42,0.25)", border: "1px solid rgba(232,87,42,0.4)" }}>
                <p className="text-xs mb-1" style={{ color: "rgba(255,150,100,0.8)" }}>છેલ્લી તારીખ</p>
                <p className="text-xl font-bold" style={{ color: "#ff9060" }}>૩૧ માર્ચ</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,150,100,0.5)" }}>⚠️ ડેડલાઈન</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={onNext}
        className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 mt-4"
        style={{ background: "rgba(201,168,76,0.2)", color: "#f0c96b", border: "1.5px solid rgba(201,168,76,0.4)" }}>
        વધુ માહિતી &nbsp; ↓
      </button>
    </div>
  );
}

// Goals array defined outside component — no re-creation on every render
const GOALS = [
  { icon: "🏛️", text: "સરકારી સહાયો વિદ્યાર્થીઓ સુધી પહોંચાડવી" },
  { icon: "🎯", text: "કારકિર્દી વિષયક માર્ગદર્શન આપવું" },
  { icon: "💰", text: "જરૂરિયાતમંદ વિદ્યાર્થીઓને આર્થિક સહાય" },
  { icon: "📍", text: "દૂર ભણતા વિદ્યાર્થીઓ ને નજીકના કોન્ટેક્ટ" },
  { icon: "🤝", text: "સમાન ગ્રૂપ ના વિદ્યાર્થીઓ ને જોડવા" },
];

function SlideGoals({ onNext }) {
  return (
    <div className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#0a2e1a 0%,#1a5c35 100%)" }}>

      <div>
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
          01 / 03
        </span>
        <h2 className="text-2xl font-bold mb-4 leading-snug" style={{ color: "#fff" }}>
          🎯 ઉદ્દેશ્યો - Goals
        </h2>

        <div className="space-y-2">
          {GOALS.map((g, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-xl flex-shrink-0">{g.icon}</span>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.82)" }}>{g.text}</p>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onNext}
        className="w-full py-4 rounded-2xl text-sm font-bold mt-4"
        style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}>
        આગળ ↓
      </button>
    </div>
  );
}

// Awards array defined outside component — no re-creation on every render
const AWARDS = [
  { icon: "🥇", label: "Upload Award", desc: "સૌથી વધુ community contacts અપલોડ કરો" },
  { icon: "🌟", label: "Invite Award",  desc: "સૌથી વધુ લોકોને register કરાવો" },
];

function SlideCompetition({ onNext }) {
  return (
    <div className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#2e1a00 0%,#7b4a00 60%,#c9730a 100%)" }}>

      <div>
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>
          02 / 03
        </span>
        <h2 className="text-2xl font-bold mb-3 leading-snug" style={{ color: "#fef3c7" }}>
          🏆 ઓસ્વાલ કનેક્ટર 🎖️
        </h2>

        <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.78)" }}>
          આ અભિયાનને વધુ વેગવંતું બનાવવા <strong style={{ color: "#fbbf24" }}>'ઓસ્વાલ કનેક્ટ સ્પર્ધા'</strong> નું
          આયોજન કરવામાં આવ્યું છે. સ્પર્ધાના મુખ્ય બે ભાગ:
        </p>

        <div className="space-y-2 mb-4">
          {AWARDS.map((p, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(251,191,36,0.25)" }}>
              <span className="text-2xl flex-shrink-0">{p.icon}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: "#fbbf24" }}>{p.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl px-4 py-3"
          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(251,191,36,0.8)" }}>
            💡 સૌ પ્રથમ ફેમિલી રજીસ્ટ્રેશન કરો, પછી Contest Page પર ભાગ લો.
            સ્પર્ધાનો બીજો ભાગ ૧૪ માર્ચથી શરૂ થશે.
          </p>
        </div>
      </div>

      <button onClick={onNext}
        className="w-full py-3 rounded-2xl text-sm font-bold mt-4"
        style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
        આગળ ↓
      </button>
    </div>
  );
}

function SlideQR() {
  return (
    <div className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#3d0a18 0%,#7b1c2e 100%)" }}>

      <div>
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c" }}>
          03 / 03
        </span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#f0d080" }}>
          📲 એપ ખોલો
        </h2>
        <p className="text-sm mb-5" style={{ color: "rgba(240,208,128,0.6)" }}>
          QR સ્કેન કરો અથવા લિંક ટૅપ કરો
        </p>

        <div className="flex justify-center mb-5">
          <div className="rounded-2xl p-4"
            style={{ background: "#fff8ee", border: "2px solid rgba(201,168,76,0.4)" }}>
            {/* Local asset — no external network request, faster LCP */}
            <img
              src={qr}
              alt="QR Code"
              width={160}
              height={160}
              loading="eager"
              decoding="async"
              style={{ borderRadius: 8, display: "block" }}
            />
          </div>
        </div>

        <a href={APP_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold mb-3"
          style={{ background: "rgba(201,168,76,0.15)", color: "#f0c96b", border: "1.5px solid rgba(201,168,76,0.4)" }}>
          🔗 {APP_URL}
        </a>

        <div className="rounded-xl px-4 py-3 text-center"
          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(232,87,42,0.3)" }}>
          <p className="text-xs font-semibold" style={{ color: "rgba(255,150,100,0.9)" }}>
            ⚠️ ફક્ત સમાજના સભ્યો માટે
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Link to="/registration"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-bold"
          style={{ background: "linear-gradient(135deg,#c9a84c,#f0d080)", color: "#4a0f1a", boxShadow: "0 6px 24px rgba(0,0,0,0.3)" }}>
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
        <div key={i} style={{
          width:        i === current ? 20 : 6,
          height:       6,
          borderRadius: 3,
          background:   i === current ? "#c9a84c" : "rgba(201,168,76,0.25)",
          transition:   "all 0.3s ease",
        }} />
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

  // ✅ useCallback — stable references, no re-creation on every render
  const goTo = useCallback((index, dir = 1) => {
    if (index < 0 || index >= TOTAL_SLIDES) return;
    setAnimDir(dir);
    setVisible(false);
    setTimeout(() => {
      setCurrent(index);
      setVisible(true);
    }, 220);
  }, []); // no deps — TOTAL_SLIDES is a constant

  const goNext = useCallback(() => goTo(current + 1,  1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1, -1), [current, goTo]);

  // ✅ useMemo — slides array not rebuilt on every render
  const slides = useMemo(() => [
    <SlideWelcome     key={0} onNext={goNext} />,
    <SlideGoals       key={1} onNext={goNext} />,
    <SlideCompetition key={2} onNext={goNext} />,
    <SlideQR          key={3} />,
  ], [goNext]); // only rebuilds when goNext changes (i.e. when current changes)

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
      <div style={{
        flex:       1,
        overflow:   "hidden",
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : `translateY(${animDir * 18}px)`,
        transition: "opacity 0.22s ease, transform 0.22s ease",
      }}>
        {slides[current]}
      </div>

      {/* Bottom bar — dots + nav */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: "#1a0a14", borderTop: "1px solid rgba(201,168,76,0.15)" }}>

        <button onClick={goPrev} disabled={current === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg disabled:opacity-20 transition-opacity"
          style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
          ↑
        </button>

        <Dots total={TOTAL_SLIDES} current={current} />

        <button onClick={goNext} disabled={current === TOTAL_SLIDES - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg disabled:opacity-20 transition-opacity"
          style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
          ↓
        </button>
      </div>
    </div>
  );
}