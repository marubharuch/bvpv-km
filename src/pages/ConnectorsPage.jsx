/**
 * ConnectorsPage.jsx  — Tailwind v4
 * Rules:
 *  - Every user gets upload credit via myContacts (phone = key → self-dedup)
 *  - Invite list = ALL unregistered contacts (anyone's uploads)
 *  - Invite 48hr; after expiry any user can re-invite
 */

import { useState, useEffect, useContext } from "react";
import { ref, get, set } from "firebase/database";
import { batchWrite, updatePath } from "../services/rtdbService";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function normalizePhone(p) {
  p = p.replace(/[\s\-().+]/g, "");
  if (p.startsWith("91") && p.length === 12) p = p.slice(2);
  return p;
}
function isValidPhone(p) { return /^[6-9]\d{9}$/.test(p); }
function isValidName(n)  { return n.trim().split(/\s+/).length >= 2; }
function uid()           { return Math.random().toString(36).slice(2, 10); }

const CITIES = [
  "Ahmedabad","Surat","Vadodara","Rajkot","Bhavnagar","Jamnagar",
  "Gandhinagar","Anand","Nadiad","Mehsana","Palanpur","Patan",
  "Surendranagar","Morbi","Junagadh","Amreli","Bharuch","Valsad",
  "Navsari","Dahod","Godhra","Himatnagar","Modasa","Botad",
  "Dwarka","Porbandar","Veraval","Sidhpur","Visnagar","Other"
];

export default function ConnectorsPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState("add");

  const [picked,        setPicked]        = useState([]);
  const [cityTarget,    setCityTarget]    = useState(null);
  const [citySearch,    setCitySearch]    = useState("");
  const [selected,      setSelected]      = useState({});
  const [submitting,    setSubmitting]    = useState(false);
  const [submitDone,    setSubmitDone]    = useState(false);
  const [inviteList,    setInviteList]    = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSending, setInviteSending] = useState(null);
  const [stats,         setStats]         = useState({ uploaded: 0, invited: 0, joined: 0 });
