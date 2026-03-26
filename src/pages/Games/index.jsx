// pages/Games/index.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Games Home — entry point for all games
// Shows: Tambola card, Quiz card, active games, recent history
// Route: /games
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate }   from "react-router-dom";
import { useAuth }       from "../../store/AuthContext";
import { useGame }       from "../../hooks/useGame";
import { createGame, getFamilyGameHistory } from "../../db/gameDb";
import { COLORS }        from "../../constants/app";

const C = {
  bg:      COLORS.bg      || "#FAF6F0",
  primary: COLORS.primary || "#7B1C2E",
  gold:    COLORS.gold    || "#C9A84C",
  border:  COLORS.border  || "#F0E6E6",
  muted:   COLORS.textMuted || "#C0A0A0",
  text:    COLORS.textPrimary || "#3D0010",
};

// ── Game type cards ───────────────────────────────────────────────────────────
const GAME_TYPES = [
  {
    type:    "tambola",
    icon:    "🎱",
    title:   "Tambola",
    titleGu: "ટંબોલા (Housie)",
    desc:    "3×9 ticket, 90 numbers, 4 prizes",
    descGu:  "Real-time number call + claim prizes",
    color:   "#7B1C2E",
    gradient: "linear-gradient(135deg,#7B1C2E,#9B2335)",
  },
  {
    type:    "quiz",
    icon:    "❓",
    title:   "Quiz",
    titleGu: "Family Quiz",
    desc:    "20 sec timer, speed points",
    descGu:  "Real-time leaderboard",
    color:   "#1565C0",
    gradient: "linear-gradient(135deg,#1565C0,#1976D2)",
  },
];

// ── Join by code input ────────────────────────────────────────────────────────
function JoinCodeInput({ onJoin }) {
  const [code, setCode] = useState("");

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
        placeholder="Game Code"
        maxLength={6}
        style={{
          flex: 1, padding: "11px 14px", borderRadius: 10,
          border: `1.5px solid ${C.border}`, fontSize: 18,
          fontFamily: "'DM Sans',monospace", color: C.text,
          background: "#fff", outline: "none", letterSpacing: "4px",
          textAlign: "center", fontWeight: 700,
        }}
      />
      <button
        onClick={() => code.length >= 4 && onJoin(code)}
        disabled={code.length < 4}
        style={{
          padding: "11px 20px", borderRadius: 10,
          background: code.length >= 4 ? C.primary : C.border,
          border: "none", color: "#fff",
          fontWeight: 700, fontSize: 14, cursor: code.length >= 4 ? "pointer" : "default",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        Join →
      </button>
    </div>
  );
}

// ── History item ──────────────────────────────────────────────────────────────
function HistoryItem({ game }) {
  const date = new Date(game.createdAt).toLocaleDateString("gu-IN", {
    day: "numeric", month: "short",
  });
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", background: "#fff",
      border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 8,
    }}>
      <div style={{ fontSize: 22 }}>{game.type === "tambola" ? "🎱" : "❓"}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>
          {game.type === "tambola" ? "Tambola" : "Quiz"}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {date} · {game.playerCount || "?"} players
        </div>
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, padding: "3px 8px",
        borderRadius: 20, background: "#E8F5EA", color: "#2E7D32",
        border: "1px solid #A5D6A7",
      }}>Finished</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function GamesHome() {
  const navigate     = useNavigate();
  const { user, profile } = useAuth();

  const [creating,   setCreating]   = useState(false);
  const [history,    setHistory]    = useState([]);
  const [joining,    setJoining]    = useState(false);
  const [joinError,  setJoinError]  = useState("");

  const familyId   = profile?.familyId || null;
  const isGameHost = profile?.role === "admin" || profile?.role === "gameHost";

  const { findByCode } = useGame(null, user?.uid);

  // Load game history
  useEffect(() => {
    if (!familyId) return;
    getFamilyGameHistory(familyId, 5)
      .then(setHistory)
      .catch(console.warn);
  }, [familyId]);

  // Create a new game
  const handleCreate = async (type) => {
    if (!user?.uid || !isGameHost) return;
    setCreating(true);
    try {
      const { gameId, gameCode } = await createGame({
        type,
        familyId,
        hostId:   user.uid,
        hostName: user.displayName || "",
        maxPlayers: 100,
      });
      navigate(`/games/${type}/${gameId}?host=1`);
    } catch (e) {
      console.error("Create game failed:", e);
    } finally {
      setCreating(false);
    }
  };

  // Join by code
  const handleJoin = async (code) => {
    setJoining(true);
    setJoinError("");
    try {
      const result = await findByCode(code);
      if (!result) { setJoinError("Game code invalid છે"); return; }
      const { gameId, game } = result;
      navigate(`/games/${game.type}/${gameId}`);
    } catch (e) {
      setJoinError("Could not find game. Try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg,${C.primary},#9B2335)`,
        padding: "20px 20px 28px",
      }}>
        <div style={{ fontFamily: "'DM Serif Display',serif",
          fontSize: 22, color: "#fff", marginBottom: 4 }}>
          🎮 Games
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
          Family સાથે real-time games
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>

        {/* Join by code */}
        <div style={{
          background: "#fff", border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "16px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted,
            letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>
            Game Code થી Join
          </div>
          <JoinCodeInput onJoin={handleJoin} />
          {joinError && (
            <div style={{ fontSize: 12, color: "#991B1B", marginTop: 8 }}>{joinError}</div>
          )}
        </div>

        {/* Game type cards */}
        {isGameHost && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted,
              letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
              New Game Create
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {GAME_TYPES.map(gt => (
                <button
                  key={gt.type}
                  onClick={() => handleCreate(gt.type)}
                  disabled={creating}
                  style={{
                    background: gt.gradient, border: "none",
                    borderRadius: 16, padding: "20px 14px",
                    textAlign: "left", cursor: "pointer",
                    boxShadow: `0 4px 16px ${gt.color}33`,
                    opacity: creating ? 0.7 : 1,
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{gt.icon}</div>
                  <div style={{ fontFamily: "'DM Serif Display',serif",
                    fontSize: 16, color: "#fff", marginBottom: 4 }}>
                    {gt.titleGu}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
                    {gt.descGu}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Recent history */}
        {history.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted,
              letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
              Recent Games
            </div>
            {history.map(g => <HistoryItem key={g.id} game={g} />)}
          </>
        )}

        {/* No games yet */}
        {!isGameHost && history.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎮</div>
            <div style={{ fontSize: 14 }}>Game code enter કરીને join કરો</div>
          </div>
        )}
      </div>
    </div>
  );
}
