// pages/Games/Tambola/index.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Tambola game page — Player + Host in one file
// Route: /games/tambola/:gameId
// Query: ?host=1 for host view
// ─────────────────────────────────────────────────────────────────────────────

import { useState }      from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth }       from "../../../store/AuthContext";
import { useGame }       from "../../../hooks/useGame";
import { useTambola }    from "../../../hooks/useGame";
import { COLORS }        from "../../../constants/app";

const C = {
  bg:      COLORS.bg      || "#FAF6F0",
  primary: COLORS.primary || "#7B1C2E",
  gold:    COLORS.gold    || "#C9A84C",
  border:  COLORS.border  || "#F0E6E6",
  muted:   COLORS.textMuted || "#C0A0A0",
  text:    COLORS.textPrimary || "#3D0010",
  green:   "#2E7D32",  greenBg: "#E8F5EA",
  red:     "#C62828",  redBg:   "#FFEBEE",
};

// ── Ticket cell ───────────────────────────────────────────────────────────────
function TicketCell({ num, marked, called, onTap }) {
  const isBlank  = num === 0;
  const isCalled = called && num > 0 && called.includes(num);
  const isMarked = marked;

  return (
    <div onClick={() => !isBlank && isCalled && onTap()}
      style={{
        width: "100%", aspectRatio: "1",
        borderRadius: 6,
        background: isBlank ? "transparent"
          : isMarked ? C.primary
          : isCalled ? `${C.primary}22`
          : "#fff",
        border: isBlank ? "none" : `1.5px solid ${isMarked ? C.primary : C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700,
        color: isMarked ? "#fff" : isCalled ? C.primary : C.text,
        cursor: (!isBlank && isCalled && !isMarked) ? "pointer" : "default",
        transition: "all .15s",
        boxShadow: isMarked ? `0 2px 8px ${C.primary}44` : "none",
      }}
    >
      {isBlank ? "" : num}
    </div>
  );
}

// ── Ticket grid ───────────────────────────────────────────────────────────────
function TicketGrid({ ticket, calledNumbers, onTap }) {
  if (!ticket?.numbers) return null;
  return (
    <div style={{
      background: "#fff", border: `1.5px solid ${C.border}`,
      borderRadius: 14, padding: 12, overflow: "hidden",
    }}>
      {ticket.numbers.map((row, ri) => (
        <div key={ri} style={{
          display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 3, marginBottom: ri < 2 ? 3 : 0,
        }}>
          {row.map((num, ci) => (
            <TicketCell
              key={ci} num={num}
              marked={ticket.marked?.[ri]?.[ci] === true}
              called={calledNumbers}
              onTap={() => onTap(ri, ci)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Prize button ──────────────────────────────────────────────────────────────
function PrizeBtn({ label, canClaim, won, winnerName, onClaim }) {
  if (won) return (
    <div style={{
      padding: "9px 12px", borderRadius: 10,
      background: C.greenBg, border: `1px solid #A5D6A7`,
      fontSize: 11, fontWeight: 600, color: C.green, textAlign: "center",
    }}>
      ✅ {label} — {winnerName || "Won!"}
    </div>
  );

  return (
    <button onClick={onClaim} disabled={!canClaim} style={{
      width: "100%", padding: "9px 12px", borderRadius: 10,
      background: canClaim ? C.primary : C.border,
      border: "none", color: "#fff",
      fontWeight: 700, fontSize: 11, cursor: canClaim ? "pointer" : "default",
      fontFamily: "'DM Sans',sans-serif", opacity: canClaim ? 1 : 0.5,
    }}>
      🏆 Claim {label}
    </button>
  );
}

// ── Number ball ───────────────────────────────────────────────────────────────
function NumberBall({ num, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg,${C.primary},#9B2335)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 800, color: "#fff",
      fontFamily: "'DM Serif Display',serif",
      boxShadow: `0 4px 16px ${C.primary}44`,
      flexShrink: 0,
    }}>
      {num}
    </div>
  );
}