const [showRules, setShowRules] = useState(false);
  useEffect(() => { if (user?.uid) loadStats(); }, [user]);

  async function loadStats() {
    try {
      const mcSnap = await get(ref(db, `users/${user.uid}/myContacts`));
      const uploaded = mcSnap.exists() ? Object.keys(mcSnap.val()).length : 0;
      const connSnap = await get(ref(db, "connectors"));
      let invited = 0, joined = 0;
      if (connSnap.exists()) {
        connSnap.forEach(child => {
          const d = child.val();
          if (d.invitedBy === user.uid) { invited++; if (d.joinedUserId) joined++; }
        });
      }
      setStats({ uploaded, invited, joined });
    } catch (_) {}
  }

  async function pickContacts() {
    if (!("contacts" in navigator) || !("ContactsManager" in window)) {
      alert("આ device Contact Picker support કરતું નથી. Chrome Mobile વાપરો.");
      return;
    }
    try {
      const contacts = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const mapped = contacts
        .filter(c => c.tel?.length)
        .map(c => ({ id: uid(), name: c.name?.[0] || "", phone: normalizePhone(c.tel[0]), city: "" }))
        .filter(c => isValidPhone(c.phone));
      setPicked(prev => {
        const existing = new Set(prev.map(p => p.phone));
        return [...prev, ...mapped.filter(m => !existing.has(m.phone))];
      });
    } catch (e) { console.error(e); }
  }

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
  const filteredCities = CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  const validContacts    = picked.filter(p => isValidName(p.name) && p.city);
  const selectedContacts = validContacts.filter(p => selected[p.id]);
  function toggleSelect(id) { setSelected(prev => ({ ...prev, [id]: !prev[id] })); }
  function selectAll() {
    const sel = {};
    validContacts.forEach(p => (sel[p.id] = true));
    setSelected(sel);
  }

  async function handleSubmit() {
    if (!selectedContacts.length || !user?.uid) return;
    setSubmitting(true);
    const now = Date.now();
    try {
      const [mcSnap, connSnap] = await Promise.all([
        get(ref(db, `users/${user.uid}/myContacts`)),
        get(ref(db, "connectors")),
      ]);
      const myContacts   = mcSnap.exists()  ? mcSnap.val()  : {};
      const existingConn = connSnap.exists() ? connSnap.val() : {};
      const updates = {};

      for (const c of selectedContacts) {
        if (myContacts[c.phone]) continue; // self-duplicate → skip
        updates[`users/${user.uid}/myContacts/${c.phone}`] = {
          name: c.name.trim(), phone: c.phone, city: c.city, addedAt: new Date().toISOString(),
        };
        const existing = existingConn[c.phone];
        updates[`connectors/${c.phone}`] = {
          name: c.name.trim(), mobile: c.phone, city: c.city,
          uploadedAt:  existing?.uploadedAt  || now,
          uploadedBy:  existing?.uploadedBy  || user.uid,   // ✅ FIX 1: credit the uploader
        };
        if (!existing) {
          updates[`mobile_index/${c.phone}`] = {
            name: c.name.trim(), phone: c.phone, city: c.city,
            addedBy: user.uid, addedAt: new Date().toISOString(), memberId: null, userId: null,
          };
        }
      }

      if (Object.keys(updates).length === 0) {
        alert("Selected contacts already uploaded by you before.");
        setSubmitting(false);
        return;
      }
      await batchWrite(updates);
      await loadStats();
      setPicked([]); setSelected({});
      setSubmitDone(true);
      setTimeout(() => setSubmitDone(false), 3000);
    } catch (e) { console.error(e); alert("Error: " + e.message); }
    setSubmitting(false);
  }

  async function loadInviteList() {
    setInviteLoading(true);
    try {
      const snap = await get(ref(db, "connectors"));
      if (!snap.exists()) { setInviteList([]); setInviteLoading(false); return; }
      const now = Date.now();
      const list = [];
      snap.forEach(child => {
        const d = child.val();
        if (!d.joinedUserId && (!d.invite || d.invite.expiresAt < now))
          list.push({ phone: child.key, ...d });
      });
      setInviteList(list);
    } catch (e) { console.error(e); }
    setInviteLoading(false);
  }

  useEffect(() => { if (tab === "invite") loadInviteList(); }, [tab]);

  async function sendInvite(contact) {
    if (!user?.uid) return;
    setInviteSending(contact.phone);
    const expiresAt  = Date.now() + 48 * 60 * 60 * 1000;
    const inviteData = { sentBy: user.uid, sentAt: new Date().toISOString(), expiresAt };
    const inviteLink = `${window.location.origin}/register?ref=${user.uid}&phone=${contact.phone}`; // ✅ FIX 4: dynamic domain
    const message    = encodeURIComponent(
      `નમસ્તે ${contact.name}! 🙏\n\nઆપણી Community Directory App માં જોડાઓ.\nતમારી profile બનાવો અને સમાજ સાથે જોડાઓ. 👇\n\n${inviteLink}\n\n⏳ આ link 48 કલાક valid છે.`
    );
    try {
      await Promise.all([
        updatePath(`connectors/${contact.phone}`, { invitedBy: user.uid, invitedAt: Date.now(), invite: inviteData }),
        updatePath(`mobile_index/${contact.phone}`, { invite: inviteData }),
      ]);
      setInviteList(prev => prev.filter(c => c.phone !== contact.phone));
      await loadStats();
      window.open(`https://wa.me/91${contact.phone}?text=${message}`, "_blank");
    } catch (e) { console.error(e); }
    setInviteSending(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f4c81 100%)" }}
        className="px-4 pt-5 pb-5">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-300 mb-1">OSWAL CONNECTORS</p>
            <h1 className="text-3xl font-black text-white tracking-tight">Competition</h1>
          </div>
          <div className="flex gap-2">
            <StatPill icon="👥" label="Uploaded" value={stats.uploaded} color="#10b981" />
            <StatPill icon="📨" label="Invited"  value={stats.invited}  color="#f59e0b" />
            <StatPill icon="✅" label="Joined"   value={stats.joined}   color="#8b5cf6" />
          </div>
        </div>
        <div className="max-w-lg mx-auto mt-3 flex gap-2">
          <button onClick={() => navigate("/leaderboard")}
            className="flex-1 py-2.5 rounded-xl font-extrabold text-sm text-white cursor-pointer border-0"
            style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
            🏆 Leaderboard
          </button>
          <button
  onClick={() => setShowRules(true)}
  className="text-xs font-bold text-blue-400 underline ml-2"
>
  📜 Rules
</button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="sticky top-0 z-10 bg-white border-b-2 border-gray-100">
        <div className="max-w-lg mx-auto flex">
          {[
            { key: "add",    label: "📱 Contacts ઉમેરો" },
            { key: "invite", label: "📲 Invite કરો" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3.5 text-sm font-bold cursor-pointer border-0 bg-transparent transition-colors
                ${tab === t.key ? "text-blue-800 border-b-[3px] border-blue-800 -mb-0.5" : "text-gray-400"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">

        {/* ── TAB 1: ADD CONTACTS ── */}
        {tab === "add" && (
          <div>
            <button onClick={pickContacts}
              className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl border-2 border-dashed border-blue-700 bg-blue-50 text-blue-800 font-bold text-left cursor-pointer mb-5">
              <span className="text-2xl">📲</span>
              <div>
                <div className="text-base font-extrabold">Contact Picker ખોલો</div>
                <div className="text-xs opacity-70 mt-0.5">Phone book માંથી contacts select કરો</div>
              </div>
            </button>

            {picked.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-gray-700">{picked.length} contacts picked</span>
                  <button onClick={selectAll}
                    className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border-0 cursor-pointer">
                    ✅ બધા select ({validContacts.length})
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 mb-4">
                  {picked.map(c => {
                    const valid     = isValidName(c.name) && c.city;
                    const isChecked = !!selected[c.id];
                    return (
                      <div key={c.id}
                        className={`rounded-2xl border-2 px-3.5 py-3 transition-all
                          ${isChecked ? "border-emerald-400 bg-emerald-50"
                            : valid    ? "border-gray-200 bg-white"
                            :            "border-amber-200 bg-white"}`}>
                        <div className="flex items-center gap-2.5">
                          <input type="checkbox" checked={isChecked} disabled={!valid}
                            onChange={() => toggleSelect(c.id)}
                            className="w-5 h-5 cursor-pointer shrink-0" />
                          <div className="flex-1 min-w-0">
                            <input
                              className={`w-full px-2.5 py-2 rounded-lg border-[1.5px] text-sm font-bold outline-none mb-1
                                ${isValidName(c.name) ? "border-emerald-200" : "border-amber-300"}`}
                              value={c.name}
                              onChange={e => updateName(c.id, e.target.value)}
                              placeholder="પૂરું નામ (ઓછામાં ઓછા 2 words)"
                              style={{ fontSize: 16 }}
                            />
                            <p className="text-xs text-gray-500 font-semibold">📞 {c.phone}</p>
                          </div>
                          <div className="flex flex-col gap-1.5 items-end shrink-0">
                            <button onClick={() => openCityPopup(c.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border-0 cursor-pointer whitespace-nowrap
                                ${c.city ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                              {c.city || "📍 City"}
                            </button>
                            <button onClick={() => removeContact(c.id)}
                              className="w-6 h-6 rounded-full bg-red-100 text-red-500 text-xs font-black border-0 cursor-pointer flex items-center justify-center">
                              ✕
                            </button>
                          </div>
                        </div>
                        {!isValidName(c.name) && (
                          <p className="text-xs text-amber-600 font-semibold mt-1.5 pl-8">⚠️ ઓછામાં ઓછા 2 words નું નામ લખો</p>
                        )}
                        {!c.city && isValidName(c.name) && (
                          <p className="text-xs text-amber-600 font-semibold mt-1.5 pl-8">📍 City select કરો</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedContacts.length > 0 && (
                  <button onClick={handleSubmit} disabled={submitting}
                    className={`w-full py-4 rounded-2xl text-white text-base font-black border-0 cursor-pointer mt-1 transition-opacity
                      ${submitting ? "opacity-60" : ""}`}
                    style={{ background: "linear-gradient(135deg,#0f4c81,#1e3a5f)", boxShadow: "0 4px 20px rgba(15,76,129,0.35)" }}>
                    {submitting ? "⏳ Uploading..." : `✅ ${selectedContacts.length} Contacts Submit કરો`}
                  </button>
                )}

                {submitDone && (
                  <div className="mt-3 px-5 py-3.5 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-sm text-center border-2 border-emerald-400">
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
                  Phone book માંથી community contacts select કરો,<br />
                  નામ edit કરો, city add કરો અને submit કરો.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: INVITE ── */}
        {tab === "invite" && (
          <div>
            <div className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border-2 border-gray-100 mb-4">
              <span className="text-xl">📲</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">Personal WhatsApp Invite</p>
                <p className="text-xs text-gray-500 mt-0.5">બધા unregistered contacts • Invite 48 કલાક valid</p>
              </div>
              <button onClick={loadInviteList}
                className="bg-gray-100 border-0 rounded-lg px-2.5 py-1.5 cursor-pointer text-base">
                🔄
              </button>
            </div>

            {inviteLoading && (
              <div className="text-center py-8 text-gray-500 font-semibold">⏳ List load થઈ રહ્યું છે...</div>
            )}

            {!inviteLoading && inviteList.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-lg font-extrabold text-gray-700 mb-2">બધા invited છે!</p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  હાલ કોઈ contact available નથી.<br />
                  48 કલાક પછી expire થયેલા contacts ફરી દેખાશે.
                </p>
              </div>
            )}

            {!inviteLoading && inviteList.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">{inviteList.length} contacts available</p>
                <div className="flex flex-col gap-2.5">
                  {inviteList.map(c => (
                    <div key={c.phone}
                      className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border-2 border-gray-100">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg shrink-0"
                        style={{ background: "linear-gradient(135deg,#0f4c81,#10b981)" }}>
                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-sm text-gray-800 truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 font-semibold">📞 {c.phone}</p>
                        {c.city && <p className="text-xs text-gray-400">📍 {c.city}</p>}
                      </div>
                      <button onClick={() => sendInvite(c)} disabled={inviteSending === c.phone}
                        className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-white font-extrabold text-sm border-0 cursor-pointer shrink-0 transition-opacity
                          ${inviteSending === c.phone ? "opacity-60" : ""}`}
                        style={{ background: "#25d366" }}>
                        {inviteSending === c.phone ? "⏳" : <><span className="text-lg">💬</span> Invite</>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CITY POPUP ── */}
      {cityTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setCityTarget(null)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg flex flex-col px-4 pt-5 pb-8"
            style={{ maxHeight: "70vh" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-base font-extrabold text-gray-800">📍 City Select કરો</span>
              <button onClick={() => setCityTarget(null)}
                className="w-8 h-8 rounded-full bg-gray-100 border-0 cursor-pointer text-base font-black text-gray-600">
                ✕
              </button>
            </div>
            <input className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none mb-4"
              placeholder="Search city..."
              value={citySearch}
              onChange={e => setCitySearch(e.target.value)}
              style={{ fontSize: 16 }}
              autoFocus />
            <div className="grid grid-cols-3 gap-2 overflow-y-auto">
              {filteredCities.map(city => (
                <button key={city} onClick={() => selectCity(city)}
                  className="py-2.5 px-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 cursor-pointer text-center hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showRules && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
    <div className="max-w-lg w-full rounded-2xl p-5"
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        maxHeight: "85vh",
        overflowY: "auto"
      }}>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-white">📜 સ્પર્ધાના નિયમો</h2>
        <button
          onClick={() => setShowRules(false)}
          className="text-slate-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>
      </div>

      <div className="text-sm text-slate-300 space-y-4 leading-relaxed">

        <div>
          <p className="font-bold text-amber-400 mb-1">1️⃣ Upload Award</p>
          <ul className="list-disc ml-5 space-y-1">
            <li> માત્ર સમાજના વ્યક્તિઓના જ કોન્ટેક્ટ અપલોડ કરી શકશે.</li>

<li>એક જ કોન્ટેક્ટ એકથી વધુ વખત (એકસાથે અથવા અલગ-અલગ સમયે) અપલોડ કરવામાં આવશે તો  તે ફક્ત એક જ વખત ગણાશે. </li>
<li>
દરેક કોન્ટેક્ટ માટે યોગ્ય અને સંપૂર્ણ નામ તથા શહેર (City) નોંધાયેલું હોવું ફરજિયાત છે. અધૂરી માહિતી ધરાવતા કોન્ટેક્ટ માન્ય ગણાશે નહીં.</li>

<li>સ્પર્ધાની અંતિમ તારીખ સુધીમાં જે કોન્ટેક્ટ એપ પર આવીને સફળતાપૂર્વક રજીસ્ટ્રેશન કરશે, તે જ કોન્ટેક્ટ માન્ય ગણાશે.</li>

<li>ઉદાહરણરૂપે:<br/>

જો તમે 50 કોન્ટેક્ટ અપલોડ કર્યા હોય અને તેમાંમાંથી 40 લોકોએ અંતિમ તારીખ પહેલાં રજીસ્ટ્રેશન કર્યું હોય, તો ફક્ત તે 40 કોન્ટેક્ટ જ સ્પર્ધા માટે માન્ય ગણાશે.</li>
          </ul>
        </div>

        <div>
          <p className="font-bold text-blue-400 mb-1">2️⃣ Invite Award</p>
          <ul className="list-disc ml-5 space-y-1">
      <li>ઇન્વિટેશન પ્રક્રિયા 21 માર્ચથી શરૂ થશે.</li>  

<li>ઇન્વિટેશન પેજ પર તે તમામ કોન્ટેક્ટનું લિસ્ટ જોવા મળશે, જે તમે અથવા અન્ય લોકોએ અપલોડ કર્યા છે પરંતુ હજુ સુધી રજીસ્ટ્રેશન કર્યું નથી.</li>

<li>યુઝર પોતાના ઓળખાણના કોન્ટેક્ટને ઇન્વાઇટ કરી શકશે.</li>

<li>સ્પર્ધાની અંતિમ તારીખ સુધીમાં ઇન્વાઇટ કરેલા કોન્ટેક્ટમાંથી જેટલા લોકોએ રજીસ્ટ્રેશન કર્યું હશે, તે સંખ્યા સ્પર્ધા માટે ગણવામાં આવશે.</li>
</ul>
        </div>

        <div className="text-xs text-slate-400 pt-2 border-t border-slate-700">
          🎯 હેતુ: સમાજના દરેક સભ્યને પ્લેટફોર્મ સાથે જોડવાનો.
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
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border min-w-[60px]"
      style={{ background: "rgba(255,255,255,0.08)", borderColor: color }}>
      <span className="text-sm">{icon}</span>
      <div>
        <div className="text-base font-black leading-none" style={{ color }}>{value}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}