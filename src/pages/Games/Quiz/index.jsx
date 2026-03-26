// pages/Games/Quiz/index.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Kahoot-style Quiz page — Player + Host
// Route: /games/quiz/:gameId
// Query: ?host=1 for host view
// ─────────────────────────────────────────────────────────────────────────────

import { useState }   from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth }    from "../../../store/AuthContext";
import { useGame, useQuiz } from "../../../hooks/useGame";
import { COLORS }     from "../../../constants/app";

const C = {
  bg:      COLORS.bg      || "#FAF6F0",
  primary: COLORS.primary || "#7B1C2E",
  gold:    COLORS.gold    || "#C9A84C",
  border:  COLORS.border  || "#F0E6E6",
  muted:   COLORS.textMuted || "#C0A0A0",
  text:    COLORS.textPrimary || "#3D0010",
  A: "#E53935", ABg: "#FFEBEE",
  B: "#F57C00", BBg: "#FFF3E0",
  C: "#2E7D32", CBg: "#E8F5EA",
  D: "#1565C0", DBg: "#E3F2FD",
};

const OPT_COLORS = [
  { fg: C.A, bg: C.ABg, icon: "🔴" },
  { fg: C.B, bg: C.BBg, icon: "🟡" },
  { fg: C.C, bg: C.CBg, icon: "🟢" },
  { fg: C.D, bg: C.DBg, icon: "🔵" },
];

// ── Timer ring ────────────────────────────────────────────────────────────────
function TimerRing({ timeLeft, total = 20 }) {
  const r   = 28;
  const circ = 2 * Math.PI * r;
  const pct = timeLeft / total;
  const off = circ * (1 - pct);
  const stroke = timeLeft > 10 ? C.D : timeLeft > 5 ? C.B : C.A;

  return (
    <div style={{ position: "relative", width: 64, height: 64 }}>
      <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r={r} fill="none" stroke={C.border} strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={stroke} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Serif Display',serif", fontSize: 20,
        fontWeight: 700, color: stroke,
      }}>
        {timeLeft}
      </div>
    </div>
  );
}

// ── Option button ─────────────────────────────────────────────────────────────
function OptionBtn({ text, index, selected, correct, showAnswer, disabled, onClick }) {
  const col   = OPT_COLORS[index] || OPT_COLORS[0];
  const isRight   = showAnswer && index === correct;
  const isWrong   = showAnswer && selected === index && index !== correct;
  const isSelected = !showAnswer && selected === index;

  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "14px 14px",
      borderRadius: 14, border: `2px solid`,
      borderColor: isRight ? C.C : isWrong ? C.A : isSelected ? col.fg : C.border,
      background: isRight ? C.CBg : isWrong ? C.ABg : isSelected ? `${col.fg}18` : "#fff",
      display: "flex", alignItems: "center", gap: 10,
      cursor: disabled ? "default" : "pointer",
      textAlign: "left",
      transition: "all .2s",
      boxShadow: isSelected ? `0 3px 12px ${col.fg}33` : "none",
      fontFamily: "'DM Sans',sans-serif",
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>
        {showAnswer ? (isRight ? "✅" : isWrong ? "❌" : col.icon) : col.icon}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: isRight ? C.C : isWrong ? C.A : col.fg,
        fontFamily: "'Noto Sans Gujarati','DM Sans',sans-serif",
        flex: 1,
      }}>
        {text}
      </span>
    </button>
  );
}

