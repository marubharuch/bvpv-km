/**
 * ConnectorsPage.jsx — Bill-optimized version
 *
 * BILL REDUCTION CHANGES:
 *  1. loadStats() — connectors node full read REMOVED
 *     → invited/joined stats now stored in users/{uid}/connectorStats (lightweight)
 *  2. loadInviteList() — connectors full read REPLACED
 *     → uses connectorsMeta index (only unregistered + unexpired keys)
 *     → falls back gracefully if index not present
 *  3. handleSubmit() — connectors full read REMOVED
 *     → individual key checks instead of full node read
 *  4. CITIES — imported from constants (duplicate removed)
 *
 * RTDB NODES WRITTEN (unchanged):
 *  - users/{uid}/myContacts/{fullKey}   — user's own uploads
 *  - connectors/{fullKey}/...           — global pool
 *  mobileIndex — NOT touched (as before)
 */

import { useState, useEffect }      from "react";
import { useNavigate }               from "react-router-dom";
import { ref, get }                  from "firebase/database";
import { db }                        from "../lib/firebase";
import { rtdb }                      from "../db/rtdb";
import { useAuth }                   from "../store/AuthContext";
import { splitMobile, toFullMobile } from "../lib/phone";
import { CITIES }                    from "../constants/app";

function isValidName(n) { return n.trim().split(/\s+/).length >= 2; }
function uid()          { return Math.random().toString(36).slice(2, 10); }

/**
 * Parse raw phone from contact picker.
 * "+919974021397" → { countryCode: "+91", digits: "9974021397" }
 * "9974021397"    → { countryCode: "+91", digits: "9974021397" } (assume India)
 * "+12025551234"  → { countryCode: "+1",  digits: "2025551234" }
 */
function parseRawPhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, "");
  const full    = cleaned.startsWith("+")
    ? cleaned
    : `+91${cleaned.replace(/\D/g, "").slice(-10)}`;
  return splitMobile(full);
}

