/**
 * ConnectorsPage.jsx
 * Uses batchWrite / updatePath from rtdbService + AuthContext + useNavigate.
 * Rich UI/logic merged from ContestPage.
 */

import { useState, useEffect, useContext } from "react";
import { ref, get, set } from "firebase/database";
import { batchWrite, updatePath } from "../services/rtdbService";
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// ── Helpers ────────────────────────────────────────────────────
function normalizePhone(p) {
  p = p.replace(/[\s\-().+]/g, "");
  if (p.startsWith("91") && p.length === 12) p = p.slice(2);
  return p;
}
function isValidPhone(p) { return /^[6-9]\d{9}$/.test(p); }
function isValidName(n) { return n.trim().split(/\s+/).length >= 2; }
function uid() { return Math.random().toString(36).slice(2, 10); }

// ── Gujarat Cities ─────────────────────────────────────────────
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

  // ── Part 1 state ───────────────────────────────────────────
  const [picked, setPicked] = useState([]);
  const [cityTarget, setCityTarget] = useState(null);
  const [citySearch, setCitySearch] = useState("");
  const [selected, setSelected] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  // ── Part 2 state ───────────────────────────────────────────
  const [inviteList, setInviteList] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSending, setInviteSending] = useState(null);

  // ── Stats ──────────────────────────────────────────────────
  const [stats, setStats] = useState({ uploaded: 0, invited: 0, joined: 0 });

  useEffect(() => {
    if (!user?.uid) return;
    loadStats();
  }, [user]);

  async function loadStats() {
    try {
      const snap = await get(ref(db, "connectors"));
      if (!snap.exists()) return;
      const data = [];
      snap.forEach(child => data.push({ id: child.key, ...child.val() }));
      const my = data.filter(c => c.uploadedBy === user.uid);
      setStats({
        uploaded: my.length,
        invited:  my.filter(c => c.invitedBy === user.uid).length,
        joined:   my.filter(c => c.joinedUserId).length,
      });
    } catch (_) {}
  }

  // ── Contact Picker ─────────────────────────────────────────
  async function pickContacts() {
    if (!("contacts" in navigator) || !("ContactsManager" in window)) {
      alert("આ device Contact Picker support કરતું નથી. Chrome Mobile વાપરો.");
      return;
    }
    try {
      const contacts = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const mapped = contacts
        .filter(c => c.tel?.length)
        .map(c => ({
          id: uid(),
          name: c.name?.[0] || "",
          phone: normalizePhone(c.tel[0]),
          city: "",
        }))
        .filter(c => isValidPhone(c.phone));
      setPicked(prev => {
        const existing = new Set(prev.map(p => p.phone));
        return [...prev, ...mapped.filter(m => !existing.has(m.phone))];
      });
    } catch (e) {
      console.error(e);
    }
  }

  function updateName(id, val) {
    setPicked(prev => prev.map(p => p.id === id ? { ...p, name: val } : p));
  }

  function removeContact(id) {
    setPicked(prev => prev.filter(p => p.id !== id));
    setSelected(prev => { const s = { ...prev }; delete s[id]; return s; });
  }

  // ── City Popup ─────────────────────────────────────────────
  function openCityPopup(id) { setCityTarget(id); setCitySearch(""); }
  function selectCity(city) {
    setPicked(prev => prev.map(p => p.id === cityTarget ? { ...p, city } : p));
    setCityTarget(null);
  }
  const filteredCities = CITIES.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  // ── Select / Submit ────────────────────────────────────────
  const validContacts = picked.filter(p => isValidName(p.name) && p.city);

  function toggleSelect(id) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }
  function selectAll() {
    const sel = {};
    validContacts.forEach(p => (sel[p.id] = true));
    setSelected(sel);
  }

  const selectedContacts = validContacts.filter(p => selected[p.id]);

  async function handleSubmit() {
    if (!selectedContacts.length || !user?.uid) return;
    setSubmitting(true);
    const now = Date.now();

    try {
      const indexSnap = await get(ref(db, "mobile_index"));
      const mobileIndex = indexSnap.exists() ? indexSnap.val() : {};

      const updates = {};
      let newCount = 0;

      for (const c of selectedContacts) {
        updates[`users/${user.uid}/myContacts/${c.phone}`] = {
          name: c.name.trim(),
          phone: c.phone,
          city: c.city,
          addedAt: new Date().toISOString(),
        };
        updates[`connectors/${c.phone}`] = {
          name:        c.name.trim(),
          mobile:      c.phone,
          city:        c.city,
          uploadedBy:  user.uid,
          uploadedAt:  now,
          creditUntil: now + 7 * 24 * 60 * 60 * 1000,
        };
        if (!mobileIndex[c.phone]) {
          updates[`mobile_index/${c.phone}`] = {
            name:     c.name.trim(),
            phone:    c.phone,
            city:     c.city,
            addedBy:  user.uid,
            addedAt:  new Date().toISOString(),
            memberId: null,
            userId:   null,
          };
          newCount++;
        }
      }

      await batchWrite(updates);

      if (newCount > 0) {
        const statsRef = ref(db, `contest_contributions/${user.uid}`);
        const statsSnap = await get(statsRef);
        const existing = statsSnap.exists() ? statsSnap.val() : {};
        await set(statsRef, {
          ...existing,
          contactsAdded: (existing.contactsAdded || 0) + newCount,
          lastActivity: new Date().toISOString(),
        });
        setStats(prev => ({ ...prev, uploaded: prev.uploaded + newCount }));
      }

      setPicked([]);
      setSelected({});
      setSubmitDone(true);
      setTimeout(() => setSubmitDone(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    }
    setSubmitting(false);
  }

  // ── Load Invite List ───────────────────────────────────────
  async function loadInviteList() {
    setInviteLoading(true);
    try {
      const snap = await get(ref(db, "mobile_index"));
      if (!snap.exists()) { setInviteList([]); setInviteLoading(false); return; }
      const now = Date.now();
      const list = [];
      snap.forEach(child => {
        const d = child.val();
        const noMember = !d.memberId && !d.familyId;
        const noLiveInvite = !d.invite || d.invite.expiresAt < now;
        if (noMember && noLiveInvite) {
          list.push({ phone: child.key, id: child.key, ...d });
        }
      });
      setInviteList(list);
    } catch (e) { console.error(e); }
    setInviteLoading(false);
  }

  useEffect(() => {
    if (tab === "invite") loadInviteList();
  }, [tab]);

  // ── Send Invite ────────────────────────────────────────────
  async function sendInvite(contact) {
    if (!user?.uid) return;
    setInviteSending(contact.phone);

    const expiresAt = Date.now() + 48 * 60 * 60 * 1000;
    const inviteData = { sentBy: user.uid, sentAt: new Date().toISOString(), expiresAt };
    const inviteLink = `https://yourapp.com/register?ref=${user.uid}&phone=${contact.phone}`;
    const message = encodeURIComponent(
      `નમસ્તે ${contact.name}! 🙏\n\nઆપણી Community Directory App માં જોડાઓ.\nતમારી profile બનાવો અને સમાજ સાથે જોડાઓ. 👇\n\n${inviteLink}`
    );

    try {
      await Promise.all([
        updatePath(`mobile_index/${contact.phone}`, { invite: inviteData }),
        updatePath(`connectors/${contact.phone}`, {
          invitedBy: user.uid,
          invitedAt: Date.now(),
          invite:    inviteData,
        }),
      ]);

      const statsRef = ref(db, `contest_contributions/${user.uid}`);
      const snap = await get(statsRef);
      const existing = snap.exists() ? snap.val() : {};
      await set(statsRef, {
        ...existing,
        invitesSent: (existing.invitesSent || 0) + 1,
        lastActivity: new Date().toISOString(),
      });

      setInviteList(prev => prev.filter(c => c.phone !== contact.phone));
      setStats(prev => ({ ...prev, invited: prev.invited + 1 }));

      window.open(`https://wa.me/91${contact.phone}?text=${message}`, "_blank");
    } catch (e) { console.error(e); }
    setInviteSending(null);
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.headerLabel}>OSWAL CONNECTORS</div>
            <h1 style={s.headerTitle}>Competition</h1>
          </div>
          <div style={s.statsRow}>
            <StatPill icon="👥" label="Uploaded" value={stats.uploaded} color="#10b981" />
            <StatPill icon="📨" label="Invited"  value={stats.invited}  color="#f59e0b" />
            <StatPill icon="✅" label="Joined"   value={stats.joined}   color="#8b5cf6" />
          </div>
        </div>
        <div style={{ maxWidth: 480, margin: "12px auto 0" }}>
          <button style={s.leaderboardBtn} onClick={() => navigate("/leaderboard")}>
            🏆 Full Leaderboard જુઓ
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        <button style={tab === "add" ? s.tabActive : s.tab} onClick={() => setTab("add")}>
          📱 Contacts ઉમેરો
        </button>
        <button style={tab === "invite" ? s.tabActive : s.tab} onClick={() => setTab("invite")}>
          📲 Invite કરો
        </button>
      </div>

      <div style={s.body}>

        {/* ── TAB 1: ADD CONTACTS ── */}
        {tab === "add" && (
          <div>
            <button style={s.pickBtn} onClick={pickContacts}>
              <span style={{ fontSize: 24 }}>📲</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Contact Picker ખોલો</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Phone book માંથી contacts select કરો</div>
              </div>
            </button>

            {picked.length > 0 && (
              <div>
                <div style={s.listHeader}>
                  <span style={s.listCount}>{picked.length} contacts selected</span>
                  <button style={s.selectAllBtn} onClick={selectAll}>
                    ✅ બધા select ({validContacts.length})
                  </button>
                </div>

                <div style={s.contactList}>
                  {picked.map((c) => {
                    const valid = isValidName(c.name) && c.city;
                    const isChecked = !!selected[c.id];
                    return (
                      <div key={c.id} style={{
                        ...s.contactCard,
                        borderColor: isChecked ? "#10b981" : valid ? "#e5e7eb" : "#fde68a",
                        background:  isChecked ? "#f0fdf4" : "#fff",
                      }}>
                        <div style={s.contactTop}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!valid}
                            onChange={() => toggleSelect(c.id)}
                            style={s.checkbox}
                          />
                          <div style={s.contactInfo}>
                            <input
                              style={{
                                ...s.nameInput,
                                borderColor: isValidName(c.name) ? "#d1fae5" : "#fde68a",
                              }}
                              value={c.name}
                              onChange={e => updateName(c.id, e.target.value)}
                              placeholder="પૂરું નામ (ઓછામાં ઓછા 2 words)"
                            />
                            <div style={s.phoneText}>📞 {c.phone}</div>
                          </div>
                          <div style={s.rightActions}>
                            <button
                              style={{
                                ...s.cityBtn,
                                background: c.city ? "#d1fae5" : "#fef3c7",
                                color:      c.city ? "#065f46" : "#92400e",
                              }}
                              onClick={() => openCityPopup(c.id)}
                            >
                              {c.city || "📍 City"}
                            </button>
                            <button style={s.removeBtn} onClick={() => removeContact(c.id)}>✕</button>
                          </div>
                        </div>
                        {!isValidName(c.name) && (
                          <div style={s.warning}>⚠️ ઓછામાં ઓછા 2 words નું નામ લખો</div>
                        )}
                        {!c.city && isValidName(c.name) && (
                          <div style={s.warning}>📍 City select કરો</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedContacts.length > 0 && (
                  <button
                    style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting
                      ? "⏳ Uploading..."
                      : `✅ ${selectedContacts.length} Contacts Submit કરો`}
                  </button>
                )}

                {submitDone && (
                  <div style={s.successBanner}>🎉 Contacts successfully ઉમેરાઈ ગયા!</div>
                )}
              </div>
            )}

            {picked.length === 0 && (
              <div style={s.emptyState}>
                <div style={{ fontSize: 48 }}>👥</div>
                <div style={s.emptyTitle}>Contact Picker ખોલો</div>
                <div style={s.emptyText}>
                  તમારા phone book માંથી community ના contacts select કરો,
                  નામ edit કરો, city add કરો અને submit કરો.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: INVITE ── */}
        {tab === "invite" && (
          <div>
            <div style={s.inviteInfo}>
              <span style={{ fontSize: 20 }}>📲</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Personal WhatsApp Invite</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  ફક્ત unregistered contacts • Invitation 48 કલાક valid
                </div>
              </div>
              <button style={s.refreshBtn} onClick={loadInviteList}>🔄</button>
            </div>

            {inviteLoading && (
              <div style={s.loadingBox}>⏳ List load થઈ રહ્યું છે...</div>
            )}

            {!inviteLoading && inviteList.length === 0 && (
              <div style={s.emptyState}>
                <div style={{ fontSize: 48 }}>✅</div>
                <div style={s.emptyTitle}>બધા invited છે!</div>
                <div style={s.emptyText}>
                  હાલ કોઈ contact available નથી.<br />
                  48 કલાક પછી expire થયેલા contacts ફરી દેખાશે.
                </div>
              </div>
            )}

            {!inviteLoading && inviteList.length > 0 && (
              <div>
                <div style={s.listHeader}>
                  <span style={s.listCount}>{inviteList.length} contacts available</span>
                </div>
                <div style={s.inviteList}>
                  {inviteList.map(c => (
                    <div key={c.phone} style={s.inviteCard}>
                      <div style={s.inviteAvatar}>
                        {c.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={s.inviteDetails}>
                        <div style={s.inviteName}>{c.name}</div>
                        <div style={s.invitePhone}>📞 {c.phone}</div>
                        {c.city && <div style={s.inviteCity}>📍 {c.city}</div>}
                      </div>
                      <button
                        style={{
                          ...s.whatsappBtn,
                          opacity: inviteSending === c.phone ? 0.6 : 1,
                        }}
                        onClick={() => sendInvite(c)}
                        disabled={inviteSending === c.phone}
                      >
                        {inviteSending === c.phone
                          ? "⏳"
                          : <><span style={{ fontSize: 18 }}>💬</span> Invite</>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── City Popup ── */}
      {cityTarget !== null && (
        <div style={s.overlay} onClick={() => setCityTarget(null)}>
          <div style={s.popup} onClick={e => e.stopPropagation()}>
            <div style={s.popupHeader}>
              <span style={{ fontSize: 18 }}>📍 City Select કરો</span>
              <button style={s.popupClose} onClick={() => setCityTarget(null)}>✕</button>
            </div>
            <input
              style={s.citySearchInput}
              placeholder="Search city..."
              value={citySearch}
              onChange={e => setCitySearch(e.target.value)}
              autoFocus
            />
            <div style={s.cityGrid}>
              {filteredCities.map(city => (
                <button key={city} style={s.cityOption} onClick={() => selectCity(city)}>
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Stat Pill ──────────────────────────────────────────────────
function StatPill({ icon, label, value, color }) {
  return (
    <div style={{ ...s.statPill, borderColor: color }}>
      <span>{icon}</span>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 10, color: "#9ca3af" }}>{label}</div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    paddingBottom: 40,
  },
  header: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f4c81 100%)",
    padding: "20px 16px 20px",
  },
  headerInner: {
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 3,
    color: "#93c5fd",
    fontWeight: 700,
    marginBottom: 4,
  },
  headerTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
    color: "#fff",
    letterSpacing: -1,
  },
  statsRow: {
    display: "flex",
    gap: 8,
  },
  statPill: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid",
    borderRadius: 12,
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#fff",
    minWidth: 60,
  },
  leaderboardBtn: {
    width: "100%",
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
  },
  tabBar: {
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    background: "#fff",
    borderBottom: "2px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  tab: {
    flex: 1,
    padding: "14px 8px",
    border: "none",
    background: "transparent",
    fontSize: 14,
    fontWeight: 600,
    color: "#9ca3af",
    cursor: "pointer",
    borderBottom: "3px solid transparent",
    marginBottom: -2,
    fontFamily: "'Nunito', sans-serif",
  },
  tabActive: {
    flex: 1,
    padding: "14px 8px",
    border: "none",
    background: "transparent",
    fontSize: 14,
    fontWeight: 800,
    color: "#0f4c81",
    cursor: "pointer",
    borderBottom: "3px solid #0f4c81",
    marginBottom: -2,
    fontFamily: "'Nunito', sans-serif",
  },
  body: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "16px",
  },
  pickBtn: {
    width: "100%",
    padding: "18px 20px",
    borderRadius: 16,
    border: "2px dashed #0f4c81",
    background: "#eff6ff",
    color: "#0f4c81",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
    textAlign: "left",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listCount: {
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
  },
  selectAllBtn: {
    fontSize: 12,
    fontWeight: 700,
    color: "#10b981",
    background: "#d1fae5",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
  },
  contactList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 16,
  },
  contactCard: {
    background: "#fff",
    borderRadius: 14,
    border: "2px solid",
    padding: "12px 14px",
    transition: "all 0.2s",
  },
  contactTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    cursor: "pointer",
    flexShrink: 0,
  },
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameInput: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1.5px solid",
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'Nunito', sans-serif",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 600,
  },
  rightActions: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  cityBtn: {
    padding: "5px 10px",
    borderRadius: 8,
    border: "none",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: "none",
    background: "#fee2e2",
    color: "#ef4444",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  warning: {
    fontSize: 11,
    color: "#d97706",
    fontWeight: 600,
    marginTop: 6,
    paddingLeft: 30,
  },
  submitBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #0f4c81, #1e3a5f)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 8,
    fontFamily: "'Nunito', sans-serif",
    boxShadow: "0 4px 20px rgba(15,76,129,0.4)",
  },
  successBanner: {
    marginTop: 12,
    padding: "14px 20px",
    borderRadius: 12,
    background: "#d1fae5",
    color: "#065f46",
    fontWeight: 800,
    fontSize: 15,
    textAlign: "center",
    border: "2px solid #10b981",
  },
  emptyState: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#9ca3af",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#374151",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#6b7280",
  },
  inviteInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "#fff",
    borderRadius: 14,
    border: "2px solid #e5e7eb",
    marginBottom: 16,
  },
  refreshBtn: {
    marginLeft: "auto",
    background: "#f3f4f6",
    border: "none",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 16,
  },
  loadingBox: {
    textAlign: "center",
    padding: 30,
    color: "#6b7280",
    fontWeight: 600,
  },
  inviteList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  inviteCard: {
    background: "#fff",
    borderRadius: 14,
    border: "2px solid #e5e7eb",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  inviteAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #0f4c81, #10b981)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inviteDetails: {
    flex: 1,
    minWidth: 0,
  },
  inviteName: {
    fontWeight: 800,
    fontSize: 15,
    color: "#1f2937",
  },
  invitePhone: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 600,
  },
  inviteCity: {
    fontSize: 11,
    color: "#9ca3af",
  },
  whatsappBtn: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "none",
    background: "#25d366",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    fontFamily: "'Nunito', sans-serif",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 100,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  popup: {
    background: "#fff",
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    padding: "20px 16px 32px",
  },
  popupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    fontWeight: 800,
    fontSize: 16,
    color: "#1f2937",
  },
  popupClose: {
    background: "#f3f4f6",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 800,
    color: "#374151",
  },
  citySearchInput: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "2px solid #e5e7eb",
    fontSize: 15,
    fontFamily: "'Nunito', sans-serif",
    outline: "none",
    marginBottom: 14,
    boxSizing: "border-box",
  },
  cityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    overflowY: "auto",
  },
  cityOption: {
    padding: "10px 8px",
    borderRadius: 10,
    border: "2px solid #e5e7eb",
    background: "#f9fafb",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    color: "#1f2937",
    fontFamily: "'Nunito', sans-serif",
    textAlign: "center",
  },
};