// ── Leaderboard row ───────────────────────────────────────────────────────────
function LbRow({ player, rank, isMe, prevRank }) {
  const medal  = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
  const delta  = prevRank ? prevRank - rank : 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", borderRadius: 12, marginBottom: 6,
      background: isMe ? `${C.primary}11` : "#fff",
      border: `1.5px solid ${isMe ? C.primary : C.border}`,
      animation: "slideIn .4s ease",
    }}>
      <div style={{ fontSize: 15, width: 24, textAlign: "center", flexShrink: 0 }}>{medal}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text,
          fontFamily: "'Noto Sans Gujarati','DM Sans',sans-serif" }}>
          {player.name}{isMe ? " (તમે)" : ""}
        </div>
        {player.familyName && (
          <div style={{ fontSize: 10, color: C.muted }}>{player.familyName}</div>
        )}
      </div>
      {delta !== 0 && (
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: delta > 0 ? C.C : C.A,
        }}>
          {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
        </div>
      )}
      <div style={{ fontFamily: "'DM Serif Display',serif",
        fontSize: 18, fontWeight: 700, color: C.gold, minWidth: 40, textAlign: "right" }}>
        {player.score}
      </div>
    </div>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ players }) {
  const top3  = players.slice(0, 3);
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = [52, 72, 40];
  const medals  = ["🥈", "🥇", "🥉"];

  return (
    <div style={{ display: "flex", alignItems: "flex-end",
      justifyContent: "center", gap: 12, margin: "20px 0" }}>
      {order.map((p, i) => (
        <div key={p?.uid || i} style={{ display: "flex", flexDirection: "column",
          alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 28 }}>👤</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, textAlign: "center",
            maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "'Noto Sans Gujarati','DM Sans',sans-serif" }}>
            {p?.name || ""}
          </div>
          <div style={{ fontFamily: "'DM Serif Display',serif",
            fontSize: 14, color: C.gold }}>{p?.score || 0}</div>
          <div style={{
            width: 70, height: heights[i],
            borderRadius: "6px 6px 0 0",
            background: i === 1
              ? `linear-gradient(180deg,#C9A84C,#9A7830)`
              : i === 0
                ? `linear-gradient(180deg,#9EA5B0,#70787F)`
                : `linear-gradient(180deg,#C87830,#A05020)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            {medals[i]}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { gameId }   = useParams();
  const [params]     = useSearchParams();
  const navigate     = useNavigate();
  const { user, profile } = useAuth();

  const isHostParam  = params.get("host") === "1";
  const [selectedOpt, setSelectedOpt] = useState(null);

  const gameHook = useGame(gameId, user?.uid, {
    name:       user?.displayName || "",
    familyName: profile?.familyName || "",
    photoURL:   user?.photoURL || "",
  });

  const quizHook = useQuiz(gameId, user?.uid, isHostParam && gameHook.isHost);

  // Auto-join
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
          background: "linear-gradient(135deg,#1565C0,#1976D2)",
          padding: "20px 20px 28px",
        }}>
          <button onClick={() => navigate("/games")} style={{
            background:"rgba(255,255,255,0.15)", border:"none",
            borderRadius:8, width:32, height:32, color:"#fff", cursor:"pointer", fontSize:16,
          }}>‹</button>
          <div style={{ fontFamily:"'DM Serif Display',serif",
            fontSize:22, color:"#fff", marginTop:12 }}>❓ Quiz</div>
        </div>

        <div style={{ padding: "24px 16px" }}>
          <div style={{
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: "2px",
              textTransform: "uppercase", marginBottom: 6 }}>Game Code</div>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 36,
              fontWeight: 700, color: "#1565C0", letterSpacing: "6px" }}>
              {gameHook.gameCode}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              {gameHook.playerCount} players joined
            </div>
          </div>

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
            </div>
          ))}

          {gameHook.isHost && (
            <button onClick={quizHook.start} disabled={gameHook.playerCount < 1} style={{
              width: "100%", marginTop: 8, padding: 15, borderRadius: 12,
              background: "linear-gradient(135deg,#1565C0,#1976D2)",
              border: "none", color: "#fff", fontWeight: 700, fontSize: 15,
              cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            }}>
              ❓ Quiz Start ({gameHook.playerCount} players)
            </button>
          )}

          {!gameHook.isHost && (
            <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: 20 }}>
              Host ની start ની રાહ...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Final ────────────────────────────────────────────────────────────────
  if (gameHook.isFinished || quizHook.quizStatus === "finished") {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, paddingBottom: 60 }}>
        <div style={{
          background: "linear-gradient(135deg,#C9A84C,#9A7830)",
          padding: "20px 20px 24px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
          <div style={{ fontFamily: "'DM Serif Display',serif",
            fontSize: 24, color: "#fff" }}>Quiz Complete!</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
            {quizHook.totalQuestions} Questions
          </div>
        </div>

        <div style={{ padding: "0 16px" }}>
          <Podium players={gameHook.players} />

          {/* My result */}
          <div style={{
            background: "#fff", border: `1.5px solid ${C.primary}44`,
            borderRadius: 14, padding: "14px 16px", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ fontSize: 28 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                {user?.displayName || "You"}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                {[
                  { v: gameHook.myScore, l: "Score", c: C.gold },
                  { v: `${Object.values(quizHook.myAnswers).filter(a => a.correct).length}/${quizHook.totalQuestions}`, l: "Correct", c: C.C },
                  { v: `#${gameHook.myRank || "—"}`, l: "Rank", c: "#1565C0" },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Serif Display',serif",
                      fontSize: 18, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: C.muted }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => navigate("/games")} style={{
            width: "100%", padding: 14, borderRadius: 12,
            background: C.primary, border: "none",
            color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
          }}>
            🎮 Games Home
          </button>
        </div>
      </div>
    );
  }

  // ── Active: Question screen ───────────────────────────────────────────────
  const q    = quizHook.currentQ;
  const qIdx = quizHook.currentQIdx;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, paddingBottom: 60 }}>

      {/* Header: progress + timer + score */}
      <div style={{
        background: "linear-gradient(135deg,#1565C0,#1976D2)",
        padding: "12px 16px 16px",
      }}>
        {/* Progress bar */}
        <div style={{ height: 4, background: "rgba(255,255,255,0.2)",
          borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: C.gold,
            width: `${((qIdx + 1) / quizHook.totalQuestions) * 100}%`,
            transition: "width .5s ease",
          }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
              Question {qIdx + 1} of {quizHook.totalQuestions}
            </div>
          </div>
          <TimerRing timeLeft={quizHook.timeLeft} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'DM Serif Display',serif",
              fontSize: 20, color: C.gold }}>{gameHook.myScore}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>pts</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* Question card */}
        {q && (
          <div style={{
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 16, padding: "16px 16px 14px", marginBottom: 14,
            position: "relative", overflow: "hidden",
          }}>
            {/* Top gradient line */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0,
              height: 3, background: "linear-gradient(to right,#1565C0,#C9A84C,#7B1C2E)" }} />

            <div style={{ fontSize: 10, fontWeight: 700, color: "#1565C0",
              letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8,
              marginTop: 4 }}>
              {q.category === "family" ? "🌳 FAMILY" :
               q.category === "gk" ? "🧠 GK" :
               q.category === "gujarati" ? "🙏 GUJARATI" : "❓ QUIZ"}
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.5,
              fontFamily: "'Noto Sans Gujarati','DM Serif Display',sans-serif",
            }}>
              {q.text}
            </div>
          </div>
        )}

        {/* Options */}
        {q && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(q.options || []).map((opt, i) => (
              <OptionBtn
                key={i}
                text={opt}
                index={i}
                selected={quizHook.myAnswerForQ?.answer ?? selectedOpt}
                correct={q.correctIndex}
                showAnswer={quizHook.showAnswer}
                disabled={quizHook.hasAnswered || quizHook.submitting}
                onClick={async () => {
                  if (quizHook.hasAnswered) return;
                  setSelectedOpt(i);
                  const result = await quizHook.submit(i);
                  if (result?.pointsEarned > 0) {
                    // could show toast
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Answer reveal feedback */}
        {quizHook.showAnswer && quizHook.myAnswerForQ && (
          <div style={{
            marginTop: 12, padding: "12px 14px", borderRadius: 12,
            background: quizHook.isCorrect ? C.CBg : C.ABg,
            border: `1px solid ${quizHook.isCorrect ? "#A5D6A7" : "#FFCDD2"}`,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ fontSize: 22 }}>{quizHook.isCorrect ? "🎉" : "😔"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13,
                color: quizHook.isCorrect ? C.C : C.A }}>
                {quizHook.isCorrect ? "સાચો જવાબ!" : "ખોટો જવાબ!"}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                {quizHook.isCorrect
                  ? `+${quizHook.myAnswerForQ.pointsEarned} points`
                  : `Correct: ${q?.options?.[q?.correctIndex] || ""}`}
              </div>
            </div>
          </div>
        )}

        {/* Live leaderboard after answer */}
        {quizHook.showAnswer && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted,
              letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
              🏆 Leaderboard
            </div>
            {gameHook.players.slice(0, 5).map(p => (
              <LbRow key={p.uid} player={p} rank={p.rank} isMe={p.uid === user?.uid} />
            ))}
          </div>
        )}

        {/* Host: next question button */}
        {gameHook.isHost && quizHook.showAnswer && (
          <button onClick={quizHook.nextQuestion} style={{
            width: "100%", marginTop: 14, padding: 14, borderRadius: 12,
            background: quizHook.isLastQuestion
              ? `linear-gradient(135deg,${C.gold},#9A7830)`
              : "linear-gradient(135deg,#1565C0,#1976D2)",
            border: "none", color: "#fff",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif",
          }}>
            {quizHook.isLastQuestion ? "🏆 Final Result" : `Q${qIdx + 2} →`}
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
      `}</style>
    </div>
  );
}
