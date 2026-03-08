import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ref, get } from "firebase/database";
import { db } from "../lib/firebase";
import { ChevronDown, MessageCircle, RefreshCw } from "lucide-react";
import localforage from "localforage";

// ─────────────────────────────────────────────
// CACHE KEYS & TTL
// ─────────────────────────────────────────────
const CACHE_LEADERS_KEY = "leaders_orgMap_v1";
const CACHE_PHOTOS_KEY  = "leaders_photos_v1";
const CACHE_META_KEY    = "leaders_meta_v1";
const CACHE_TTL_MS      = 4 * 60 * 60 * 1000;

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const KNOWN_ORGS = [
  { id: "kadavani", label: "કેળવણી મંડળ"   },
  { id: "seva",     label: "સેવા સમાજ"      },
  { id: "suraksha", label: "સુરક્ષા ટ્રસ્ટ" },
  { id: "sthanik",  label: "સ્થાનિક સમાજ"   },
  { id: "other",    label: "અન્ય સંસ્થા"     },
];

const POST_ORDER = [
  "પ્રમુખ","ઉપ-પ્રમુખ","મંત્રી","સહ-મંત્રી",
  "ખજાનચી","ટ્રસ્ટી","સંયોજક","સભ્ય","અન્ય",
];

const POST_ICONS = {
  "પ્રમુખ":    "👑",
  "ઉપ-પ્રમુખ": "🎖️",
  "મંત્રી":    "📋",
  "સહ-મંત્રી": "📌",
  "ખજાનચી":   "💰",
  "ટ્રસ્ટી":   "🏛️",
  "સંયોજક":   "🔗",
  "સભ્ય":     "👤",
  "અન્ય":     "⭐",
};

