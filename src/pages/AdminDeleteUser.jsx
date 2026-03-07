// pages/AdminDeleteUser.jsx — TEMP ADMIN TOOL, remove after use.
// Deletes all RTDB data for a given UID.
// Requires user to be logged in (RTDB rules: auth != null)

import { useState, useEffect }          from "react";
import { getAuth, onAuthStateChanged }  from "firebase/auth";
import { ref, get, update }             from "firebase/database";
import { db }                           from "../lib/firebase";
import { emailToKey }                   from "../lib/text";
import { toMobileKey }                  from "../lib/phone";

const read = async (path) => {
  const s = await get(ref(db, path));
  return s.exists() ? s.val() : null;
};

async function deleteUserData(uid, log) {
  const user = await read(`users/${uid}`);
  if (!user) { log("❌ User not found: " + uid); return false; }
  log(`✅ User found: ${user.displayName || user.email || uid}`);

  const writes = {};

  // 1. User node
  writes[`users/${uid}`] = null;
  log("🗑️  users/" + uid);

  // 2. usersByEmail
  if (user.email) {
    writes[`usersByEmail/${emailToKey(user.email)}`] = null;
    log("🗑️  usersByEmail/" + emailToKey(user.email));
  }

  // 3. User mobile index
  if (user.mobile) {
    writes[`mobileIndex/${toMobileKey(user.mobile)}`] = null;
    log("🗑️  mobileIndex/" + toMobileKey(user.mobile));
  }

  // 4. Family + Members
  const familyId = user.familyId;
  if (familyId) {
    const family = await read(`families/${familyId}`);
    if (family) {
      log(`✅ Family: ${family.familyName || familyId} (PIN: ${family.familyPin})`);

      if (family.familyPin) {
        writes[`familiesByPin/${family.familyPin}`] = null;
        log("🗑️  familiesByPin/" + family.familyPin);
      }

      const memberIds = Object.keys(family.members || {});
      log(`📋 Members: ${memberIds.length}`);

      for (const mid of memberIds) {
        const m = await read(`members/${mid}`);
        if (m) {
          writes[`members/${mid}`] = null;
          log(`🗑️  members/${mid} (${m.name || "?"})`);

          if (m.mobile) {
            writes[`mobileIndex/${toMobileKey(m.mobile)}`] = null;
            log("🗑️  mobileIndex/" + toMobileKey(m.mobile));
          }

          // honoraryIndex
          const orgSnap = await get(ref(db, "honoraryIndex"));
          if (orgSnap.exists()) {
            orgSnap.forEach(orgChild => {
              if (orgChild.child(mid).exists()) {
                writes[`honoraryIndex/${orgChild.key}/${mid}`] = null;
                log("🗑️  honoraryIndex/" + orgChild.key + "/" + mid);
              }
            });
          }
        }
      }

      writes[`families/${familyId}`] = null;
      log("🗑️  families/" + familyId);
    }
  }

  // 5. Connectors
  log("🔍 Scanning connectors...");
  const connSnap = await get(ref(db, "connectors"));
  let connCount = 0;
  if (connSnap.exists()) {
    connSnap.forEach(child => {
      const d = child.val();
      if (d.uploadedBy?.[uid]) {
        const others = Object.keys(d.uploadedBy).filter(k => k !== uid);
        if (others.length === 0) {
          writes[`connectors/${child.key}`] = null;
          log("🗑️  connectors/" + child.key + " (deleted)");
        } else {
          writes[`connectors/${child.key}/uploadedBy/${uid}`] = null;
          log("🧹 connectors/" + child.key + "/uploadedBy removed");
        }
        connCount++;
      }
    });
  }
  log(`📋 Connectors affected: ${connCount}`);

  log("⏳ Executing batch delete...");
  await update(ref(db), writes);
  log("✅ Done! All data deleted for: " + uid);
  return true;
}

