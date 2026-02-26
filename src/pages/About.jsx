export default function Contact() {

  const officeBearers = [
    { role: "President", gu: "પ્રેસિડેન્ટ", icon: "👑" },
    { role: "Vice President", gu: "વાઈસ પ્રેસિડેન્ટ", icon: "🏅" },
    { role: "Secretary", gu: "સેક્રેટરી", icon: "✍️" },
    { role: "Joint Secretary", gu: "સહ સેક્રેટરી", icon: "🤝" },
    { role: "Treasurer", gu: "ખજાનચી", icon: "💰" },
    { role: "Joint Treasurer", gu: "સહ ખજાનચી", icon: "💼" },
  ];

  const executive = [
    { role: "Executive Member", gu: "કાર્યકારી સભ્ય", icon: "👤" },
    { role: "Invited Member", gu: "આમંત્રિત સભ્ય", icon: "📨" },
    { role: "Advisor", gu: "સલાહકાર", icon: "🧠" },
  ];

  const special = [
    { role: "Coordinator", gu: "કોઓર્ડિનેટર", icon: "🔗" },
    { role: "Joint Coordinator", gu: "સહ કોઓર્ડિનેટર", icon: "🔗" },
    { role: "Media Coordinator", gu: "મીડિયા કોઓર્ડિનેટર", icon: "📣" },
    { role: "IT Coordinator", gu: "આઈટી કોઓર્ડિનેટર", icon: "💻" },
    { role: "Cultural Head", gu: "સાંસ્કૃતિક વિભાગ", icon: "🎭" },
    { role: "Sports Head", gu: "રમતગમત વિભાગ", icon: "🏏" },
    { role: "Youth Head", gu: "યુવા વિભાગ", icon: "⚡" },
    { role: "Women Head", gu: "મહિલા વિભાગ", icon: "🌸" },
  ];

  return (
    <div
      className="min-h-screen py-5 px-4"
      style={{ background: "linear-gradient(135deg,#fdf3e7 0%,#f5e6c8 40%,#fdf8ef 100%)" }}
    >
      <div className="max-w-md mx-auto space-y-4">

        {/* ── HEADER ── */}
        <div
          className="rounded-2xl px-6 py-6 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#4a0f1a 0%,#7b1c2e 50%,#9b2035 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(201,151,58,0.18) 0%,transparent 70%)" }} />
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "#c9973a" }} />
          <p className="text-lg tracking-widest mb-1 relative z-10" style={{ color: "#f0c96b", opacity: 0.7 }}>✦ ✦ ✦</p>
          <h1 className="text-lg font-bold relative z-10" style={{ color: "#f0c96b" }}>
             Organization Structure
          </h1>
          <p className="text-xs mt-1 relative z-10" style={{ color: "rgba(240,201,107,0.65)" }}>
           
          </p>
          <div className="mx-auto mt-3 h-0.5 w-16 relative z-10"
            style={{ background: "linear-gradient(90deg,transparent,#c9973a,transparent)" }} />
        </div>

        {/* ── OFFICE BEARERS ── */}
        <RoleSection
          icon="👑"
          title="મુખ્ય હોદ્દા"
          subtitle="Office Bearers"
          members={officeBearers}
          accentColor="#c9973a"
        />

        {/* ── EXECUTIVE ── */}
        <RoleSection
          icon="👥"
          title="કાર્યકારી સમિતિ"
          subtitle="Executive Committee"
          members={executive}
          accentColor="#7b1c2e"
        />

        {/* ── SPECIAL ROLES ── */}
        <RoleSection
          icon="⭐"
          title="વિશેષ જવાબદારીઓ"
          subtitle="Special Roles"
          members={special}
          accentColor="#8b6520"
          grid
        />

      </div>
    </div>
  );
}

function RoleSection({ icon, title, subtitle, members, accentColor, grid = false }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 4px 20px rgba(90,16,32,0.10)" }}
    >
      {/* Section header */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{ background: `linear-gradient(135deg,#4a0f1a,#7b1c2e)` }}
      >
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{ background: "rgba(201,151,58,0.25)", border: "1px solid rgba(201,151,58,0.5)" }}
        >
          {icon}
        </span>
        <div>
          <p className="font-bold text-sm leading-tight" style={{ color: "#f0c96b" }}>{title}</p>
          <p className="text-xs" style={{ color: "rgba(240,201,107,0.6)" }}>{subtitle}</p>
        </div>
      </div>

      {/* Members */}
      <div
        className={`p-4 ${grid ? "grid grid-cols-2 gap-2" : "space-y-2"}`}
        style={{ background: "#fff8ee" }}
      >
        {members.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{
              background: "#fff",
              border: `1px solid rgba(201,151,58,0.25)`,
              boxShadow: "0 1px 4px rgba(90,16,32,0.06)",
            }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: "rgba(201,151,58,0.12)" }}
            >
              {m.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight truncate" style={{ color: "#5a1020" }}>
                {m.gu}
              </p>
              <p className="text-xs leading-tight" style={{ color: "#9b6060" }}>
                {m.role}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Gold bottom line */}
      <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${accentColor},transparent)` }} />
    </div>
  );
}