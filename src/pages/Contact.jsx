import { useState } from "react";

export default function About() {
  const [lang, setLang] = useState("guj");

  return (
    <div
      className="min-h-screen py-5 px-4"
      style={{ background: "linear-gradient(135deg,#fdf3e7 0%,#f5e6c8 40%,#fdf8ef 100%)" }}
    >
      <div className="max-w-md mx-auto space-y-4">

        {/* ── HEADER ── */}
        <div
          className="rounded-2xl px-6 py-1 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#4a0f1a 0%,#7b1c2e 50%,#9b2035 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(201,151,58,0.18) 0%,transparent 70%)" }} />
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "#c9973a" }} />
          <p className="text-lg tracking-widest mb-1 relative z-10" style={{ color: "#f0c96b", opacity: 0.7 }}>✦ ✦ ✦</p>
          <h1 className="text-lg font-bold relative z-10" style={{ color: "#f0c96b" }}>
            💻 Project Information
          </h1>
         
          <div className="mx-auto mt-3 h-0.5 w-16 relative z-10"
            style={{ background: "linear-gradient(90deg,transparent,#c9973a,transparent)" }} />

          {/* Language toggle inside header */}
          <div className="flex justify-center gap-2 mt-4 relative z-10">
            {["guj", "eng"].map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-4 py-1 rounded-full text-xs font-semibold transition-all"
                style={lang === l
                  ? { background: "#c9973a", color: "#4a0f1a" }
                  : { background: "rgba(201,151,58,0.2)", color: "#f0c96b" }
                }
              >
                {l === "eng" ? "English" : "ગુજરાતી"}
              </button>
            ))}
          </div>
        </div>

        {/* ── ABOUT TEXT ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 4px 20px rgba(90,16,32,0.10)" }}
        >
          <SectionHeader icon="📋" title={lang === "eng" ? "About This Project" : "પ્રોજેક્ટ વિશે"} />
          <div className="px-5 py-4 space-y-3 text-sm leading-relaxed" style={{ background: "#fff8ee", color: "#5a3a1a" }}>
            {lang === "eng" ? (
              <>
                <p>
                  This project has been created to effectively fulfill the objectives of the Mandal.
                  It has been developed under the guidance of{" "}
                  <Highlight>Shree Ashwin Shah (C.A.), Secretary</Highlight>.
                </p>
                <p>
                  The project was initiated through the joint efforts of{" "}
                  <Highlight>Mr. Sanjay Shah</Highlight>, a hobby programmer with interest in technology,
                  and his daughter <Highlight>Hetavi Shah</Highlight>, who is working in the IT industry.
                </p>
                <p>
                  Through this project, IT professionals and students from our community are warmly
                  invited to contribute technically for the benefit of society.
                </p>
                <p>Having trouble using the website? Please let us know.</p>
              </>
            ) : (
              <>
                <p>
                  મંડળના ઉદ્દેશ્યોને વધુ અસરકારક રીતે સાકાર કરવા માટે આ પ્રોજેક્ટની રચના કરવામાં આવી છે.
                  આ પ્રોજેક્ટ મંડળના સેક્રેટરી{" "}
                  <Highlight>શ્રી અશ્વિન શાહ (C.A.)</Highlight> ના માર્ગદર્શન હેઠળ તૈયાર કરવામાં આવ્યો છે.
                </p>
                <p>
                  પ્રોજેક્ટની શરૂઆત <Highlight>શ્રી સંજય શાહ</Highlight> તથા તેમની પુત્રી{" "}
                  <Highlight>હેતવી શાહ</Highlight> ના સંયુક્ત પ્રયત્નોથી કરવામાં આવી છે.
                </p>
                <p>
                  આ પ્રોજેક્ટ દ્વારા આપણા સમાજના આઈ.ટી. પ્રોફેશનલ્સ અને સ્ટુડન્ટ્સને સમાજ માટે
                  ટેક્નિકલ યોગદાન આપવા હાર્દિક આમંત્રણ આપવામાં આવે છે.
                </p>
                <p>વેબસાઇટ વાપરવામાં કોઈ મુશ્કેલી આવે તો કૃપા કરીને જાણ કરો.</p>
              </>
            )}

            {/* Report issue button */}
            <div className="pt-1">
              <a
                href="https://wa.me/919974021397?text=BVPV%20Website%20issue"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#1a6b2e,#25a244)", color: "#fff" }}
              >
                <span>📲</span>
                {lang === "eng" ? "Report an Issue on WhatsApp" : "સમસ્યા WhatsApp પર જણાવો"}
              </a>
            </div>
          </div>
          <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#c9973a,transparent)" }} />
        </div>

        {/* ── MEET THE BUILDERS ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 4px 20px rgba(90,16,32,0.10)" }}
        >
          <SectionHeader icon="🔨" title="Meet the Builders" />
          <div className="px-4 py-4 space-y-3" style={{ background: "#fff8ee" }}>

            <DevCard
              photo="/hss.jpg"
              name="Hetavi Shah"
              role="IT Professional"
              desc="Working in Business Analytics & Business Intelligence domain in the IT industry."
            />

            <DevCard
              photo="/hss2.jpg"
              name="Sanjay Shah"
              role="Hobby Programmer"
              desc="Technology enthusiast contributing to planning and development of this project."
            />

          </div>
          <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#c9973a,transparent)" }} />
        </div>

        {/* ── TECH INFO ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 4px 20px rgba(90,16,32,0.10)" }}
        >
          <SectionHeader icon="🔗" title="Technical Info" />
          <div className="px-5 py-4 space-y-3" style={{ background: "#fff8ee" }}>

            <InfoRow icon="🐙" label="GitHub">
              <a
                href="https://github.com/marubharuch/bvpv-km"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs break-all underline"
                style={{ color: "#7b1c2e" }}
              >
                github.com/marubharuch/bvpv-km
              </a>
            </InfoRow>

            <InfoRow icon="☁️" label="Firebase Account">
              <span className="text-xs font-semibold" style={{ color: "#5a1020" }}>
                oswalbvpv@gmail.com
              </span>
            </InfoRow>

          </div>
          <div className="h-0.5" style={{ background: "linear-gradient(90deg,transparent,#c9973a,transparent)" }} />
        </div>

      </div>
    </div>
  );
}

/* ── Sub-components ── */

function SectionHeader({ icon, title }) {
  return (
    <div
      className="px-5 py-3 flex items-center gap-3"
      style={{ background: "linear-gradient(135deg,#4a0f1a,#7b1c2e)" }}
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{ background: "rgba(201,151,58,0.25)", border: "1px solid rgba(201,151,58,0.5)" }}
      >
        {icon}
      </span>
      <p className="font-bold text-sm" style={{ color: "#f0c96b" }}>{title}</p>
    </div>
  );
}

function Highlight({ children }) {
  return (
    <span className="font-semibold" style={{ color: "#7b1c2e" }}>{children}</span>
  );
}

function DevCard({ photo, name, role, desc }) {
  return (
    <div
      className="flex gap-3 items-center p-3 rounded-xl"
      style={{ background: "#fff", border: "1px solid rgba(201,151,58,0.25)", boxShadow: "0 1px 4px rgba(90,16,32,0.06)" }}
    >
      <div
        className="w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2"
        style={{ borderColor: "#c9973a" }}
      >
        <img src={photo} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm" style={{ color: "#5a1020" }}>{name}</p>
        <p
          className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 mb-1"
          style={{ background: "rgba(201,151,58,0.15)", color: "#8b6520" }}
        >
          {role}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#9b6060" }}>{desc}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl"
      style={{ background: "#fff", border: "1px solid rgba(201,151,58,0.25)" }}
    >
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs font-bold mb-0.5" style={{ color: "#7b1c2e" }}>{label}</p>
        {children}
      </div>
    </div>
  );
}