export default function AdminDeleteUser() {
  const [uid,       setUid]       = useState("");
  const [step,      setStep]      = useState("input");
  const [running,   setRunning]   = useState(false);
  const [logs,      setLogs]      = useState([]);
  const [preview,   setPreview]   = useState(null);
  const [authUser,  setAuthUser]  = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const addLog = (msg) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), u => {
      setAuthUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handlePreview = async () => {
    if (!uid.trim()) return;
    setRunning(true);
    try {
      const user = await read(`users/${uid.trim()}`);
      if (!user) { alert("User not found in RTDB: " + uid); setRunning(false); return; }
      setPreview(user);
      setStep("confirm");
    } catch (e) { alert("Error: " + e.message); }
    setRunning(false);
  };

  const handleDelete = async () => {
    setStep("running");
    setLogs([]);
    setRunning(true);
    try {
      await deleteUserData(uid.trim(), addLog);
      setStep("done");
    } catch (e) {
      addLog("❌ Error: " + e.message);
      setStep("done");
    }
    setRunning(false);
  };

  const reset = () => {
    setUid(""); setLogs([]); setPreview(null); setStep("input");
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">

        <div className="bg-red-700 text-white rounded-2xl p-4 mb-5 text-center">
          <div className="text-3xl mb-1">⚠️</div>
          <h1 className="text-lg font-black">Admin — Delete User Data</h1>
          <p className="text-xs opacity-80 mt-1">RTDB માંથી user નો બધો data delete કરે</p>
        </div>

        {/* Not ready */}
        {!authReady && (
          <div className="text-center py-10 text-gray-500">⏳ Checking auth...</div>
        )}

        {/* Not logged in */}
        {authReady && !authUser && (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
            <div className="text-4xl">🔒</div>
            <p className="font-bold text-gray-800">Login જરૂરી છે</p>
            <p className="text-sm text-gray-500">
              RTDB rules માટે authenticated user જોઈએ.<br />
              પહેલા app માં login કરો, પછી આ page visit કરો.
            </p>
            <a href="/login"
              className="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-bold"
              style={{ background: "#b91c1c" }}>
              Login →
            </a>
          </div>
        )}

        {/* Logged in */}
        {authReady && authUser && (
          <>
            <p className="text-xs text-gray-400 text-center mb-4">
              Logged in as: {authUser.email}
            </p>

            {/* Input */}
            {step === "input" && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-1.5">Firebase UID</label>
                  <input
                    value={uid}
                    onChange={e => setUid(e.target.value)}
                    placeholder="e.g. abc123XYZuid..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm font-mono outline-none focus:border-red-400"
                    style={{ fontSize: 14 }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Firebase Console → Authentication → Users → Copy UID
                  </p>
                </div>
                <button
                  onClick={handlePreview}
                  disabled={!uid.trim() || running}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-50"
                  style={{ background: "#b91c1c" }}>
                  {running ? "⏳ Loading..." : "🔍 Preview & Confirm"}
                </button>
              </div>
            )}

            {/* Confirm */}
            {step === "confirm" && preview && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="font-black text-gray-800">આ user delete કરવો છે?</h2>
                <div className="bg-red-50 rounded-xl p-4 space-y-1.5 border border-red-200">
                  <Row label="UID"      value={uid}                        mono />
                  <Row label="Name"     value={preview.displayName || "—"}      />
                  <Row label="Email"    value={preview.email       || "—"}      />
                  <Row label="Mobile"   value={preview.mobile      || "—"}      />
                  <Row label="FamilyId" value={preview.familyId    || "No family"} mono />
                  <Row label="Status"   value={preview.status      || "—"}      />
                </div>
                <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-2 rounded-lg">
                  ⚠️ આ action undo નહીં થઈ શકે. Family, Members, mobileIndex — બધું delete.
                </p>
                <div className="flex gap-3">
                  <button onClick={reset}
                    className="flex-1 py-3 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-600">
                    Cancel
                  </button>
                  <button onClick={handleDelete}
                    className="flex-1 py-3 rounded-xl text-white text-sm font-black"
                    style={{ background: "#b91c1c" }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}

            {/* Running / Done */}
            {(step === "running" || step === "done") && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="font-black text-gray-800">
                  {step === "running" ? "⏳ Deleting..." : "✅ Complete"}
                </h2>
                <div className="bg-gray-900 rounded-xl p-4 h-80 overflow-y-auto font-mono text-xs space-y-1">
                  {logs.map((l, i) => (
                    <div key={i} className={
                      l.startsWith("❌") ? "text-red-400"    :
                      l.startsWith("✅") ? "text-green-400"  :
                      l.startsWith("⏳") ? "text-yellow-400" :
                      l.startsWith("🗑") ? "text-red-300"    :
                      l.startsWith("🧹") ? "text-orange-300" :
                      "text-gray-300"
                    }>{l}</div>
                  ))}
                  {step === "running" && <div className="text-yellow-400 animate-pulse">▌</div>}
                </div>
                {step === "done" && (
                  <button onClick={reset}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm"
                    style={{ background: "#1d4ed8" }}>
                    🔄 બીજો User Delete કરો
                  </button>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-bold text-gray-500 w-20 shrink-0">{label}:</span>
      <span className={`text-xs text-gray-800 break-all ${mono ? "font-mono" : "font-semibold"}`}>{value}</span>
    </div>
  );
}