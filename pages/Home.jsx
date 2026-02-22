import { useState } from "react";

export default function Home() {// OswalNotice.jsx
// Gujarati notice for Shri Visha Oswal Jain Kelwani Mandal
// Uses Tailwind CSS + Google Fonts (add to index.html or use @import in CSS)


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

  return (
    <>
      {/* Google Font loaded via <link> in index.html for best performance */}

      <div className="gu min-h-screen py-5 px-4" style={{ background: "linear-gradient(135deg,#fdf3e7 0%,#f5e6c8 40%,#fdf8ef 100%)" }}>
        <div className="max-w-xl mx-auto">

          {/* ── HEADER ── */}
          <div
            className="rounded-t-2xl px-7 py-9 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,#4a0f1a 0%,#7b1c2e 50%,#9b2035 100%)" }}
          >
            {/* gold glow overlay */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(201,151,58,0.18) 0%,transparent 70%)" }} />

            <p className="text-2xl tracking-widest mb-2 relative z-10" style={{ color: "#f0c96b", opacity: 0.8 }}>✦ ✦ ✦</p>
            <h1 className="text-xl font-bold leading-relaxed relative z-10" style={{ color: "#f0c96b", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              🙏 શ્રી વિશા ઓશવાળ જૈન કેળવણી મંડળ
            </h1>
            <p className="text-xs mt-1 relative z-10" style={{ color: "rgba(240,201,107,0.75)", letterSpacing: 1 }}>
              વિદ્યાર્થી ડેટા કલેક્શન અભિયાન • ઓસ્વાલ કનેક્ટર
            </p>
            <div className="mx-auto mt-3 h-0.5 w-20 relative z-10"
              style={{ background: "linear-gradient(90deg,transparent,#c9973a,transparent)" }} />
          </div>

          {/* ── BRANCHES ── */}
          <div
            className="py-2.5 px-5 text-center text-sm font-semibold"
            style={{ background: "linear-gradient(90deg,#8b6520,#c9973a,#8b6520)", color: "#4a0f1a", letterSpacing: 0.5 }}
          >
            📍 બોરસદ &nbsp;|&nbsp; વાલવોડ &nbsp;|&nbsp; પાદરા &nbsp;|&nbsp; વટાદરા
          </div>

          {/* ── BODY ── */}
          <div
            className="px-6 py-8 border-x"
            style={{ background: "#fdf8ef", borderColor: "#f0c96b" }}
          >

            {/* Section 1 – Data Collection */}
            <Section icon="📋" title="વિદ્યાર્થી ડેટા કલેક્શન અભિયાન">
              <p className="text-sm leading-relaxed" style={{ color: "#5a3a1a" }}>
                સમાજ દ્વારા સમગ્ર સમાજના વિદ્યાર્થીઓના ડેટા કલેક્શનનું અભિયાન શરૂ કરાયું છે.
                વિદ્યાર્થીઓના ડેટા કલેક્ટ કર્યા પછી, કેળવણી મંડળ વિદ્યાર્થીઓની જરૂરિયાત
                સમજીને આગામી કાર્યક્રમોનું આયોજન કરવા માંગે છે.
              </p>
            </Section>

            {/* Section 2 – Goals */}
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

            {/* Section 3 – Dates */}
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

            {/* Divider */}
            <p className="text-center my-5 text-xs tracking-widest" style={{ color: "#c9973a", opacity: 0.5 }}>◆ ◆ ◆</p>

            {/* Section 4 – Competition */}
            <Section icon="🏆" title="ઓસ્વાલ કનેક્ટર — સ્પર્ધા">
              <div
                className="rounded-2xl p-5 mt-2 relative overflow-hidden border-2"
                style={{ background: "linear-gradient(135deg,#fff,#fef9f0)", borderColor: "#c9973a" }}
              >
                {/* faint trophy watermark */}
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

            {/* Section 5 – Steps */}
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

            {/* CTA */}
            <div
              className="rounded-xl px-5 py-5 text-center my-5"
              style={{ background: "linear-gradient(135deg,#8b6520,#c9973a,#8b6520)" }}
            >
              <p className="font-bold text-sm" style={{ color: "#4a0f1a" }}>
                🔗 નીચેની લિંક/QR કોડ ૬ માર્ચ ૨૦૨૬ થી ઉપલબ્ધ
              </p>
              <p className="text-xs mt-1.5" style={{ color: "rgba(74,15,26,0.7)" }}>
                QR કોડ સ્કેન કરીને અથવા લિંક ક્લિક કરીને ફોર્મ ભરી શકાશે
              </p>
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

          </div>{/* /body */}

          {/* ── FOOTER ── */}
          <div
            className="rounded-b-2xl px-7 py-6 text-center border-t-4"
            style={{ background: "linear-gradient(135deg,#4a0f1a,#7b1c2e)", borderColor: "#c9973a" }}
          >
            <p className="text-sm" style={{ color: "rgba(240,201,107,0.8)" }}>— કેળવણી મંડળ વતી —</p>
            <p className="text-base font-bold mt-2" style={{ color: "#f0c96b" }}>✍️ શ્રી અશ્વિનભાઈ (CA) — માનદ મંત્રી</p>
            <p className="text-xs mt-2" style={{ color: "rgba(240,201,107,0.55)" }}>શ્રી વિશા ઓશવાળ જૈન કેળવણી મંડળ</p>
            <p className="text-xl mt-3 tracking-widest" style={{ color: "#c9973a", opacity: 0.6 }}>✦ ✦ ✦</p>
          </div>

        </div>
      </div>
    </>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function Section({ icon, title, children }) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-2.5 mb-3 pb-2"
        style={{ borderBottom: "2px solid #f0c96b" }}>
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#7b1c2e,#4a0f1a)" }}
        >{icon}</span>
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
    <div
      className={`rounded-xl px-4 py-4 border-l-4 ${className}`}
      style={{
        background: "linear-gradient(135deg,#fff8ee,#fff3e0)",
        border: "1px solid #c9973a",
        borderLeftColor: "#c9973a",
        borderLeftWidth: 4,
      }}
    >
      <div className="text-sm leading-relaxed" style={{ color: "#2c1a0e" }}>{children}</div>
    </div>
  );
}
