// pages/JoinPage.jsx
// Route: /join?token=xxx
//
// WhatsApp invite link વડે આવેલ વ્યક્તિ:
//   → Mobile નંબર + PIN enter કરે
//   → Verify થાય → /tree/:treeId redirect
//
// URL format: /join?token=TREEID_IPIN  (e.g. /join?token=AB12CD_123456)
// અથવા અલગ params: /join?treeId=AB12CD&ipin=123456

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import MobileInput from "../components/ui/MobileInput";

const C = {
  maroon:  "#6b1f1f",
  gold:    "#c4993a",
  border:  "#d6c99a",
  cream:   "#fefcf5",
  bg:      "#f9f5e7",
  muted:   "#9c7c5a",
  green:   "#2e7d32",
};

const labelSt = {
  fontSize: 11, fontWeight: 700, color: C.gold,
  textTransform: "uppercase", letterSpacing: "1px",
  display: "block", marginBottom: 6,
};

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  // Token parse: ?token=TREEID_IPIN  OR  ?treeId=...&ipin=...
  const rawToken = searchParams.get("token") || "";
  const [tokenTreeId, tokenIpin] = rawToken.includes("_")
    ? rawToken.split("_")
    : ["", ""];

  const initTreeId = searchParams.get("treeId") || tokenTreeId || "";
  const initIpin   = searchParams.get("ipin")   || tokenIpin   || "";

  const [phone,   setPhone]   = useState("");
  const [cc,      setCc]      = useState("+91");
  const [ipin,    setIpin]    = useState(initIpin);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  // Token preset હોય — pine highlight
  const pinPrefilled = !!initIpin;

  const handleJoin = async () => {
    if (!phone.trim())     { setErr("મોબાઈલ નંબર દાખલ કરો"); return; }
    if (ipin.length !== 6) { setErr("6 અંકનો PIN દાખલ કરો"); return; }
    if (!initTreeId)       { setErr("URL ખોટો છે — Tree ID મળ્યો નથી"); return; }

    setLoading(true);
    setErr("");
    try {
      // /tree/:treeId?ipin=xxx&mobile=xxx → TreeGuestPage handles verification
      const fullPhone = `${cc}${phone.replace(/\D/g, "")}`;
      navigate(
        `/tree/${initTreeId.toUpperCase()}?ipin=${ipin}&mobile=${encodeURIComponent(fullPhone)}`,
        { replace: true }
      );
    } catch (e) {
      setErr("કૈક ગરબડ આવી. ફરી try કરો.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'DM Sans', sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: C.cream,
        border: `2px solid ${C.gold}`,
        borderRadius: 16,
        padding: "36px 24px",
        maxWidth: 400,
        width: "100%",
        boxShadow: "0 24px 64px rgba(60,15,15,0.2)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🌳</div>
          <h2 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22,
            color: C.maroon,
            margin: "0 0 6px",
          }}>
            Family Tree માં જોડાઓ
          </h2>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            {initTreeId
              ? <>Tree <strong style={{ color: C.maroon }}>{initTreeId.toUpperCase()}</strong> — Invite link દ્વારા</>
              : "WhatsApp link દ્વારા invite આવ્યું"}
          </p>
        </div>

        {/* Mobile */}
        <label style={labelSt}>તમારો મોબાઈલ નંબર</label>
        <MobileInput
          value={phone}
          onChange={setPhone}
          countryCode={cc}
          onCountryCodeChange={setCc}
          placeholder="મોબાઈલ નંબર"
          style={{ marginBottom: 18 }}
        />

        {/* PIN */}
        <label style={labelSt}>
          PIN (6 અંક — WhatsApp message માં હતો)
        </label>
        <input
          type="number"
          value={ipin}
          onChange={e => setIpin(e.target.value.slice(0, 6))}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          placeholder="123456"
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 10,
            border: `1.5px solid ${pinPrefilled ? "#a5d6a7" : C.border}`,
            fontSize: 28,
            textAlign: "center",
            letterSpacing: 10,
            fontWeight: 700,
            background: pinPrefilled ? "#e8f5e9" : C.bg,
            marginBottom: 6,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {pinPrefilled && (
          <p style={{ fontSize: 11, color: C.green, textAlign: "center", marginBottom: 14 }}>
            ✓ PIN auto-fill — invite link માંથી
          </p>
        )}
        {!pinPrefilled && (
          <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginBottom: 14 }}>
            PIN WhatsApp message માં મળ્યો હશે
          </p>
        )}

        {/* Error */}
        {err && (
          <div style={{
            color: "#c0392b", fontSize: 13,
            marginBottom: 14, textAlign: "center",
            padding: "10px 12px",
            background: "#ffeaea",
            borderRadius: 8,
          }}>
            {err}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleJoin}
          disabled={loading}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 10,
            border: "none",
            background: loading ? "#b0836a" : C.maroon,
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
            cursor: loading ? "wait" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Verify થઈ રહ્યું છે…" : "✓ આગળ વધો"}
        </button>

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          style={{
            width: "100%",
            padding: 11,
            marginTop: 10,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: "transparent",
            color: C.muted,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← Home પર જાઓ
        </button>
      </div>
    </div>
  );
}