// ─────────────────────────────────────────────
// PHOTO CACHING HELPERS
// ─────────────────────────────────────────────
async function fetchAndCachePhoto(url, forceRefresh = false) {
  if (!url) return null;
  try {
    const photos = (await localforage.getItem(CACHE_PHOTOS_KEY)) || {};
    const cached = photos[url];
    if (cached && !forceRefresh && (Date.now() - cached.savedAt < CACHE_TTL_MS)) {
      return cached.data;
    }
    const response = await fetch(url);
    const blob     = await response.blob();
    const base64   = await new Promise((resolve, reject) => {
      const reader   = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    photos[url] = { data: base64, savedAt: Date.now() };
    await localforage.setItem(CACHE_PHOTOS_KEY, photos);
    return base64;
  } catch {
    return url;
  }
}

async function resolvePhotos(orgMap, forceRefresh = false) {
  const allUrls = new Set();
  Object.values(orgMap).forEach(leaders =>
    leaders.forEach(e => { if (e.photoURL) allUrls.add(e.photoURL); })
  );
  const resolved = {};
  await Promise.all(
    [...allUrls].map(async url => {
      resolved[url] = await fetchAndCachePhoto(url, forceRefresh);
    })
  );
  const patched = {};
  Object.entries(orgMap).forEach(([orgId, leaders]) => {
    patched[orgId] = leaders.map(e => ({
      ...e,
      photoURL: e.photoURL ? (resolved[e.photoURL] || e.photoURL) : null,
    }));
  });
  return patched;
}

// ─────────────────────────────────────────────
// DATA CACHE HELPERS
// ─────────────────────────────────────────────
async function readDataCache() {
  try {
    const meta = await localforage.getItem(CACHE_META_KEY);
    if (!meta?.savedAt) return null;
    if (Date.now() - meta.savedAt > CACHE_TTL_MS) return null;
    const orgMap = await localforage.getItem(CACHE_LEADERS_KEY);
    return orgMap || null;
  } catch {
    return null;
  }
}

async function writeDataCache(orgMap) {
  try {
    await localforage.setItem(CACHE_LEADERS_KEY, orgMap);
    await localforage.setItem(CACHE_META_KEY, { savedAt: Date.now() });
  } catch {}
}

async function clearAllCache() {
  try {
    await Promise.all([
      localforage.removeItem(CACHE_LEADERS_KEY),
      localforage.removeItem(CACHE_META_KEY),
      localforage.removeItem(CACHE_PHOTOS_KEY),
    ]);
  } catch {}
}

// ─────────────────────────────────────────────
// RTDB FETCH
// ─────────────────────────────────────────────
async function fetchHonoraryIndex() {
  const snap = await get(ref(db, "honoraryIndex"));
  if (!snap.exists()) return {};
  const raw    = snap.val();
  const orgMap = {};
  Object.entries(raw).forEach(([orgId, members]) => {
    if (!members) return;
    orgMap[orgId] = Object.entries(members)
      .filter(([, e]) => e?.post)
      .map(([memberId, e]) => ({ memberId, ...e }));
  });
  return orgMap;
}

// ─────────────────────────────────────────────
// MEMBER CARD
// ─────────────────────────────────────────────
function MemberCard({ entry, showOrgName = false }) {
  // ✅ useState inside component — each card has its own independent zoom state
  const [isZoomed, setIsZoomed] = useState(false);

  const { memberName,city, post, mobile, photoURL, orgName } = entry;

  const initials = (memberName || "?")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleWhatsApp = () => {
    if (!mobile) return;
    const digits = String(mobile).replace(/\D/g, "");
    const num    = digits.startsWith("91") ? digits : `91${digits}`;
    window.open(`https://wa.me/${num}`, "_blank");
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.98]"
      style={{ background: "#fff", borderColor: "#f0e6e6" }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {photoURL ? (
          <>
            <img
              src={photoURL}
              alt={memberName}
              onClick={() => setIsZoomed(true)}
              className="w-12 h-12 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform duration-200"
              style={{ border: "2px solid #f0e6e6", position: "relative", zIndex: 1 }}
            />

            {/* ✅ createPortal — renders into document.body, completely outside card DOM */}
            {isZoomed && createPortal(
              <>
                {/* Overlay — tap anywhere outside to close */}
                <div
                  style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.78)",
                    zIndex: 9998,
                  }}
                  onClick={() => setIsZoomed(false)}
                />

                {/* Zoomed image + X button — stopPropagation so tapping image doesn't close */}
                <div
                  style={{
                    position: "fixed",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 9999,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={photoURL}
                    alt={memberName}
                    style={{
                      width: 260, height: 260,
                      borderRadius: 16,
                      objectFit: "cover",
                      border: "3px solid #fff",
                      boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                      display: "block",
                    }}
                  />

                  {/* ✕ button — top-right corner */}
                  <button
                    onClick={() => setIsZoomed(false)}
                    style={{
                      position: "absolute",
                      top: -14, right: -14,
                      width: 32, height: 32,
                      borderRadius: "50%",
                      background: "#7B1C2E",
                      color: "#F0D080",
                      border: "2px solid #fff",
                      fontWeight: 900,
                      fontSize: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    }}
                  >
                    ✕
                  </button>

                  {/* Member name below image */}
                  <p style={{
                    textAlign: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    marginTop: 10,
                    textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                  }}>
                    {memberName}
                  </p>
                </div>
              </>,
              document.body
            )}
          </>
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "#7B1C2E", color: "#F0D080" }}
          >
            {initials}
          </div>
        )}

        {/* Post badge */}
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
          style={{ background: "#FDF0D0", border: "1.5px solid #C9A84C" }}
        >
          {POST_ICONS[post] || "⭐"}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "#3D0010" }}>
          {memberName || "—"}
        </p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: "#7B1C2E" }}>
          {city}-{post}
        </p>
        {showOrgName && orgName && (
          <p className="text-xs mt-0.5 truncate font-medium" style={{ color: "#C9A84C" }}>
            🏛️ {orgName}
          </p>
        )}
      </div>

      {/* WhatsApp */}
      {mobile && (
        <button
          onClick={handleWhatsApp}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: "#25D366" }}
        >
          <MessageCircle size={16} color="#fff" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ORG SELECTOR DROPDOWN
