/**
 * LeaderboardPage.jsx — Tailwind v4
 * Upload Award: myContacts per user (deduped) → registered before deadline
 * Invite Award: invitedBy per user → registered before deadline
 * Deadline: /config/registrationDeadline
 */

import { useState, useEffect, useContext, useCallback } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const medal   = (i) => ["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`;
const fmtDate = (ms) => ms
  ? new Date(ms).toLocaleDateString("gu-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

export default function LeaderboardPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [tab,         setTab]         = useState("upload");
  const [uploaders,   setUploaders]   = useState([]);
  const [inviters,    setInviters]    = useState([]);
  const [deadline,    setDeadline]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dlSnap = await get(ref(db, "config/registrationDeadline"));
      const dl     = dlSnap.exists() ? new Date(dlSnap.val()).getTime() : null;
      setDeadline(dl);

      const connSnap = await get(ref(db, "connectors"));
      if (!connSnap.exists()) { setLoading(false); return; }

      const connData  = {};
      const inviteMap = {};
      const uids      = new Set();

      connSnap.forEach(child => {
        const d = child.val();
        connData[child.key] = d;
        if (d.invitedBy) {
          uids.add(d.invitedBy);
          if (!inviteMap[d.invitedBy]) inviteMap[d.invitedBy] = { total: 0, qualifies: 0 };
          inviteMap[d.invitedBy].total += 1;
          if (d.joinedUserId && (!dl || (d.joinedAt && d.joinedAt <= dl)))
            inviteMap[d.invitedBy].qualifies += 1;
        }
        if (d.uploadedBy) uids.add(d.uploadedBy);
      });

      const uploadMap = {};
      await Promise.all([...uids].map(async uid => {
        try {
          const mcSnap = await get(ref(db, `users/${uid}/myContacts`));
          if (!mcSnap.exists()) return;
          let total = 0, qualifies = 0;
          mcSnap.forEach(child => {
            const conn = connData[child.key];
            total += 1;
            if (conn?.joinedUserId && (!dl || (conn.joinedAt && conn.joinedAt <= dl))) qualifies += 1;
          });
          uploadMap[uid] = { total, qualifies };
        } catch (_) {}
      }));

      const allUids = new Set([...Object.keys(uploadMap), ...Object.keys(inviteMap)]);
      const nameMap = Object.fromEntries(
        await Promise.all([...allUids].map(async uid => {
          try {
            // ✅ FIX 3: userSchema has no profile.name — read memberId → members/{id}/name
            const userSnap = await get(ref(db, `users/${uid}`));
            const userData = userSnap.exists() ? userSnap.val() : {};
            const memberId = userData.memberId;
            if (memberId) {
              const nameSnap = await get(ref(db, `members/${memberId}/name`));
              if (nameSnap.exists()) return [uid, nameSnap.val()];
            }
            // fallback: use email prefix or UID slice
            return [uid, userData.email?.split("@")[0] || uid.slice(0, 8)];
          } catch { return [uid, uid.slice(0, 8)]; }
        }))
      );

      const makeRows = map =>
        Object.entries(map)
          .map(([uid, { total, qualifies }]) => ({
            uid, total, qualifies,
            name: nameMap[uid] || uid.slice(0, 8),
            isMe: uid === user?.uid,
          }))
          .sort((a, b) => b.qualifies - a.qualifies || b.total - a.total);

      setUploaders(makeRows(uploadMap));
      setInviters(makeRows(inviteMap));
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const rows           = tab === "upload" ? uploaders : inviters;
  const myRank         = rows.findIndex(r => r.isMe) + 1;
  const myRow          = rows.find(r => r.isMe);
  const totalContacts  = rows.reduce((s, r) => s + r.total,    0);
  const totalQualifies = rows.reduce((s, r) => s + r.qualifies, 0);
  const deadlinePassed = deadline && Date.now() > deadline;

  return (
    <div className="min-h-screen pb-16" style={{ background: "#080d1a", color: "#e2e8f0" }}>

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(160deg,#0f172a 0%,#1a2744 60%,#0f3460 100%)" }}
        className="px-4 pt-4 pb-7">
        <button onClick={() => navigate(-1)}
          className="text-blue-300 text-sm font-bold px-3.5 py-1.5 rounded-lg border-0 cursor-pointer mb-4"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          ← પાછળ
        </button>

        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "radial-gradient(circle,rgba(251,191,36,0.2),transparent 70%)", border: "2px solid rgba(251,191,36,0.35)", filter: "drop-shadow(0 0 12px rgba(251,191,36,0.3))" }}>
            <span className="text-4xl">🏆</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Leaderboard</h1>
          <p className="text-[10px] font-bold tracking-[4px] text-blue-300 mt-1 mb-4">OSWAL CONNECTORS</p>

          {/* deadline chip */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl mb-4 border"
            style={{
              background: "rgba(255,255,255,0.05)",
              borderColor: deadlinePassed ? "#ef4444" : "#f59e0b"
            }}>
            <span>{deadlinePassed ? "🔒" : "⏳"}</span>
            <div className="text-left">
              <p className="text-[9px] font-black tracking-[1.5px] uppercase"
                style={{ color: deadlinePassed ? "#ef4444" : "#f59e0b" }}>
                {deadlinePassed ? "Registration Closed" : "Registration Deadline"}
              </p>
              <p className="text-sm font-black text-white">{deadline ? fmtDate(deadline) : "Admin set કરશે"}</p>
            </div>
          </div>

          {/* summary pills */}
          <div className="flex justify-center gap-2 flex-wrap">
            {[
              { label: "Participants", value: rows.length,      color: "#60a5fa" },
              { label: tab === "upload" ? "Uploaded" : "Invited", value: totalContacts, color: "#a78bfa" },
              { label: "Registered ✅", value: totalQualifies,  color: "#34d399" },
            ].map(p => (
              <div key={p.label}
                className="px-3 py-2 rounded-xl text-center min-w-[76px] border"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: p.color }}>
                <div className="text-lg font-black" style={{ color: p.color }}>{p.value}</div>
                <div className="text-[9px] text-slate-400 font-semibold mt-0.5">{p.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* my rank card */}
        {myRow && (
          <div className="max-w-lg mx-auto mt-4 rounded-2xl px-4 py-3"
            style={{ background: "rgba(251,191,36,0.1)", border: "1.5px solid rgba(251,191,36,0.35)" }}>
            <p className="text-[9px] font-black tracking-[2px] text-amber-400">MY RANK</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-3xl font-black text-amber-400">#{myRank}</span>
              <div className="flex-1">
                <p className="font-black text-base text-white">{myRow.name}</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {tab === "upload" ? "📤" : "📲"} {myRow.total} &nbsp;·&nbsp; ✅ {myRow.qualifies} registered
                </p>
              </div>
              {myRank <= 3 && <span className="text-3xl">{medal(myRank - 1)}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div className="sticky top-0 z-20 border-b border-slate-800"
        style={{ background: "#0d1424" }}>
        <div className="max-w-lg mx-auto flex">
          {[
            { key: "upload", icon: "📤", label: "Upload Award", sub: "Unique contacts" },
            { key: "invite", icon: "📲", label: "Invite Award",  sub: "Invites sent"   },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 border-0 bg-transparent cursor-pointer transition-all border-b-[3px] -mb-px
                ${tab === t.key ? "text-slate-100 border-blue-400" : "text-slate-500 border-transparent"}`}>
              <span className="text-xl">{t.icon}</span>
              <div className="text-left">
                <div className="text-sm font-black">{t.label}</div>
                <div className="text-[10px] opacity-50">{t.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ranking note */}
      <div className="max-w-lg mx-auto mt-3 mx-4 px-4 py-2.5 rounded-xl flex gap-2 text-xs font-semibold text-slate-500"
        style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.12)" }}>
        <span>ℹ️</span>
        <span>Ranking = <strong className="text-emerald-400">deadline પહેલા register</strong> થયેલા contacts. Tie → total count.</span>
      </div>

      {/* ── TABLE ── */}
      <div className="max-w-lg mx-auto px-3 mt-3">

        {/* legend */}
        <div className="flex items-center gap-1.5 px-2.5 pb-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-800 mb-2">
          <span className="w-9">  #</span>
          <span className="flex-1">Name</span>
          <span className="w-20 text-right">{tab === "upload" ? "Uploaded" : "Invited"}</span>
          <span className="w-20 text-right">Registered</span>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-14 text-slate-500 font-semibold">
            <div className="w-8 h-8 rounded-full border-[3px] border-slate-700 border-t-blue-400 animate-spin" />
            Loading…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="text-center py-14 text-slate-500 font-bold">
            <div className="text-4xl mb-2">📭</div>
            <div>કોઈ data નથી</div>
          </div>
        )}

        {!loading && rows.map((row, i) => {
          const pct      = row.total > 0 ? Math.round((row.qualifies / row.total) * 100) : 0;
          const barColor = i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#f97316" : "#10b981";
          return (
            <div key={row.uid}
              className="flex items-center gap-1.5 px-2.5 py-3 rounded-2xl mb-2 border transition-all"
              style={{
                background:   row.isMe ? "rgba(251,191,36,0.05)" : i < 3 ? "#0f172a" : "#111827",
                borderColor:  row.isMe ? "#fbbf24" : i < 3 ? "#334155" : "#1e293b",
                borderWidth:  row.isMe ? "1.5px" : "1px",
                animationDelay: `${i * 40}ms`,
              }}>

              {/* rank */}
              <div className="w-9 text-center shrink-0">
                {i < 3
                  ? <span className="text-2xl">{medal(i)}</span>
                  : <span className="text-sm font-black text-slate-500">{i + 1}</span>}
              </div>

              {/* name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 overflow-hidden">
                  <span className="text-sm font-black text-slate-100 truncate">{row.name}</span>
                  {row.isMe && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: "#fbbf24", color: "#0a0f1e" }}>YOU</span>
                  )}
                </div>
                <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: "#1e293b" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: barColor, minWidth: 2 }} />
                </div>
                <span className="text-[10px] text-slate-600 font-semibold">{pct}% registered</span>
              </div>

              {/* total */}
              <div className="w-20 text-right shrink-0">
                <span className="text-base font-black text-slate-400">{row.total}</span>
              </div>

              {/* qualifies — THE winning metric */}
              <div className="w-20 text-right shrink-0">
                <span className="inline-block px-2 py-1 rounded-lg text-sm font-black"
                  style={{
                    background: row.qualifies > 0 ? "rgba(52,211,153,0.15)" : "rgba(71,85,105,0.2)",
                    color:      row.qualifies > 0 ? "#34d399"                : "#475569",
                    border:     row.qualifies > 0 ? "1px solid rgba(52,211,153,0.3)" : "none",
                  }}>
                  ✅ {row.qualifies}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {lastRefresh && (
        <div className="text-center text-[11px] text-slate-600 font-semibold py-4">
          Updated: {lastRefresh.toLocaleTimeString()}
          &nbsp;·&nbsp;
          <span className="text-blue-400 cursor-pointer font-bold" onClick={loadData}>Refresh ↻</span>
        </div>
      )}
    </div>
  );
}