// ── Leaderboard row ───────────────────────────────────────────────────────────
function LbRow({ player, rank, isMe }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", borderRadius: 10, marginBottom: 6,
      background: isMe ? `${C.primary}11` : "#fff",
      border: `1px solid ${isMe ? C.primary : C.border}`,
    }}>
      <div style={{ fontSize: 14, width: 24, textAlign: "center" }}>{medal}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
          {player.name}{isMe ? " (તમે)" : ""}
        </div>
        {player.familyName && (
          <div style={{ fontSize: 10, color: C.muted }}>{player.familyName}</div>
        )}
      </div>
      <div style={{ fontFamily: "'DM Serif Display',serif",
        fontSize: 16, fontWeight: 700, color: C.gold }}>
        {player.score}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TambolaPage() {
  const { gameId }    = useParams();
  const [params]      = useSearchParams();
  const navigate      = useNavigate();
  const { user, profile } = useAuth();

  const isHostParam  = params.get("host") === "1";
  const [tab, setTab] = useState("ticket"); // "ticket" | "leaderboard"

  const gameHook    = useGame(gameId, user?.uid, {
    name:       user?.displayName || "",
    familyName: profile?.familyName || "",
    photoURL:   user?.photoURL || "",
  });

  const tambolaHook = useTambola(gameId, user?.uid, isHostParam && gameHook.isHost);

  // Auto-join on mount if player
  useState(() => {
    if (!isHostParam && gameHook.game && !gameHook.myPlayer) {
      gameHook.join();
    }
  }, [gameHook.game]);

  // ── Lobby ────────────────────────────────────────────────────────────────
  if (gameHook.isWaiting) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg }}>
        <div style={{
          background: `linear-gradient(135deg,${C.primary},#9B2335)`,
          padding: "20px 20px 28px",
        }}>
          <button onClick={() => navigate("/games")} style={{
            background: "rgba(255,255,255,0.15)", border: "none",
            borderRadius: 8, width: 32, height: 32, color: "#fff", cursor: "pointer", fontSize: 16,
          }}>‹</button>
          <div style={{ fontFamily: "'DM Serif Display',serif",
            fontSize: 22, color: "#fff", marginTop: 12 }}>🎱 Tambola</div>
        </div>

        <div style={{ padding: "24px 16px" }}>
          {/* Code */}
          <div style={{
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: "2px",
              textTransform: "uppercase", marginBottom: 6 }}>Game Code</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36,
              fontWeight: 700, color: C.primary, letterSpacing: "6px" }}>
              {gameHook.gameCode}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              {gameHook.playerCount} players joined
            </div>
          </div>

          {/* Players */}
          <div style={{ marginBottom: 20 }}>
            {gameHook.players.map(p => (
              <div key={p.uid} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", background: "#fff",
                border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 6,
              }}>
                <div style={{ fontSize: 18 }}>👤</div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>
                  {p.name}
                </div>
                {p.uid === user?.uid && (
                  <span style={{ fontSize: 10, color: C.gold }}>You</span>
                )}
              </div>
            ))}
          </div>

          {/* Host start button */}
          {gameHook.isHost && (
            <button onClick={tambolaHook.startTambola} style={{
              width: "100%", padding: 15, borderRadius: 12,
              background: `linear-gradient(135deg,${C.primary},#9B2335)`,
              border: "none", color: "#fff",
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: `0 4px 20px ${C.primary}44`,
            }}>
              🎱 Game Start કરો ({gameHook.playerCount} players)
            </button>
          )}

          {!gameHook.isHost && (
            <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: 16 }}>
              Host ની start ની રાહ જોઈ રહ્યા છો...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Active Game ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: C.bg, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg,${C.primary},#9B2335)`,
        padding: "12px 16px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 20 }}>🎱</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Serif Display',serif",
              fontSize: 15, color: "#fff" }}>Tambola</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
              {tambolaHook.calledNumbers.length} numbers called
            </div>
          </div>
          {/* Score */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'DM Serif Display',serif",
              fontSize: 20, color: C.gold }}>{gameHook.myScore}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
              Rank #{gameHook.myRank || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Current number */}
      {tambolaHook.currentNumber && (
        <div style={{
          display: "flex", justifyContent: "center",
          padding: "16px 0 8px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 11, color: C.muted }}>Called</div>
            <NumberBall num={tambolaHook.currentNumber} size={56} />
            <div style={{ fontSize: 11, color: C.muted }}>
              {tambolaHook.calledNumbers.length}/90
            </div>
          </div>
        </div>
      )}

      {/* Host: call number button */}
      {gameHook.isHost && (
        <div style={{ padding: "0 16px 12px" }}>
          <button
            onClick={tambolaHook.callNumber}
            disabled={tambolaHook.calling || tambolaHook.allPrizesWon}
            style={{
              width: "100%", padding: 14, borderRadius: 12,
              background: tambolaHook.allPrizesWon ? C.border : `linear-gradient(135deg,${C.primary},#9B2335)`,
              border: "none", color: "#fff",
              fontWeight: 700, fontSize: 15, cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {tambolaHook.calling ? "Calling..." :
             tambolaHook.allPrizesWon ? "All Prizes Won! 🎉" : "📢 Next Number Call"}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", margin: "0 16px 12px",
        background: "#fff", borderRadius: 10, padding: 3,
        border: `1px solid ${C.border}`,
      }}>
        {["ticket", "leaderboard"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
            background: tab === t ? C.primary : "transparent",
            color: tab === t ? "#fff" : C.muted,
            fontWeight: 600, fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
          }}>
            {t === "ticket" ? "🎫 Ticket" : "🏆 Leaderboard"}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 16px" }}>
        {tab === "ticket" && (
          <>
            {/* Ticket */}
            {tambolaHook.ticket ? (
              <TicketGrid
                ticket={tambolaHook.ticket}
                calledNumbers={tambolaHook.calledNumbers}
                onTap={(r, c) => tambolaHook.tapNumber(r, c)}
              />
            ) : (
              <div style={{ textAlign: "center", color: C.muted,
                padding: 24, fontSize: 13 }}>
                Ticket load થઈ રહ્યું છે...
              </div>
            )}

            {/* Prize buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
              {[
                { key: "topLine",    label: "Top Line",    can: tambolaHook.canClaimTopLine },
                { key: "middleLine", label: "Middle Line", can: tambolaHook.canClaimMiddleLine },
                { key: "bottomLine", label: "Bottom Line", can: tambolaHook.canClaimBottomLine },
                { key: "fullHouse",  label: "Full House",  can: tambolaHook.canClaimFullHouse },
              ].map(({ key, label, can }) => (
                <PrizeBtn
                  key={key} label={label} canClaim={can}
                  won={tambolaHook.prizes[key]?.won}
                  winnerName={tambolaHook.prizes[key]?.winnerName}
                  onClaim={() => tambolaHook.claim(key)}
                />
              ))}
            </div>

            {tambolaHook.claimResult && (
              <div style={{
                marginTop: 12, padding: "10px 14px", borderRadius: 10,
                background: tambolaHook.claimResult.valid ? C.greenBg : C.redBg,
                border: `1px solid ${tambolaHook.claimResult.valid ? "#A5D6A7" : "#FFCDD2"}`,
                fontSize: 13, fontWeight: 600, textAlign: "center",
                color: tambolaHook.claimResult.valid ? C.green : C.red,
              }}>
                {tambolaHook.claimResult.valid
                  ? `🎉 Prize Won! +${tambolaHook.claimResult.points} points`
                  : `❌ Invalid claim: ${tambolaHook.claimResult.reason}`}
              </div>
            )}
          </>
        )}

        {tab === "leaderboard" && (
          <div>
            {gameHook.players.map(p => (
              <LbRow key={p.uid} player={p} rank={p.rank} isMe={p.uid === user?.uid} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
