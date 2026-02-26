import { useContext, useEffect, useState, useCallback, useRef } from "react";
import { signOut } from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import EditMemberModal from "../components/modals/EditMemberModal";
import ImageUploadBox from "../components/ImageUploadBox";
import { Plus, RefreshCw, LogOut, ChevronRight, Phone, MapPin, Pencil, Check, X } from "lucide-react";
import { loadCache, saveCache, invalidateCache } from "../utils/cache";

// ── Inline editable field in the hero banner ──
function InlineField({ icon, value, placeholder, onSave, pulseDuration = "1.8s", pulseDelay = "0s" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef(null);
  const isEmpty = !value;

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 100); // delay for sheet animation
    }
  }, [editing]);

  const handleSave = () => {
    if (draft.trim()) onSave(draft.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value || "");
    setEditing(false);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setDraft(value || ""); setEditing(true); }}
        className="flex items-center gap-1.5 mt-1 w-full text-left group"
      >
        {icon}
        {isEmpty ? (
          <span
            className="text-xs"
            style={{
              color: "rgba(255,220,100,0.9)",
              animation: `pulse ${pulseDuration} ease-in-out infinite`,
              animationDelay: pulseDelay,
            }}
          >
            {placeholder}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "rgba(240,208,128,0.85)" }}>
            {value}
          </span>
        )}
        <Pencil size={10} className="ml-1 opacity-0 group-hover:opacity-60 transition-opacity" color="#F0D080" />
      </button>

      {/* Bottom Sheet Overlay */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={handleCancel}
        >
          <div
            className="rounded-t-2xl p-5 w-full"
            style={{ background: "#FDF6EC",paddingBottom: "96px" }}
            onClick={e => e.stopPropagation()} // prevent close on inner click
          >
            {/* Handle bar */}
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "#C9A84C" }} />

            <p className="text-sm font-semibold mb-3" style={{ color: "#5A1020" }}>
              {placeholder.replace("+ ", "").replace(" (tap to add)", "")}
            </p>

            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border-2"
              style={{
                background: "#fff",
                border: "2px solid #C9A84C",
                color: "#5A1020",
                fontSize: 16, // prevents iOS zoom on focus
              }}
              placeholder={placeholder}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(90,16,32,0.08)", color: "#7B1C2E" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#7B1C2E" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// ── Profile completion ──
