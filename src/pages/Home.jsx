import { useState } from "react";

export default function Home() {

  const goals = [
    "સરકાર દ્વારા મળતી વિવિધ સહાયો વિદ્યાર્થીઓ સુધી પહોંચાડવી",
    "કારકિર્દી વિષયક માર્ગદર્શન આપવું",
    "જરૂરિયાતમંદ વિદ્યાર્થીઓને આર્થિક સહાય પ્રદાન કરવી",
    "ઘરથી દૂર રહીને ભણતા વિદ્યાર્થીઓ ને નજીકના કોન્ટેક્ટ ઉપલબ્ધ કરાવવા",
    "વિદ્યાર્થીઓના અભ્યાસ અને શોખ આધારે, સમાન ગ્રૂપ ના વિદ્યાર્થીઓ ને એકબીજા સાથે જોડવા અને આગળ વધારવા",
  ];

  const steps = [
    { n: 1, text: <>એપ ખોલો અને આપના પરિવારનું <strong>રજીસ્ટ્રેશન</strong> કરો</> },
    { n: 2, text: <><strong>સ્પર્ધા પેજ</strong> પર જાઓ</> },
    { n: 3, text: <><strong>"Add Contact From Phone"</strong> બટન ક્લિક કરો — ફોનના કોન્ટેક્ટ લિસ્ટ ખૂલશે</> },
    { n: 4, text: <>સર્ચ કરી, <strong>સમાજના કોન્ટેક્ટ સિલેક્ટ</strong> કરો</> },
    { n: 5, text: <><strong>"Done"</strong> ક્લિક કરો — કોન્ટેક્ટ એડ થઈ જશે. જો જરૂર હોય તો નામ સુધારો.</> },
  ];

  const APP_URL = "https://bvpv-km.web.app/";
  const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(APP_URL)}&color=4a0f1a&bgcolor=fff8ee&qzone=1`;

  return (
    <>
      {/* ── SCROLL PROGRESS BAR ── */}
      <ScrollProgress />

      {/* ── PAGE ── */}
      <div
        className="gu py-5 px-4"
        style={{
          background: "linear-gradient(135deg,#fdf3e7 0%,#f5e6c8 40%,#fdf8ef 100%)",
          // extra bottom padding so content clears the sticky footer + bottom navbar
          paddingBottom: "96px",
        }}
      >
        <div className="max-w-xl mx-auto">

          {/* ── BRANCHES BAR (replaces removed header) ── */}
          <div
            className="rounded-t-2xl py-2.5 px-5 text-center text-sm font-semibold"
            style={{ background: "linear-gradient(90deg,#8b6520,#c9973a,#8b6520)", color: "#4a0f1a", letterSpacing: 0.5 }}
          >
            📍 બોરસદ &nbsp;|&nbsp; વાલવોડ &nbsp;|&nbsp; પાદરા &nbsp;|&nbsp; વટાદરા
          </div>

          {/* ── BODY ── */}
          <div
            className="px-6 py-8 border-x rounded-b-2xl"
            style={{ background: "#fdf8ef", borderColor: "#f0c96b" }}
          >

            {/* Section 1 */}
            <Section icon="📋" title="વિદ્યાર્થી ડેટા કલેક્શન અભિયાન">
              <p className="text-sm leading-relaxed" style={{ color: "#5a3a1a" }}>
                સમાજ દ્વારા સમગ્ર સમાજના વિદ્યાર્થીઓના ડેટા કલેક્શનનું અભિયાન શરૂ કરાયું છે.
                વિદ્યાર્થીઓના ડેટા કલેક્ટ કર્યા પછી, કેળવણી મંડળ વિદ્યાર્થીઓની જરૂરિયાત
                સમજીને આગામી કાર્યક્રમોનું આયોજન કરવા માંગે છે.
              </p>
            </Section>

            {/* Section 2 */}
            <Section icon="🎯" title="આ ડેટા કઈ રીતે ઉપયોગમાં આવશે?">
              <ul className="space-y-0">
                {goals.map((g, i) => (
                  <li key={i} className="flex items-start gap-2.5 py-2 text-sm leading-relaxed"
                    style={{ color: "#5a3a1a", borderBottom: i < goals.length - 1 ? "1px dashed rgba(201,151,58,0.3)" : "none" }}>
                    <span className="mt-1 text-xs flex-shrink-0" style={{ color: "#c9973a" }}>◆</span>
                    {g}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Section 3 */}
            <Section icon="📅" title="મહત્ત્વની તારીખો">
              <div className="flex gap-3 mt-1">
                <DateCard label="ફોર્મ ઉપલબ્ધ" date="06 / 03 / 2026" note="રજીસ્ટ્રેશન શરૂ" />
                <DateCard label="છેલ્લી તારીખ" date="31 / 03 / 2026" note="ડેટા ભરવાની અંતિમ" />
              </div>
              <HighlightBox className="mt-4">
                ⚠️ <strong>વિનંતી:</strong> ૩૧ માર્ચ ૨૦૨૬ સુધીમાં દરેક વિદ્યાર્થી/પરિવાર
                પોતાના ડેટા ભરી દે તેવી નમ્ર વિનંતી છે.
              </HighlightBox>
            </Section>

            <p className="text-center my-5 text-xs tracking-widest" style={{ color: "#c9973a", opacity: 0.5 }}>◆ ◆ ◆</p>

            {/* Section 4 */}
            <Section icon="🏆" title="ઓસ્વાલ કનેક્ટર — સ્પર્ધા">
              <div
                className="rounded-2xl p-5 mt-2 relative overflow-hidden border-2"
                style={{ background: "linear-gradient(135deg,#fff,#fef9f0)", borderColor: "#c9973a" }}
              >
                <span className="absolute right-4 top-4 text-5xl pointer-events-none select-none" style={{ opacity: 0.1 }}>🏆</span>
                <p className="text-lg font-bold" style={{ color: "#7b1c2e" }}>🎉 ઓસ્વાલ કનેક્ટર</p>
                <p className="text-xs font-semibold mt-0.5 mb-3" style={{ color: "#8b6520" }}>સમાજ માટે ખાસ મોબાઈલ સ્પર્ધા</p>
                <p className="text-sm leading-relaxed" style={{ color: "#5a3a1a" }}>
                  આ સ્પર્ધામાં ભાગ લેવો ખૂબ સરળ છે! એપ માં એકવાર આપના પરિવારનું રજીસ્ટ્રેશન
                  કર્યા પછી, આપના ફોનમાં આપણા સમાજના જેટલા પણ કોન્ટેક્ટ હોય — તે સ્પર્ધા
                  પેજ પર જઈ એડ કરવાના છે.
                </p>
                <div className="mt-3 rounded-xl px-4 py-3"
                  style={{ background: "linear-gradient(90deg,#4a0f1a,#7b1c2e)" }}>
                  <p className="text-sm font-semibold" style={{ color: "#f0c96b" }}>
                    🥇 સૌથી વધારે કોન્ટેક્ટ અપલોડ કરનારા ટોચના 5 &nbsp;|&nbsp; સૌથી વધુ
                    યુનિક કોન્ટેક્ટ અપલોડ કરનારા ટોચના 5
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: "rgba(240,201,107,0.8)" }}>
                    — ને <strong>ઓસ્વાલ કનેક્ટર એવોર્ડ</strong> આપવામાં આવશે 🎖️
                  </p>
                </div>
              </div>
            </Section>

            {/* Section 5 */}
            <Section icon="📱" title="કેવી રીતે ભાગ લેવો? (Android)">
              <div className="mt-1">
                {steps.map(({ n, text }, i) => (
                  <div key={n} className="flex gap-3.5 py-2.5 text-sm leading-relaxed items-start"
                    style={{ borderBottom: i < steps.length - 1 ? "1px dashed rgba(201,151,58,0.25)" : "none", color: "#5a3a1a" }}>
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{ background: "#c9973a", color: "#4a0f1a" }}
                    >{n}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* QR + Link */}
            <div className="rounded-2xl overflow-hidden border-2 my-5" style={{ borderColor: "#c9973a" }}>
              <div className="px-5 py-3 text-center"
                style={{ background: "linear-gradient(90deg,#8b6520,#c9973a,#8b6520)" }}>
                <p className="font-bold text-sm" style={{ color: "#4a0f1a" }}>
                  📲 QR કોડ સ્કેન કરો અથવા લિંક ક્લિક કરો
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(74,15,26,0.7)" }}>
                  ૬ માર્ચ ૨૦૨૬ થી ઉપલબ્ધ
                </p>
              </div>
              <div className="flex justify-center py-6" style={{ background: "#fff8ee" }}>
                <div className="rounded-2xl p-3 border-2" style={{ borderColor: "#c9973a", background: "#fff8ee" }}>
                  <img src={QR_URL} alt="QR Code" width={180} height={180} className="block" style={{ borderRadius: 8 }} />
                </div>
              </div>
              <div className="px-5 pb-5 flex flex-col items-center gap-2" style={{ background: "#fff8ee" }}>
                <a
                  href={APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold"
                  style={{ background: "linear-gradient(135deg,#4a0f1a,#7b1c2e)", color: "#f0c96b", boxShadow: "0 4px 14px rgba(74,15,26,0.35)" }}
                >
                  <span>🔗</span>
                  <span>{APP_URL}</span>
                </a>
                <p className="text-xs text-center" style={{ color: "#8b6520" }}>
                  QR કોડ સ્કેન કરીને અથવા ઉપરની લિંક ક્લિક કરીને ફોર્મ ભરી શકાશે
                </p>
              </div>
            </div>

            {/* Special Note */}
            <HighlightBox className="text-center">
              <span
                className="inline-block text-white text-xs font-bold px-3 py-0.5 rounded-full mb-2"
                style={{ background: "#e8572a" }}
              >⚠️ ખાસ નોંધ</span>
              <p className="text-sm font-semibold" style={{ color: "#7b1c2e" }}>
                રજીસ્ટ્રેશન અને સ્પર્ધા <u>ફક્ત સમાજના સભ્યો</u> માટે છે.
              </p>
              <p className="text-xs mt-1" style={{ color: "#5a3a1a" }}>
                આ સંદેશ સમાજના તમામ ગ્રૂપોમાં ફોરવર્ડ કરવામાં આવશે.
              </p>
            </HighlightBox>

          </div>
        </div>
      </div>

      {/* ── STICKY FOOTER — above bottom navbar (z-30 so navbar z-50 sits on top) ── */}
      <div
        className="fixed bottom-16 left-0 right-0 z-30 flex items-center justify-center gap-3 py-2 px-4"
        style={{
          background: "linear-gradient(135deg,#4a0f1a,#7b1c2e)",
          borderTop: "1px solid rgba(201,151,58,0.5)",
          boxShadow: "0 -2px 12px rgba(74,15,26,0.3)",
        }}
      >
        <span style={{ color: "rgba(240,201,107,0.7)", fontSize: 11 }}>— કેળવણી મંડળ વતી —</span>
        <span className="font-bold text-xs" style={{ color: "#f0c96b" }}>
          ✍️ શ્રી અશ્વિનભાઈ  શાહ(CA)
        </span>
        <span style={{ color: "#c9973a", opacity: 0.6 }}>✦</span>
        <span className="text-xs" style={{ color: "rgba(240,201,107,0.55)" }}>માનદ મંત્રી</span>
         <a
          href="https://wa.me/919375046358?text=નમસ્તે%2C%20%F0%9F%99%8F%0A%0Aમારો%20પ્રતિભાવ%20(Feedback)%3A%0A%0A"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
          style={{ background: "#25D366", color: "#fff" }}
        >
          <span>💬</span> પ્રતિભાવ
        </a>
      </div>
    </>
  );
}

/* ── Scroll progress bar ── */
function ScrollProgress() {
  const [pct, setPct] = useState(0);

  if (typeof window !== "undefined") {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? (scrolled / total) * 100 : 0);
    };
    // attach only once
    if (!window.__homeScrollBound) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.__homeScrollBound = true;
    }
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1"
      style={{ background: "rgba(201,151,58,0.15)" }}
    >
      <div
        className="h-full transition-all duration-100"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg,#c9973a,#f0c96b)",
        }}
      />
    </div>
  );
}

/* ── Sub-components ── */
function Section({ icon, title, children }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-2.5 mb-3 pb-2" style={{ borderBottom: "2px solid #f0c96b" }}>
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#7b1c2e,#4a0f1a)" }}>{icon}</span>
        <span className="text-base font-bold" style={{ color: "#7b1c2e" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function DateCard({ label, date, note }) {
  return (
    <div className="flex-1 rounded-xl px-4 py-3.5 text-center"
      style={{ background: "linear-gradient(135deg,#4a0f1a,#7b1c2e)" }}>
      <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: "#f0c96b" }}>{date}</p>
      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{note}</p>
    </div>
  );
}

function HighlightBox({ children, className = "" }) {
  return (
    <div className={`rounded-xl px-4 py-4 ${className}`}
      style={{ background: "linear-gradient(135deg,#fff8ee,#fff3e0)", border: "1px solid #c9973a", borderLeftColor: "#c9973a", borderLeftWidth: 4 }}>
      <div className="text-sm leading-relaxed" style={{ color: "#2c1a0e" }}>{children}</div>
    </div>
  );
}