// ─────────────────────────────────────────────
function OrgSelector({ selectedOrg, onChange, availableOrgs }) {
  const [open, setOpen] = useState(false);
  const current = KNOWN_ORGS.find(o => o.id === selectedOrg);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 w-full"
        style={{ borderColor: "#C9A84C", background: "#FDF0D0" }}
      >
        <span className="flex-1 text-sm font-bold text-left" style={{ color: "#5A1020" }}>
          {current?.label || "સંસ્થા પસંદ કરો"}
        </span>
        <ChevronDown size={16} style={{
          color: "#C9A84C",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-20"
            style={{
              background: "#fff",
              borderColor: "#f0e6e6",
              boxShadow: "0 8px 24px rgba(90,16,32,0.12)",
            }}
          >
            {availableOrgs.map(org => (
              <button
                key={org.id}
                onClick={() => { onChange(org.id); setOpen(false); }}
                className="w-full px-4 py-3 text-left text-sm font-semibold border-b last:border-b-0"
                style={{
                  borderColor: "#f0e6e6",
                  background: org.id === selectedOrg ? "#FDE8EC" : "#fff",
                  color:      org.id === selectedOrg ? "#7B1C2E"  : "#3D0010",
                }}
              >
                {org.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function About() {
  const [orgMap,      setOrgMap]      = useState({});
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [savedAt,     setSavedAt]     = useState(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    forceRefresh ? setRefreshing(true) : setLoading(true);
    try {
      let data = null;
      if (!forceRefresh) {
        data = await readDataCache();
      } else {
        await clearAllCache();
      }
      if (!data) {
        const raw = await fetchHonoraryIndex();
        data = await resolvePhotos(raw, forceRefresh);
        await writeDataCache(data);
      }
      setOrgMap(data);
      const meta = await localforage.getItem(CACHE_META_KEY);
      if (meta?.savedAt) setSavedAt(meta.savedAt);
    } catch (err) {
      console.error("LeadersPage load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const availableOrgs = KNOWN_ORGS.filter(o => orgMap[o.id]?.length > 0);

  useEffect(() => {
    if (!selectedOrg && availableOrgs.length > 0) {
      setSelectedOrg(availableOrgs[0].id);
    }
  }, [availableOrgs.length]); // eslint-disable-line

  const currentLeaders = (orgMap[selectedOrg] || []).sort((a, b) => {
    const ai = POST_ORDER.indexOf(a.post);
    const bi = POST_ORDER.indexOf(b.post);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const currentOrg = KNOWN_ORGS.find(o => o.id === selectedOrg);

  const cacheLabel = savedAt
    ? (() => {
        const mins = Math.floor((Date.now() - savedAt) / 60000);
        if (mins < 1)  return "હમણાં જ";
        if (mins < 60) return `${mins} મિ. પહેલાં`;
        return `${Math.floor(mins / 60)} ક. પહેલાં`;
      })()
    : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3"
        style={{ background: "#FDF6EC", minHeight: "100vh" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "#C9A84C", borderTopColor: "transparent" }} />
        <p className="text-xs" style={{ color: "#C0A0A0" }}>લોડ થઈ રહ્યું છે...</p>
      </div>
    );
  }

  const Header = (
    <div className="px-4 pt-5 pb-3 flex-shrink-0"
      style={{ background: "linear-gradient(135deg, #7B1C2E, #5A1020)" }}>
      <div className="flex items-start justify-between mb-3">
        <h1 className="text-xl font-bold mt-0.5" style={{ color: "#F0D080" }}>
          🏅 હોદ્દેદારો-Honoured Dignitary
        </h1>
        <div className="flex flex-col items-end gap-1 mt-1">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <RefreshCw size={16} color="#F0D080" className={refreshing ? "animate-spin" : ""} />
          </button>
          {cacheLabel && (
            <p className="text-xs" style={{ color: "rgba(240,208,128,0.55)" }}>
              {cacheLabel}
            </p>
          )}
        </div>
      </div>
      {availableOrgs.length > 0 && (
        <OrgSelector
          selectedOrg={selectedOrg}
          onChange={setSelectedOrg}
          availableOrgs={availableOrgs}
        />
      )}
    </div>
  );

  if (availableOrgs.length === 0) {
    return (
      <div className="flex flex-col" style={{ background: "#FDF6EC", minHeight: "100vh" }}>
        {Header}
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-6">
          <div className="text-5xl">🏅</div>
          <p className="text-sm font-bold" style={{ color: "#5A1020" }}>કોઈ હોદ્દેદાર નથી</p>
          <p className="text-xs" style={{ color: "#C0A0A0" }}>સભ્યોના પ્રોફાઇલમાં હોદ્દો ઉમેરો</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ background: "#FDF6EC", minHeight: "100vh" }}>

      {Header}

      {/* ── ORG PILLS ── */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0"
        style={{ borderBottom: "1px solid #f0e6e6" }}>
        {availableOrgs.map(org => (
          <button
            key={org.id}
            onClick={() => setSelectedOrg(org.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all leading-tight"
            style={{
              maxWidth: "60px",
              whiteSpace: "normal",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "45px",
              ...(org.id === selectedOrg
                ? { background: "#7B1C2E", borderColor: "#7B1C2E", color: "#F0D080" }
                : { background: "#fff",    borderColor: "#f0e6e6", color: "#9B6060" })
            }}
          >
            {org.label}
          </button>
        ))}
      </div>

      {/* ── LEADERS LIST ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4"
        style={{ WebkitOverflowScrolling: "touch" }}>

     

        {currentLeaders.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <div className="text-3xl">👤</div>
            <p className="text-sm" style={{ color: "#C0A0A0" }}>કોઈ હોદ્દેદાર નથી</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {currentLeaders.map((entry, i) => (
              <MemberCard
                key={`${entry.memberId}-${i}`}
                entry={entry}
                showOrgName={selectedOrg === "sthanik" || selectedOrg === "other"}
              />
            ))}
          </div>
        )}

        {refreshing && (
          <div className="flex items-center justify-center gap-2 py-4 mt-2">
            <div className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: "#C9A84C", borderTopColor: "transparent" }} />
            <p className="text-xs" style={{ color: "#C9A84C" }}>અપડેટ થઈ રહ્યું છે...</p>
          </div>
        )}

        <div style={{ height: "calc(80px + env(safe-area-inset-bottom, 0px))" }} />
      </div>
    </div>
  );
}