function calcCompletion(family, members) {
  const head = members.find(m => m.isHead) || members[0];
  const checks = [
    !!family.city,
    !!family.native,
    !!family.address,
    members.length > 1,
    !!head?.mobile,
    !!head?.gender,
    !!head?.dob,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export default function DashboardPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const loadFamily = useCallback(async (forceRefresh = false) => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const CACHE_KEY = `family_${user.uid}`;

    if (!forceRefresh) {
      const cached = await loadCache(CACHE_KEY);
      if (cached) {
        setFamily(cached.family);
        setFamilyId(cached.familyId);
        setLoading(false);
        return;
      }
    }

    let famId = null;
    const uidSnap = await get(ref(db, `users/${user.uid}`));
    if (uidSnap.exists()) famId = uidSnap.val()?.familyId;

    if (!famId && user?.email) {
      const emailKey = user.email.toLowerCase().replace(/\./g, ",").replace(/@/g, "_");
      const emailSnap = await get(ref(db, `users/${emailKey}`));
      if (emailSnap.exists()) {
        const oldData = emailSnap.val();
        famId = oldData.familyId;
        await set(ref(db, `users/${user.uid}`), { ...oldData, email: user.email });
      }
    }

    if (!famId) { setLoading(false); return; }

    const famSnap = await get(ref(db, `families/${famId}`));
    const famData = famSnap.val();
    if (!famData) { setLoading(false); return; }

    const memberIds = Object.keys(famData.members || {});
    const snapshots = await Promise.all(memberIds.map(id => get(ref(db, `members/${id}`))));
    const membersData = snapshots.filter(s => s.exists()).map(s => ({ id: s.key, ...s.val() }));

    const familyResult = { ...famData, members: membersData };
    await saveCache(CACHE_KEY, { family: familyResult, familyId: famId });
    setFamilyId(famId);
    setFamily(familyResult);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadFamily(); }, [loadFamily]);

  const patchCache = async (updaterFn) => {
    const CACHE_KEY = `family_${user.uid}`;
    const cached = await loadCache(CACHE_KEY);
    if (!cached) return;
    const updatedFamily = updaterFn(cached.family);
    await saveCache(CACHE_KEY, { family: updatedFamily, familyId: cached.familyId });
    setFamily(updatedFamily);
  };

  // Save a family-level field inline to Firebase + cache
  const saveFamilyField = async (field, value) => {
  await update(ref(db, `families/${familyId}`), { [field]: value });
  await patchCache(fam => ({ ...fam, [field]: value }));
};

  const logout = async () => {
    await invalidateCache(`family_${user.uid}`);
    await signOut(auth);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FDF6EC" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "#7B1C2E", borderTopColor: "transparent" }} />
          <p className="text-sm" style={{ color: "#7B1C2E" }}>Loading your family...</p>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#FDF6EC" }}>
        <div className="text-center">
          <div className="text-5xl mb-4">👨‍👩‍👧</div>
          <p className="mb-4" style={{ color: "#5A1020" }}>No family found.</p>
          <button onClick={() => navigate("/registration")}
            className="px-5 py-2 rounded-lg text-white font-semibold" style={{ background: "#7B1C2E" }}>
            Register Family
          </button>
        </div>
      </div>
    );
  }

  const members = family?.members || [];
  const head = members.find(m => m.isHead) || members[0];
  const students = members.filter(m => m.isStudent);
  const contacts = members.filter(m => !m.isStudent);
  const filteredMembers =
    activeTab === "students" ? students :
    activeTab === "contacts" ? contacts :
    members;

  const completion = calcCompletion(family, members);

  // Build WhatsApp invite link for a member
  const whatsappInvite = (member) => {
    const text = encodeURIComponent(
      `નમસ્તે ${member.name?.split(" ")[0] || ""}! 🙏\nઅમારી ફેમિલી એપ પર જોડાઓ.\nLink: ${window.location.origin}/join?familyId=${familyId}\nPIN: ${family.familyPin}`
    );
    return `https://wa.me/91${member.mobile}?text=${text}`;
  };

  // Member detail line
  const memberDetail = (m) => {
    const parts = [];
    if (m.isStudent) parts.push(m.education || m.educationType || "Student");
    else if (m.occupation) parts.push(m.occupation);
    if (m.married === true) parts.push("Married");
    if (m.married === false && !m.isStudent) parts.push("Unmarried");
    if (m.stayCity && m.stayAway) parts.push(`📍 ${m.stayCity}`);
    return parts.join(" · ") || "Member";
  };

  return (
    <div className="max-w-md mx-auto pb-24 min-h-screen" style={{ background: "#FDF6EC" }}>

      {/* ── HERO BANNER ── */}
      <div
        className="px-5 pt-4 pb-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #5A1020 0%, #7B1C2E 50%, #9B2335 100%)" }}
      >
        {/* Gold top line */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "#C9A84C" }} />

        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10" style={{ background: "#C9A84C" }} />
        <div className="absolute -bottom-8 -left-4 w-36 h-36 rounded-full opacity-10" style={{ background: "#C9A84C" }} />

        {/* Top bar */}
        <div className="flex justify-between items-center mb-4 relative">
          <button onClick={() => loadFamily(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.25)" }}>
            <RefreshCw size={14} color="#F0D080" />
          </button>
          <button onClick={logout}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full"
            style={{ background: "rgba(201,168,76,0.25)", color: "#F0D080" }}>
            <LogOut size={12} /> Logout
          </button>
        </div>

        {/* Head name + native */}
        <div className="relative">
          <h1 className="text-xl font-bold leading-tight" style={{ color: "#F0D080" }}>
            {head?.name || "My Family"}
            {family.native && (
              <span className="text-sm font-normal ml-1" style={{ color: "rgba(240,208,128,0.7)" }}>
                ({family.native})
              </span>
            )}
          </h1>

          {/* PIN */}
          <div className="mt-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#C9A84C", color: "#5A1020" }}>
              PIN: {family.familyPin}
            </span>
          </div>

          {/* Inline editable fields */}
          <InlineField
            icon={<MapPin size={11} color="rgba(240,208,128,0.6)" />}
            value={family.city}
            placeholder="+ નગર/શહેર ઉમેરો (tap to add)"
            onSave={v => saveFamilyField("city", v)}
          />
      <InlineField
  icon={<span style={{ fontSize: 11, color: "rgba(240,208,128,0.6)" }}>🏡</span>}
  value={family.native}
  placeholder="+ વતન ઉમેરો (tap to add)"
  onSave={v => saveFamilyField("native", v)}
  pulseDuration="1.2s"
  pulseDelay="0s"
/>
<InlineField
  icon={<span style={{ fontSize: 11, color: "rgba(240,208,128,0.6)" }}>📬</span>}
  value={family.address}
  placeholder="+ સરનામું ઉમેરો (tap to add)"
  onSave={v => saveFamilyField("address", v)}
  pulseDuration="2.5s"
  pulseDelay="0.4s"
