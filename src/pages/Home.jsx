import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const APP_URL = "https://bvpv-km.web.app/";
const QR_URL  = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(APP_URL)}&color=4a0f1a&bgcolor=fff8ee&qzone=1`;

// ── Each "story card" is one full screen slide ─────────────────────
const SLIDES = [
  { id: "welcome" },
  { id: "campaign" },
  { id: "goals" },
  { id: "competition" },
  { id: "how" },
  { id: "qr" },
];

// ── Slide content ──────────────────────────────────────────────────

function SlideWelcome({ onNext }) {
  return (
    <div className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#3d0a18 0%,#7b1c2e 60%,#9b2035 100%)" }}>

      {/* Top decoration */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
          style={{ background: "rgba(201,168,76,0.15)", border: "2px solid rgba(201,168,76,0.3)" }}>
          🙏
        </div>
      </div>

      {/* Center text */}
      <div className="text-center space-y-3">
     {/*   <p className="text-xs tracking-widest font-semibold"
          style={{ color: "rgba(240,201,107,0.55)", letterSpacing: "0.2em" }}>
          ✦ &nbsp; વિશા ઓશવાળ જૈન &nbsp; ✦
        </p>
        <h1 className="text-3xl font-bold leading-tight" style={{ color: "#f0d080" }}>
          કેળવણી મંડળ
        </h1>
        <p className="text-sm" style={{ color: "rgba(240,208,128,0.55)" }}>
          બોરસદ · વાલવોડ · પાદરા · વટાદરા
        </p>*/}

        <div className="pt-4">
          <div className="inline-block rounded-2xl px-5 py-3"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(201,151,58,0.3)" }}>
            <p className="text-base font-bold" style={{ color: "#f0d080" }}>
              📋 વિદ્યાર્થી ડેટા અભિયાન ૨૦૨૬
            </p>
  <p
  className="text-sm leading-relaxed mb-6"
  style={{ color: "rgba(255,255,255,0.85)" }}
>
  સમાજના સમગ્ર વિદ્યાર્થીઓના ડેટા કલેક્શનનું મહત્વપૂર્ણ અભિયાન શરૂ કરવામાં આવ્યું છે. 
  કેળવણી મંડળ વિદ્યાર્થીઓની જરૂરિયાતોને સમજીને આવનારા સમયમાં ઉપયોગી અને માર્ગદર્શક કાર્યક્રમોનું આયોજન કરવા પ્રતિબદ્ધ છે. 
  આ અભિયાનમાં આપનો સહયોગ અમૂલ્ય છે. 
  ચાલો, મળીને આ પવિત્ર પ્રયત્નને સફળ બનાવીએ અને આપણા સમાજના ભવિષ્યને વધુ ઉજ્જવળ બનાવીએ.

  <br /><br />
  <span style={{ fontWeight: "600", color: "#ffffff" }}>
    — અશ્વિન શાહ (CA), માનદ મંત્રી
  </span>
</p>



            <p className="text-xs mt-1" style={{ color: "rgba(240,208,128,0.6)" }}>
              સ્વાઇપ કરો — આગળ વધો ↓
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <button onClick={onNext}
        className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2"
        style={{ background: "rgba(201,168,76,0.2)", color: "#f0c96b", border: "1.5px solid rgba(201,168,76,0.4)" }}>
        વધુ માહિતી &nbsp; ↓
      </button>
    </div>
  );
}

function SlideCampaign({ onNext }) {
  return (
    <div className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#1a0a2e 0%,#2d1b69 100%)" }}>

      <div>
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c" }}>
          01 / 05
        </span>
        <h2 className="text-2xl font-bold mb-3 leading-snug" style={{ color: "#fff" }}>
          📋
        </h2>
      

        {/* Date cards */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl p-4 text-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>ફોર્મ ઉપલબ્ધ (Online)</p>
            <p className="text-xl font-bold" style={{ color: "#c9a84c" }}>૦૬ માર્ચ</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>૨૦૨૬</p>
          </div>
          <div className="flex-1 rounded-2xl p-4 text-center"
            style={{ background: "rgba(232,87,42,0.25)", border: "1px solid rgba(232,87,42,0.4)" }}>
            <p className="text-xs mb-1" style={{ color: "rgba(255,150,100,0.8)" }}>છેલ્લી તારીખ</p>
            <p className="text-xl font-bold" style={{ color: "#ff9060" }}>૩૧ માર્ચ</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,150,100,0.5)" }}>⚠️ ડેડલાઈન</p>
          </div>
        </div>
      </div>

      <button onClick={onNext}
        className="w-full py-4 rounded-2xl text-sm font-bold"
        style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>
        આગળ ↓
      </button>
    </div>
  );
}

function SlideGoals({ onNext }) {
  const goals = [
    { icon: "🏛️", text: "સરકારી સહાયો વિદ્યાર્થીઓ સુધી પહોંચાડવી" },
    { icon: "🎯", text: "કારકિર્દી વિષયક માર્ગદર્શન આપવું" },
    { icon: "💰", text: "જરૂરિયાતમંદ વિદ્યાર્થીઓને આર્થિક સહાય" },
    { icon: "📍", text: "દૂર ભણતા વિદ્યાર્થીઓ ને નજીકના કોન્ટેક્ટ" },
    { icon: "🤝", text: "સમાન ગ્રૂપ ના વિદ્યાર્થીઓ ને જોડવા" },
  ];

  return (
    <div className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#0a2e1a 0%,#1a5c35 100%)" }}>

      <div>
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
          02 / 05
        </span>
        <h2 className="text-2xl font-bold mb-4 leading-snug" style={{ color: "#fff" }}>
          🎯 ઉદ્દેશ્યો
        </h2>

        <div className="space-y-2">
          {goals.map((g, i) => (
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

function SlideCompetition({ onNext }) {
  return (
    <div className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#2e1a00 0%,#7b4a00 60%,#c9730a 100%)" }}>

      <div>
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>
          03 / 05
        </span>
        <h2 className="text-2xl font-bold mb-2 leading-snug" style={{ color: "#fef3c7" }}>
          🏆 ઓસ્વાલ કનેક્ટર
        </h2>
        <p className="text-xs font-semibold mb-4" style={{ color: "rgba(251,191,36,0.7)" }}>
          સમાજ માટે ખાસ  સ્પર્ધા
        </p>

        <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.78)" }}>
          પરિવારનું રજીસ્ટ્રેશન કર્યા પછી, ફોનમાં સમાજના જેટલા પણ
          કોન્ટેક્ટ હોય — તે સ્પર્ધા પેજ પર એડ કરવાના છે.
        </p>

        {/* Prize boxes */}
        <div className="space-y-2 mb-5">
          {[
            { icon: "🥇", label: "સૌથી વધારે કોન્ટેક્ટ — ટોચના 5" },
            { icon: "🌟", label: "સૌથી વધુ યુનિક કોન્ટેક્ટ — ટોચના 5" },
          ].map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(251,191,36,0.25)" }}>
              <span className="text-2xl">{p.icon}</span>
              <p className="text-sm font-semibold" style={{ color: "#fef3c7" }}>{p.label}</p>
            </div>
          ))}
          <p className="text-center text-xs pt-1" style={{ color: "rgba(251,191,36,0.6)" }}>
            ને ઓસ્વાલ કનેક્ટર એવોર્ડ 🎖️
          </p>
        </div>

       
      </div>

      <button onClick={onNext}
        className="w-full py-3 rounded-2xl text-sm font-bold mt-3"
        style={{ background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
        આગળ ↓
      </button>
    </div>
  );
}

function SlideHow({ onNext }) {
  const steps = [
    "એપ ખોલો અને પરિવારનું રજીસ્ટ્રેશન કરો",
    "સ્પર્ધા પેજ પર જાઓ",
    '"Add Contact From Phone" ક્લિક કરો',
    "સર્ચ કરી, સમાજના કોન્ટેક્ટ સિલેક્ટ કરો",
    '"Done" ક્લિક કરો — કોન્ટેક્ટ એડ થઈ જશે',
  ];

  return (
    <div className="flex flex-col justify-between h-full px-6 py-10"
      style={{ background: "linear-gradient(160deg,#0f172a 0%,#1e3a5f 100%)" }}>

      <div>
        <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
          style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
          04 / 05
        </span>
        <h2 className="text-2xl font-bold mb-4" style={{ color: "#fff" }}>
          📱 કેવી રીતે ભાગ લેવો?
        </h2>

        <div className="space-y-2.5">
          {steps.map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                style={{ background: "rgba(96,165,250,0.2)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}>
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed pt-1" style={{ color: "rgba(255,255,255,0.78)" }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
       <Link to="/connectors"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold"
          style={{ background: "linear-gradient(135deg,#b45309,#d97706)", color: "#fef3c7", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
          સ્પર્ધામાં ભાગ લો →
        </Link>

      <button onClick={onNext}
        className="w-full py-4 rounded-2xl text-sm font-bold mt-4"
        style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}>
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
          05 / 05
        </span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#f0d080" }}>
          📲 એપ ખોલો
        </h2>
        <p className="text-sm mb-6" style={{ color: "rgba(240,208,128,0.6)" }}>
          QR સ્કેન કરો અથવા લિંક ટૅપ કરો
        </p>

        {/* QR */}
        <div className="flex justify-center mb-5">
          <div className="rounded-2xl p-4" style={{ background: "#fff8ee", border: "2px solid rgba(201,168,76,0.4)" }}>
            <img src={QR_URL} alt="QR Code" width={160} height={160} style={{ borderRadius: 8, display: "block" }} />
          </div>
        </div>

        {/* Link button */}
        <a href={APP_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold mb-4"
          style={{ background: "rgba(201,168,76,0.15)", color: "#f0c96b", border: "1.5px solid rgba(201,168,76,0.4)" }}>
          🔗 {APP_URL}
        </a>

        {/* Note */}
        <div className="rounded-xl px-4 py-3 text-center"
          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(232,87,42,0.3)" }}>
          <p className="text-xs font-semibold" style={{ color: "rgba(255,150,100,0.9)" }}>
            ⚠️ ફક્ત સમાજના સભ્યો માટે
          </p>
        </div>
      </div>

      {/* Register CTA */}
      <Link to="/registration"
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-bold"
        style={{ background: "linear-gradient(135deg,#c9a84c,#f0d080)", color: "#4a0f1a", boxShadow: "0 6px 24px rgba(0,0,0,0.3)" }}>
        🏠 પરિવાર રજીસ્ટ્રેશન કરો
      </Link>
    </div>
  );
}

// ── Dot indicators ─────────────────────────────────────────────────
function Dots({ total, current }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width:      i === current ? 20 : 6,
          height:     6,
          borderRadius: 3,
          background: i === current ? "#c9a84c" : "rgba(201,168,76,0.25)",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function Home() {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir]  = useState(1); // 1 = down, -1 = up
  const [visible, setVisible]  = useState(true);
  const touchStartY = useRef(null);
  const total = SLIDES.length;

  const goTo = (index, dir = 1) => {
    if (index < 0 || index >= total) return;
    setAnimDir(dir);
    setVisible(false);
    setTimeout(() => {
      setCurrent(index);
      setVisible(true);
    }, 220);
  };

  const goNext = () => goTo(current + 1, 1);
  const goPrev = () => goTo(current - 1, -1);

  // Touch swipe support
  const onTouchStart = (e) => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd   = (e) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) delta > 0 ? goNext() : goPrev();
    touchStartY.current = null;
  };

  const slideComponents = [
    <SlideWelcome     onNext={goNext} />,
    <SlideCampaign    onNext={goNext} />,
    <SlideGoals       onNext={goNext} />,
    <SlideCompetition onNext={goNext} />,
    <SlideHow         onNext={goNext} />,
    <SlideQR />,
  ];

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 112px)", overflow: "hidden", position: "relative" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide area */}
      <div style={{
        flex: 1,
        overflow: "hidden",
        opacity:   visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${animDir * 18}px)`,
        transition: "opacity 0.22s ease, transform 0.22s ease",
      }}>
        {slideComponents[current]}
      </div>

      {/* Bottom bar — dots + nav */}
      <div className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: "#1a0a14", borderTop: "1px solid rgba(201,168,76,0.15)" }}>

        <button onClick={goPrev} disabled={current === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg disabled:opacity-20 transition-opacity"
          style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
          ↑
        </button>

        <Dots total={total} current={current} />

        <button onClick={goNext} disabled={current === total - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg disabled:opacity-20 transition-opacity"
          style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
          ↓
        </button>
      </div>
    </div>
  );
}