// pages/Home.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Smart home page — 4 visitor types:
//   1. Visitor (not logged in, no invite)   → landing + WhatsApp admin contact
//   2. Logged-in, no familyId yet           → "Admin se invite lo" screen
//   3. Logged-in, has familyId (member)     → redirect to /tree
//   4. Logged-in, role = admin              → quick links: tree + invite
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect }   from "react";
import { useNavigate } from "react-router-dom";
import { useAuth }     from "../store/AuthContext";

// Admin ka WhatsApp number — yahan change karo
const ADMIN_PHONE = "919974021397";
const ADMIN_WA    = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent("નમસ્તે, મારે વંશ વૃક્ષ માં જોડાવું છે. Invite link મોકલશો?")}`;

const C = {
  bg:      "#140B05",
  surface: "#2A1A0F",
  border:  "#C9922A",
  gold:    "#F5C842",
  text:    "#FDF6E3",
  muted:   "#EADFCF",
  green:   "#25D366",
};

const cardSt = {
  background: C.surface,
  border: `1px solid ${C.border}33`,
  borderRadius: 14,
  padding: "14px 16px",
};

const waBtn = {
  display: "flex", alignItems: "center", justifyContent: "center",
  gap: 10, width: "100%", padding: "14px 0",
  borderRadius: 12, border: "none",
  background: C.green, color: "#fff",
  fontSize: 15, fontWeight: 700,
  cursor: "pointer", textDecoration: "none",
};

const primaryBtn = {
  display: "block", width: "100%", padding: "14px 0",
  borderRadius: 12, border: "none",
  background: "#6b1f1f", color: "#fff",
  fontSize: 15, fontWeight: 700,
  cursor: "pointer", textAlign: "center",
  textDecoration: "none",
};

// ── 1. Visitor (not logged in) ────────────────────────────────────────────────
function VisitorScreen() {
  return (
    <div style={{ padding: "24px 20px 120px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🌳</div>
        <h1 style={{
          fontFamily: "'Yatra One', serif",
          fontSize: 26, color: C.gold,
          margin: "0 0 12px", lineHeight: 1.3,
        }}>
          આપણા મૂળ ને જોડીએ
        </h1>
        <p style={{ fontSize: 14, color: `${C.muted}cc`, lineHeight: 1.8, margin: 0 }}>
          આ એક <strong style={{ color: C.gold }}>private</strong> family tree app છે.
          <br />ફક્ત invite મળ્યા પછી જ tree જોઈ શકાય.
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        {[
          { icon: "🌿", text: "સાત પેઢીનો ઈતિહાસ સાચવો" },
          { icon: "👨‍👩‍👧‍👦", text: "સંતાનોને સંબંધ સમજાવો" },
          { icon: "📱", text: "WhatsApp invite — 2 taps mein join" },
          { icon: "🎮", text: "Family games — Tambola, Quiz" },
        ].map((f, i) => (
          <div key={i} style={{
            ...cardSt,
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
            <span style={{ fontSize: 13, color: C.muted }}>{f.text}</span>
          </div>
        ))}
      </div>

      <div style={{ ...cardSt, marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.gold,
          letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12,
        }}>
          કેવી રીતે join કરવું?
        </div>
        {[
          "Admin ને WhatsApp કરો નીચેના button થી",
          "Admin WhatsApp invite link મોકલશે",
          "Link ખોલો — tree તરત જ દેખાશે",
          "Register કરો — permanent access મળશે",
        ].map((step, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            marginBottom: i < 3 ? 10 : 0,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "#6b1f1f", color: C.gold,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
            }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{step}</span>
          </div>
        ))}
      </div>

      <a href={ADMIN_WA} target="_blank" rel="noopener noreferrer" style={waBtn}>
        <span style={{ fontSize: 20 }}>💬</span>
        Admin ને WhatsApp કરો — Invite માંગો
      </a>
      <p style={{ textAlign: "center", fontSize: 11, color: `${C.muted}55`, marginTop: 10 }}>
        આ app ફક્ત family members માટે છે
      </p>
    </div>
  );
}

// ── 2. Logged-in but no family yet ────────────────────────────────────────────
function NoFamilyScreen({ user }) {
  const name = user?.displayName?.split(" ")[0] || "મિત્ર";
  return (
    <div style={{ padding: "40px 20px 120px", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <h2 style={{ fontFamily: "'Yatra One', serif", fontSize: 20, color: C.gold, marginBottom: 10 }}>
        નમસ્તે, {name}!
      </h2>
      <p style={{ fontSize: 14, color: `${C.muted}cc`, lineHeight: 1.8, marginBottom: 28 }}>
        તમારો account બની ગયો, પણ હજી invite મળ્યું નથી.
        <br />Admin ને WhatsApp કરો — તે invite link મોકલશે.
      </p>
      <a href={ADMIN_WA} target="_blank" rel="noopener noreferrer" style={waBtn}>
        <span style={{ fontSize: 20 }}>💬</span>
        Admin ને Invite માટે WhatsApp કરો
      </a>
      <p style={{ marginTop: 16, fontSize: 12, color: `${C.muted}55` }}>
        Invite link મળ્યા પછી link ખોલો — tree automatically open થશે
      </p>
    </div>
  );
}

// ── 3. Admin screen ───────────────────────────────────────────────────────────
function AdminScreen({ navigate }) {
  return (
    <div style={{ padding: "28px 20px 120px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>👑</div>
        <h2 style={{ fontFamily: "'Yatra One', serif", fontSize: 22, color: C.gold }}>
          Admin Dashboard
        </h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={() => navigate("/tree")} style={primaryBtn}>
          🌳 Family Tree ખોલો
        </button>
        <button onClick={() => navigate("/inv_tree")} style={{ ...primaryBtn, background: "#25D366" }}>
          📲 નવો Member Invite કરો
        </button>
        <button onClick={() => navigate("/games")} style={{ ...primaryBtn, background: "#1a3a5c" }}>
          🎮 Game શરૂ કરો
        </button>
      </div>
      <div style={{ ...cardSt, marginTop: 20 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.gold,
          letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8,
        }}>
          Invite flow
        </div>
        <div style={{ fontSize: 12, color: `${C.muted}99`, lineHeight: 1.8 }}>
          Invite tap → contact pick → WhatsApp ખુલે →
          Member link ખોલે → tree મળે → register કરે → permanent access
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, ready } = useAuth();
  const navigate        = useNavigate();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel   = "stylesheet";
    link.href  = "https://fonts.googleapis.com/css2?family=Yatra+One&family=DM+Sans:wght@400;500;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // Member with familyId — seedha /tree par bhejo
  useEffect(() => {
    if (ready && user?.familyId && user?.role !== "admin") {
      navigate("/tree", { replace: true });
    }
  }, [ready, user, navigate]);

  if (!ready) return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: `${C.muted}66`, fontSize: 14,
    }}>
      લોડ થઈ રહ્યું છે…
    </div>
  );

  // Not logged in OR anonymous
  if (!user?.uid || user?.isAnonymous) return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <VisitorScreen />
    </div>
  );

  // Admin
  if (user.role === "admin") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <AdminScreen navigate={navigate} />
    </div>
  );

  // Logged in but no family
  if (!user.familyId) return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      <NoFamilyScreen user={user} />
    </div>
  );

  // Member with family — redirect ho raha hai useEffect mein
  return null;
}