/>
        </div>

        {/* Profile completion bar */}
        <div className="mt-4 relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs" style={{ color: "rgba(240,208,128,0.7)" }}>
              Profile Completion
            </span>
            <span className="text-xs font-bold" style={{ color: "#F0D080" }}>{completion}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${completion}%`,
                background: completion === 100 ? "#C9A84C" : "linear-gradient(90deg, #C9A84C, #F0D080)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── MEMBER AVATAR STRIP ── */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 4px 20px rgba(90,16,32,0.12)" }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#7B1C2E" }}>
            Family Members
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {members.map(m => (
              <button key={m.id} onClick={() => setEditingMember(m)}
                className="flex flex-col items-center flex-shrink-0 gap-1">
                <div
                  className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2"
                  style={{ borderColor: m.isHead ? "#C9A84C" : m.isStudent ? "#7B1C2E" : "#e5e7eb" }}
                >
                  {m.photoUrl
                    ? <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                    : <span className="text-xl font-bold" style={{ color: "#7B1C2E" }}>{(m.name || "?")[0].toUpperCase()}</span>
                  }
                </div>
                <span className="text-xs max-w-[56px] truncate text-center leading-tight" style={{ color: "#5A1020" }}>
                  {m.name?.split(" ")[0] || "—"}
                </span>
                {m.isHead && <span className="text-xs -mt-1 font-semibold" style={{ color: "#C9A84C" }}>Head</span>}
              </button>
            ))}

            <button onClick={() => setShowAddModal(true)}
              className="flex flex-col items-center flex-shrink-0 gap-1">
              <div className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center"
                style={{ borderColor: "#C9A84C", color: "#C9A84C" }}>
                <Plus size={22} />
              </div>
              <span className="text-xs" style={{ color: "#C9A84C" }}>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB FILTER ── */}
      <div className="px-4 mt-4">
        <div className="rounded-xl p-1 flex" style={{ background: "rgba(90,16,32,0.08)" }}>
          {[
            { key: "all",      label: `All (${members.length})` },
            { key: "students", label: `Students (${students.length})` },
            { key: "contacts", label: `Others (${contacts.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
              style={activeTab === tab.key
                ? { background: "#7B1C2E", color: "#F0D080", boxShadow: "0 1px 4px rgba(90,16,32,0.3)" }
                : { color: "#7B1C2E" }
              }>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MEMBER CARDS ── */}
      <div className="px-4 mt-3 space-y-2">
        {filteredMembers.length === 0 && (
          <div className="bg-white rounded-xl p-6 text-center text-sm" style={{ color: "#9B2335" }}>
            No members in this category
          </div>
        )}

        {filteredMembers.map(member => (
          <div key={member.id} className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: "0 2px 10px rgba(90,16,32,0.08)" }}>
            <div className="flex items-start gap-3 p-3">

              <ImageUploadBox familyId={familyId} memberId={member.id} photoUrl={member.photoUrl} />

              <div className="flex-1 min-w-0">
                {/* Name + badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold" style={{ color: "#5A1020" }}>{member.name || "—"}</p>
                  {member.isHead && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{ background: "#FDF0D0", color: "#7B5A00", border: "1px solid #C9A84C" }}>
                      Head
                    </span>
                  )}
                  {member.isStudent && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "#FDE8EC", color: "#7B1C2E" }}>
                      Student
                    </span>
                  )}
                </div>

                {/* Detail line */}
                <p className="text-xs mt-0.5" style={{ color: "#9B6060" }}>
                  {memberDetail(member)}
                </p>

                {/* Mobile + WhatsApp invite */}
                {member.mobile && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1" style={{ color: "#9B2335", opacity: 0.7 }}>
                      <Phone size={10} />
                      <span className="text-xs">{member.mobile}</span>
                    </div>
                    {/* WhatsApp invite — show for all members who have mobile */}
                    <a
                      href={whatsappInvite(member)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#E8F5E9", color: "#2E7D32" }}
                      onClick={e => e.stopPropagation()}
                    >
                      <span>📲</span> Invite
                    </a>
                  </div>
                )}

                {/* Education details for students */}
                {member.isStudent && (member.collegeName || member.degree) && (
                  <p className="text-xs mt-0.5" style={{ color: "#9B6060", opacity: 0.8 }}>
                    {[member.degree, member.collegeName].filter(Boolean).join(" · ")}
                  </p>
                )}

                {/* DOB / age if available */}
                {member.dob && (
                  <p className="text-xs mt-0.5" style={{ color: "#9B6060", opacity: 0.7 }}>
                    🎂 {member.dob}
                  </p>
                )}
              </div>

              {/* Edit button */}
              <button
                onClick={() => setEditingMember(member)}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "#FDE8EC", color: "#7B1C2E" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── EDIT MODAL ── */}
      <EditMemberModal
        open={!!editingMember}
        mode="edit"
        member={editingMember}
        familyId={familyId}
        onClose={async (updated, updatedMember) => {
          setEditingMember(null);
          if (updated && updatedMember) {
            await patchCache(fam => ({
              ...fam,
              members: fam.members.map(m =>
                m.id === updatedMember.id ? { ...m, ...updatedMember } : m
              ),
            }));
          }
        }}
      />

      {/* ── ADD MODAL ── */}
      <EditMemberModal
        open={showAddModal}
        mode="add"
        familyId={familyId}
        onClose={async (saved, newMember) => {
          setShowAddModal(false);
          if (saved && newMember) {
            await patchCache(fam => ({
              ...fam,
              members: [...fam.members, newMember],
            }));
          }
        }}
      />

      {/* ── FAB ── */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 text-white rounded-full shadow-xl flex items-center justify-center z-40 active:scale-95 transition-transform"
        style={{ background: "#7B1C2E", boxShadow: "0 4px 16px rgba(90,16,32,0.4)" }}
        title="Add member"
      >
        <Plus size={26} />
      </button>

      {/* ── Pulse animation for empty inline fields ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>

    </div>
  );
}