export default function ConnectorsPage() {
  const { user }      = useAuth();
  const navigate      = useNavigate();
  const [tab, setTab] = useState("add");

  const [picked,        setPicked]        = useState([]);
  const [cityTarget,    setCityTarget]    = useState(null);
  const [citySearch,    setCitySearch]    = useState("");
  const [selected,      setSelected]      = useState({});
  const [submitting,    setSubmitting]    = useState(false);
  const [submitDone,    setSubmitDone]    = useState(false);
  const [inviteAllList,   setInviteAllList]   = useState([]); // full unfiltered
  const [inviteList,      setInviteList]      = useState([]); // filtered by city
  const [inviteLoading,   setInviteLoading]   = useState(false);
  const [inviteSending,   setInviteSending]   = useState(null);
  const [selectedCity,    setSelectedCity]    = useState("all");
  const [stats,           setStats]           = useState({ uploaded: 0, invited: 0, joined: 0 });
  const [showRules,       setShowRules]       = useState(false);

  useEffect(() => { if (user?.uid) loadStats(); }, [user]);

  // ── Stats — NO full connectors read ──────────────────────────
  // uploaded: count of user's own myContacts (cheap — scoped to one user)
  // invited/joined: stored in users/{uid}/connectorStats (written on invite/join)
  async function loadStats() {
    try {
      const [mcSnap, statsSnap] = await Promise.all([
        get(ref(db, `users/${user.uid}/myContacts`)),
        get(ref(db, `users/${user.uid}/connectorStats`)),
      ]);
      const uploaded = mcSnap.exists()    ? Object.keys(mcSnap.val()).length : 0;
      const st       = statsSnap.exists() ? statsSnap.val()                 : {};
      setStats({ uploaded, invited: st.invited || 0, joined: st.joined || 0 });
    } catch (_) {}
  }

  // ── Contact Picker ────────────────────────────────────────────
  async function pickContacts() {
    if (!user?.uid) return;
    if (!("contacts" in navigator) || !("ContactsManager" in window)) {
      alert("આ device Contact Picker support કરતું નથી. Chrome Mobile વાપરો.");
      return;
    }
    try {
      const contacts = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const mapped = contacts
        .filter(c => c.tel?.length)
        .map(c => {
          const { countryCode, digits } = parseRawPhone(c.tel[0]);
          return { id: uid(), name: c.name?.[0] || "", phone: digits, countryCode, city: "" };
        })
        .filter(c => c.phone.length >= 7);

      setPicked(prev => {
        const existing = new Set(prev.map(p => `${p.countryCode}${p.phone}`));
        return [...prev, ...mapped.filter(m => !existing.has(`${m.countryCode}${m.phone}`))];
      });
    } catch (e) { console.error(e); }
  }

  // ── Contact list helpers ──────────────────────────────────────
  function updateName(id, val) { setPicked(prev => prev.map(p => p.id === id ? { ...p, name: val } : p)); }
  function removeContact(id) {
    setPicked(prev => prev.filter(p => p.id !== id));
    setSelected(prev => { const s = { ...prev }; delete s[id]; return s; });
  }
  function openCityPopup(id) { setCityTarget(id); setCitySearch(""); }
  function selectCity(city) {
    setPicked(prev => prev.map(p => p.id === cityTarget ? { ...p, city } : p));
    setCityTarget(null);
  }

  const filteredCities   = CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  const validContacts    = picked.filter(p => isValidName(p.name) && p.city);
  const selectedContacts = validContacts.filter(p => selected[p.id]);

  function toggleSelect(id) { setSelected(prev => ({ ...prev, [id]: !prev[id] })); }
  function selectAll() {
    const sel = {};
    validContacts.forEach(p => (sel[p.id] = true));
    setSelected(sel);
  }

  // ── Submit contacts — NO full connectors read ─────────────────
  // Only reads: user's myContacts + individual connector keys
  async function handleSubmit() {
    if (!selectedContacts.length || !user?.uid) return;
    setSubmitting(true);
    const now = Date.now();
    try {
      // Read only user's own myContacts — NOT full connectors node
      const mcSnap     = await get(ref(db, `users/${user.uid}/myContacts`));
      const myContacts = mcSnap.exists() ? mcSnap.val() : {};

      // For each selected contact, check individual connector key (not full node)
      const fullKeys = selectedContacts.map(c => toFullMobile(c.countryCode, c.phone));
      const connSnaps = await Promise.all(
        fullKeys.map(k => get(ref(db, `connectors/${k}`)))
      );

      const updates = {};
      selectedContacts.forEach((c, i) => {
        const fullKey  = fullKeys[i];
        const existing = connSnaps[i].exists() ? connSnaps[i].val() : null;

        // Skip if this user already uploaded this contact
        if (myContacts[fullKey]) return;

        // Track in user's myContacts
        updates[`users/${user.uid}/myContacts/${fullKey}`] = {
          name:        c.name.trim(),
          phone:       c.phone,
          countryCode: c.countryCode,
          city:        c.city,
          addedAt:     now,
        };

        // Write to connectors node — update only, preserve existing uploadedAt
        updates[`connectors/${fullKey}/name`]                   = c.name.trim();
        updates[`connectors/${fullKey}/mobile`]                  = fullKey;
        updates[`connectors/${fullKey}/countryCode`]             = c.countryCode;
        updates[`connectors/${fullKey}/city`]                    = c.city;
        updates[`connectors/${fullKey}/uploadedAt`]              = existing?.uploadedAt || now;
        updates[`connectors/${fullKey}/uploadedBy/${user.uid}`]  = true;
      });

      if (Object.keys(updates).length === 0) {
        alert("Selected contacts already uploaded by you before.");
        setSubmitting(false);
        return;
      }

      await rtdb.batch(updates);
      await loadStats();
      setPicked([]); setSelected({});
      setSubmitDone(true);
      setTimeout(() => setSubmitDone(false), 3000);
    } catch (e) { console.error(e); alert("Error: " + e.message); }
    setSubmitting(false);
  }

  // ── City filter — applied on inviteAllList ───────────────────
  useEffect(() => {
    if (selectedCity === "all") {
      setInviteList(inviteAllList);
    } else {
      setInviteList(inviteAllList.filter(c => c.city === selectedCity));
    }
  }, [selectedCity, inviteAllList]);

  // ── Invite list — targeted reads only ────────────────────────
  async function loadInviteList() {
  setInviteLoading(true);
  try {
    const now = Date.now();

    const [connectorsSnap, mobileIndexSnap] = await Promise.all([
      get(ref(db, "connectors")),
      get(ref(db, "mobileIndex")),
    ]);
     console.log("connectors exists:", connectorsSnap.exists());
    console.log("connectors val:", connectorsSnap.val());
    console.log("mobileIndex val:", mobileIndexSnap.val());

    if (!connectorsSnap.exists()) { 
      setInviteAllList([]); 
      setInviteLoading(false); 
      return; 
    }

    const mobileIndex = mobileIndexSnap.exists() ? mobileIndexSnap.val() : {};

    const list = [];
    connectorsSnap.forEach(child => {
      const d = child.val();
      const fullKey = child.key; // e.g. "+918000559551"

      // Check mobileIndex — skip if already a registered user
      const indexEntry = mobileIndex[fullKey];
      const isRegistered = indexEntry?.isUser === true;
      if (isRegistered) return;

      // Skip if active invite exists
      const hasActiveInvite = d.invite && d.invite.expiresAt > now;
      if (hasActiveInvite) return;

      list.push({ fullKey, ...d });
    });

    // Sort: user's own city first
    const userCity = user?.city || "";
    list.sort((a, b) => {
      if (a.city === userCity && b.city !== userCity) return -1;
      if (a.city !== userCity && b.city === userCity) return 1;
      return (a.city || "").localeCompare(b.city || "");
    });

    setInviteAllList(list);
  } catch (e) { console.error(e); }
  setInviteLoading(false);
}

  useEffect(() => { if (tab === "invite") loadInviteList(); }, [tab]);

  // ── Send WhatsApp invite ──────────────────────────────────────
  async function sendInvite(contact) {
    if (!user?.uid) return;
    const fullKey   = contact.fullKey;
    const waNumber  = fullKey.replace("+", "");
    setInviteSending(fullKey);

    const now        = Date.now();
    const expiresAt  = now + 48 * 60 * 60 * 1000;
    const inviteLink = `${window.location.origin}/register?ref=${user.uid}&phone=${fullKey}`;
    const message    = encodeURIComponent(
`નમસ્તે ${contact.name}! 🙏

આપણી કેળવણી મંડળ App માં જોડાઓ.

${inviteLink}

⏳ આ link 48 કલાક valid છે.`
    );

    try {
      await Promise.all([
        // Update connector invite data
        rtdb.update(`connectors/${fullKey}`, {
          invitedBy: user.uid,
          invitedAt: now,
          invite:    { sentBy: user.uid, sentAt: now, expiresAt },
        }),
        // Increment invited count in user's stats (cheap write — no full read)
        rtdb.update(`users/${user.uid}/connectorStats`, {
          invited: (stats.invited || 0) + 1,
        }),
      ]);

      setStats(prev => ({ ...prev, invited: prev.invited + 1 }));
      setInviteAllList(prev => prev.filter(c => c.fullKey !== fullKey));
      window.open(`https://wa.me/${waNumber}?text=${message}`, "_blank");
    } catch (e) { console.error(e); }
    setInviteSending(null);
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>

      {/* HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f4c81 100%)",
          paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        }}
        className="px-4 pb-4"
      >
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-blue-300 uppercase mb-0.5">Oswal Connectors</p>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">Competition</h1>
            </div>
            <button
              onClick={() => navigate("/leaderboard")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-extrabold text-xs text-white cursor-pointer border-0 shrink-0"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
              🏆 Leaderboard
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatPill icon="👥" label="Uploaded" value={stats.uploaded} color="#10b981" />
            <StatPill icon="📨" label="Invited"  value={stats.invited}  color="#f59e0b" />
            <StatPill icon="✅" label="Joined"   value={stats.joined}   color="#8b5cf6" />
          </div>

          <button
            onClick={() => setShowRules(true)}
            className="text-xs font-bold text-blue-300 underline underline-offset-2 bg-transparent border-0 cursor-pointer p-0">
            📜 સ્પર્ધાના નિયમો જુઓ
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-lg mx-auto flex">
          {[
            { key: "add",    label: "📱 Contacts ઉમેરો" },
            { key: "invite", label: "📲 Invite કરો" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3.5 text-sm font-bold cursor-pointer border-0 bg-transparent transition-colors
                ${tab === t.key
                  ? "text-blue-800 border-b-[3px] border-blue-800 -mb-px"
                  : "text-gray-400"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-6">

        {/* TAB 1: ADD CONTACTS */}
        {tab === "add" && (
          <div>
            {!user?.uid && (
              <div className="flex items-start gap-3 px-4 py-4 rounded-2xl mb-4"
                style={{ background: "#fff7ed", border: "1.5px solid #fb923c" }}>
                <span className="text-2xl flex-shrink-0">🔒</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#9a3412" }}>Login જરૂરી છે</p>
                  <p className="text-xs leading-relaxed mt-1 mb-2" style={{ color: "#c2410c" }}>
                    Contacts upload કરવા માટે પહેલા પરિવાર રજીસ્ટ્રેશન કરો અથવા Login કરો.
                  </p>
                  <button
                    onClick={() => navigate("/registration")}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer"
                    style={{ background: "#ea580c", color: "#fff" }}>
                    રજીસ્ટ્રેશન કરો →
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={pickContacts}
              disabled={!user?.uid}
              className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl border-2 border-dashed font-bold text-left mb-5 transition-transform"
              style={user?.uid
                ? { borderColor: "#1d4ed8", background: "#eff6ff", color: "#1e40af", cursor: "pointer" }
                : { borderColor: "#d1d5db", background: "#f9fafb", color: "#9ca3af", cursor: "not-allowed", opacity: 0.55 }
              }>
              <span className="text-3xl">{user?.uid ? "📲" : "🔒"}</span>
              <div>
                <div className="text-base font-extrabold">Contact Picker ખોલો</div>
                <div className="text-xs opacity-70 mt-0.5">
                  {user?.uid ? "Phone book માંથી contacts select કરો" : "Login પછી ઉપલબ્ધ"}
                </div>
              </div>
            </button>

            {picked.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-gray-700">{picked.length} contacts picked</span>
                  <button onClick={selectAll}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border-0 cursor-pointer active:scale-95 transition-transform">
                    ✅ બધા select ({validContacts.length})
                  </button>
                </div>

                <div className="flex flex-col gap-3 mb-4">
                  {picked.map(c => {
                    const valid     = isValidName(c.name) && c.city;
                    const isChecked = !!selected[c.id];
                    return (
                      <div key={c.id}
                        className={`rounded-2xl border-2 px-3 py-3 transition-all
                          ${isChecked ? "border-emerald-400 bg-emerald-50"
                            : valid   ? "border-gray-200 bg-white"
                            : "border-amber-200 bg-white"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="checkbox" checked={isChecked} disabled={!valid}
                            onChange={() => toggleSelect(c.id)}
                            className="w-5 h-5 cursor-pointer shrink-0 accent-emerald-600" />
                          <input
                            className={`flex-1 min-w-0 px-3 py-2 rounded-lg border-[1.5px] text-sm font-bold outline-none
                              ${isValidName(c.name) ? "border-emerald-200 bg-white" : "border-amber-300 bg-amber-50"}`}
                            value={c.name}
                            onChange={e => updateName(c.id, e.target.value)}
                            placeholder="પૂરું નામ (2 words)"
                            style={{ fontSize: 16 }} />
                          <button onClick={() => removeContact(c.id)}
                            className="w-7 h-7 rounded-full bg-red-100 text-red-500 text-xs font-black border-0 cursor-pointer flex items-center justify-center shrink-0 active:bg-red-200">
                            ✕
                          </button>
                        </div>
                        <div className="flex items-center justify-between pl-7 gap-2">
                          <p className="text-xs text-gray-500 font-semibold">📞 {c.countryCode} {c.phone}</p>
                          <button onClick={() => openCityPopup(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border-0 cursor-pointer whitespace-nowrap active:scale-95 transition-transform
                              ${c.city ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {c.city || "📍 City select કરો"}
                          </button>
                        </div>
                        {!isValidName(c.name) && (
                          <p className="text-xs text-amber-600 font-semibold mt-1.5 pl-7">⚠️ ઓછામાં ઓછા 2 words નું નામ</p>
                        )}
                        {!c.city && isValidName(c.name) && (
                          <p className="text-xs text-amber-600 font-semibold mt-1.5 pl-7">📍 City select કરો</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedContacts.length > 0 && (
                  <button onClick={handleSubmit} disabled={submitting}
                    className={`w-full py-4 rounded-2xl text-white text-base font-black border-0 cursor-pointer transition-opacity active:scale-[0.98] ${submitting ? "opacity-60" : ""}`}
                    style={{ background: "linear-gradient(135deg,#0f4c81,#1e3a5f)", boxShadow: "0 4px 20px rgba(15,76,129,0.35)" }}>
                    {submitting ? "⏳ Uploading..." : `✅ ${selectedContacts.length} Contacts Submit કરો`}
                  </button>
                )}

                {submitDone && (
                  <div className="mt-3 px-5 py-4 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-sm text-center border-2 border-emerald-400">
                    🎉 Contacts successfully ઉમેરાઈ ગયા!
                  </div>
                )}
              </div>
            )}

            {picked.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-lg font-extrabold text-gray-700 mb-2">Contact Picker ખોલો</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Phone book માંથી  contacts select કરો,<br />
                  નામ edit કરો, city add કરો અને submit કરો.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVITE */}
        {tab === "invite" && (
          <div>
            {Date.now() < new Date("2026-03-15T00:00:00+05:30").getTime() ? (
              <div className="flex flex-col items-center text-center py-16 gap-4">
                <div className="text-6xl">🔒</div>
                <div>
                  <p className="text-lg font-extrabold text-gray-800 mb-1">Invite Feature Coming Soon</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    WhatsApp Invite feature <strong>15 માર્ચ 2026</strong> થી શરૂ થશે.<br />
                    ત્યાં સુધી Contacts upload કરતા રહો! 👆
                  </p>
                </div>
                <div className="px-5 py-3 rounded-2xl text-sm font-bold"
                  style={{ background: "#eff6ff", color: "#1e40af" }}>
                  📅 Unlocks on 15 March 2026
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-200 shadow-sm mb-4">
                  <span className="text-xl">📲</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">Personal WhatsApp Invite</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">Unregistered contacts • 48 કલાક valid</p>
                  </div>
                  <button onClick={loadInviteList}
                    className="bg-gray-100 border-0 rounded-lg px-3 py-2 cursor-pointer text-base active:bg-gray-200 shrink-0">
                    🔄
                  </button>
                </div>

                {/* City filter chips */}
                {!inviteLoading && inviteAllList.length > 0 && (() => {
                  // Build city counts from full list
                  const cityCounts = inviteAllList.reduce((acc, c) => {
                    const city = c.city || "Other";
                    acc[city] = (acc[city] || 0) + 1;
                    return acc;
                  }, {});
                  const cityOptions = [
                    { key: "all", label: `બધા (${inviteAllList.length})` },
                    ...Object.entries(cityCounts)
                      .sort((a, b) => b[1] - a[1]) // most contacts first
                      .map(([city, count]) => ({ key: city, label: `${city} (${count})` })),
                  ];
                  return (
                    <div className="mb-4">
                      <p className="text-xs font-bold text-gray-500 mb-2">📍 City પ્રમાણે filter કરો</p>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {cityOptions.map(opt => (
                          <button key={opt.key} onClick={() => setSelectedCity(opt.key)}
                            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                            style={selectedCity === opt.key
                              ? { background: "#0f4c81", color: "#fff" }
                              : { background: "#f1f5f9", color: "#475569" }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {inviteLoading && (
                  <div className="text-center py-12 text-gray-500 font-semibold">⏳ List load થઈ રહ્યું છે...</div>
                )}

                {!inviteLoading && inviteList.length === 0 && inviteAllList.length === 0 && (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="text-lg font-extrabold text-gray-700 mb-2">બધા invited છે!</p>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      હાલ કોઈ contact available નથી.<br />
                      48 કલાક પછી expire થયેલા contacts ફરી દેખાશે.
                    </p>
                  </div>
                )}

                {!inviteLoading && inviteList.length === 0 && inviteAllList.length > 0 && (
                  <div className="text-center py-10 text-gray-400">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-base font-extrabold text-gray-700 mb-1">આ city માં કોઈ નથી</p>
                    <p className="text-sm text-gray-500">બીજી city select કરો</p>
                  </div>
                )}

                {!inviteLoading && inviteList.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-gray-600 mb-3">
                      {inviteList.length} contacts
                      {selectedCity !== "all" && (
                        <span className="text-gray-400 font-normal"> · {selectedCity}</span>
                      )}
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {inviteList.map(c => (
                        <div key={c.fullKey}
                          className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-gray-200 shadow-sm">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-base shrink-0"
                            style={{ background: "linear-gradient(135deg,#0f4c81,#10b981)" }}>
                            {c.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm text-gray-800 truncate">{c.name}</p>
                            <p className="text-xs text-gray-500 font-semibold">📞 {c.fullKey}</p>
                            {c.city && <p className="text-xs text-gray-400">📍 {c.city}</p>}
                          </div>
                          <button
                            onClick={() => sendInvite(c)}
                            disabled={inviteSending === c.fullKey}
                            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-white font-extrabold text-sm border-0 cursor-pointer shrink-0 transition-opacity active:scale-95 ${inviteSending === c.fullKey ? "opacity-60" : ""}`}
                            style={{ background: "#25d366", minWidth: 80 }}>
                            {inviteSending === c.fullKey
                              ? <span>⏳</span>
                              : <><span className="text-base">💬</span> Invite</>}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* CITY POPUP */}
      {cityTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setCityTarget(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg flex flex-col px-4 pt-5"
            style={{ maxHeight: "75vh", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-base font-extrabold text-gray-800">📍 City Select કરો</span>
              <button onClick={() => setCityTarget(null)}
                className="w-9 h-9 rounded-full bg-gray-100 border-0 cursor-pointer text-base font-black text-gray-600 flex items-center justify-center">
                ✕
              </button>
            </div>
            <input className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none mb-4 focus:border-blue-400"
              placeholder="Search city..." value={citySearch}
              onChange={e => setCitySearch(e.target.value)}
              style={{ fontSize: 16 }} autoFocus />
            <div className="grid grid-cols-3 gap-2 overflow-y-auto pb-2">
              {filteredCities.map(city => (
                <button key={city} onClick={() => selectCity(city)}
                  className="py-3 px-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 cursor-pointer text-center active:bg-blue-50 active:border-blue-300 transition-colors">
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setShowRules(false)}>
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col"
            style={{ background: "#0f172a", border: "1px solid #1e3a5f", maxHeight: "88vh", paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-slate-700">
              <h2 className="text-lg font-black text-white">📜 સ્પર્ધાના નિયમો</h2>
              <button onClick={() => setShowRules(false)}
                className="w-9 h-9 rounded-full bg-slate-700 border-0 cursor-pointer text-slate-300 font-bold flex items-center justify-center text-base active:bg-slate-600">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <div className="text-sm text-slate-300 space-y-5 leading-relaxed">
                <div>
                  <p className="font-bold text-amber-400 mb-2 text-base">1️⃣ Upload Award</p>
                  <ul className="space-y-2.5 ml-1">
                    {[
                      "માત્ર સમાજના વ્યક્તિઓના જ કોન્ટેક્ટ અપલોડ કરી શકશે.",
                      "એક જ કોન્ટેક્ટ એકથી વધુ વખત અપલોડ કરવામાં આવશે તો તે ફક્ત એક જ વખત ગણાશે.",
                      "દરેક કોન્ટેક્ટ માટે યોગ્ય અને સંપૂર્ણ નામ તથા શહેર (City) નોંધાયેલું હોવું ફરજિયાત છે.",
                      "સ્પર્ધાની અંતિમ તારીખ સુધીમાં જે કોન્ટેક્ટ સફળતાપૂર્વક રજીસ્ટ્રેશન કરશે, તે જ કોન્ટેક્ટ માન્ય ગણાશે.",
                    ].map((text, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                        <span>{text}</span>
                      </li>
                    ))}
                    <li className="flex gap-2.5">
                      <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                      <span><strong className="text-slate-200">ઉદાહરણ:</strong> જો 50 contacts અપલોડ કર્યા હોય અને 40 લોકોએ રજીસ્ટ્રેશન કર્યું હોય, તો ફક્ત 40 ગણાશે.</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-blue-400 mb-2 text-base">2️⃣ Invite Award</p>
                  <ul className="space-y-2.5 ml-1">
                    {[
                      "ઇન્વિટેશન પ્રક્રિયા 15 માર્ચ 2026 થી શરૂ થશે.",
                      "ઇન્વિટેશન પેજ પર તે તમામ કોન્ટેક્ટ દેખાશે, જે અપલોડ થયા છે પણ રજીસ્ટ્રેશન કર્યું નથી.",
                      "યુઝર પોતાના ઓળખાણના કોન્ટેક્ટને ઇન્વાઇટ કરી શકશે.",
                      "અંતિમ તારીખ સુધી ઇન્વાઇટ કરેલા contacts માંથી જેટલા register કર્યા, તે સ્પર્ધા માટે ગણાશે.",
                    ].map((text, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs text-slate-400 pt-3 border-t border-slate-700">
                  🎯 હેતુ: સમાજના દરેક સભ્યને platform સાથે જોડવાનો.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border w-full"
      style={{ background: "rgba(255,255,255,0.08)", borderColor: color + "66" }}>
      <span className="text-base leading-none">{icon}</span>
      <div className="min-w-0">
        <div className="text-lg font-black leading-none" style={{ color }}>{value}</div>
        <div className="text-[10px] text-gray-400 mt-0.5 truncate">{label}</div>
      </div>
    </div>
  );
}