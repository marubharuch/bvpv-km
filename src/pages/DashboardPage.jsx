import { useContext, useEffect, useState, useCallback, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { updateFamily } from "../services/familyService";
import { getFamilyWithMembers } from "../services/familyService";
import { getUserData } from "../services/userService";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import EditMemberModal from "../components/modals/EditMemberModal";
import ImageUploadBox from "../components/ImageUploadBox";
import { Plus, RefreshCw, ChevronRight, Phone, MapPin, Pencil } from "lucide-react";
import { loadCache, saveCache, invalidateCache } from "../utils/cache";

function toProperCase(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function InlineField({ icon, value, placeholder, onSave, uppercase = false, pulseDuration = "1.8s", pulseDelay = "0s" }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value || "");
  const inputRef              = useRef(null);
  const isEmpty               = !value;

  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 100); }, [editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) { setEditing(false); return; }
    onSave(uppercase ? trimmed.toUpperCase() : toProperCase(trimmed));
    setEditing(false);
  };
  const handleCancel = () => { setDraft(value || ""); setEditing(false); };

  return (
    <>
      <button onClick={() => { setDraft(value || ""); setEditing(true); }}
        className="flex items-center gap-1 text-left group">
        {icon}
        {isEmpty
          ? <span className="text-xs" style={{ color:"rgba(255,220,100,0.85)", animation:`pulse ${pulseDuration} ease-in-out infinite`, animationDelay:pulseDelay }}>{placeholder}</span>
          : <span className="text-xs font-medium" style={{ color:"rgba(240,208,128,0.9)" }}>{value}</span>
        }
        <Pencil size={9} className="ml-0.5 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" color="#F0D080" />
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background:"rgba(0,0,0,0.45)" }} onClick={handleCancel}>
          <div className="rounded-t-2xl p-5 w-full" style={{ background:"#FDF6EC", paddingBottom:"96px" }} onClick={e=>e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background:"#C9A84C" }} />
            <p className="text-sm font-semibold mb-3" style={{ color:"#5A1020" }}>{placeholder}</p>
            <input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter")handleSave(); if(e.key==="Escape")handleCancel(); }}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background:"#fff", border:"2px solid #C9A84C", color:"#5A1020", fontSize:16 }}
              placeholder={placeholder} />
            <div className="flex gap-3 mt-4">
              <button onClick={handleCancel} className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background:"rgba(90,16,32,0.08)", color:"#7B1C2E" }}>Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background:"#7B1C2E" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function calcCompletion(family, members) {
  const head = members.find(m => m.isHead) || members[0];
  const checks = [
    !!family.city, !!family.native, !!family.address,
    members.length > 1, !!head?.mobile, !!head?.gender, !!head?.dob,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function DashboardPage() {
  const { user }   = useContext(AuthContext);
  const navigate   = useNavigate();

  const [family,        setFamily]        = useState(null);
  const [familyId,      setFamilyId]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [editingMember, setEditingMember] = useState(null);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [activeTab,     setActiveTab]     = useState("all");

  const loadFamily = useCallback(async (forceRefresh = false) => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const CACHE_KEY = `family_${user.uid}`;

    if (!forceRefresh) {
      const cached = await loadCache(CACHE_KEY);
      if (cached) { setFamily(cached.family); setFamilyId(cached.familyId); setLoading(false); return; }
    }

    // Get familyId
    const userData = await getUserData(user.uid, user.email);
    const famId    = userData?.familyId;
    if (!famId) { setLoading(false); return; }

    const familyResult = await getFamilyWithMembers(famId);
    if (!familyResult) { setLoading(false); return; }

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

  const saveFamilyField = async (field, value) => {
    await updateFamily(familyId, { [field]: value });
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
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-3"
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

  const members         = family?.members || [];
  const head            = members.find(m => m.isHead) || members[0];
  const students        = members.filter(m => m.isStudent);
  const contacts        = members.filter(m => !m.isStudent);
  const filteredMembers = activeTab === "students" ? students : activeTab === "contacts" ? contacts : members;
  const completion      = calcCompletion(family, members);

  const whatsappInvite = (member) => {
    const text = encodeURIComponent(
      `Hello ${member.name?.split(" ")[0] || ""}! 🙏\nJoin our Family App.\nLink: ${window.location.origin}/join?familyId=${familyId}\nPIN: ${family.familyPin}`
    );
    return `https://wa.me/${member.mobile?.replace(/\D/g, "")}?text=${text}`;
  };

  const memberDetail = (m) => {
    const parts = [];
    if (m.isStudent) parts.push(m.education || m.educationType || "Student");
    else if (m.occupation) parts.push(m.occupation);
    if (m.married === true) parts.push("Married");
    if (m.stayCity && m.stayAway) parts.push(`📍 ${m.stayCity}`);
    return parts.join(" · ") || "Member";
  };

  return (
    <div className="max-w-md mx-auto pb-24 min-h-screen" style={{ background: "#FDF6EC" }}>

      {/* Hero */}
      <div className="px-4 pt-3 pb-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #5A1020 0%, #7B1C2E 50%, #9B2335 100%)" }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "#C9A84C" }} />

        <div className="flex items-center justify-between relative mb-2">
          <h1 className="text-lg font-bold leading-tight truncate flex-1 min-w-0" style={{ color: "#F0D080" }}>
            {toProperCase(head?.name) || "My Family"}
          </h1>
          <button onClick={() => loadFamily(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ml-2"
            style={{ background: "rgba(201,168,76,0.25)" }}>
            <RefreshCw size={13} color="#F0D080" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap relative mb-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: "#C9A84C", color: "#5A1020" }}>{family.familyPin}</span>
          <span style={{ color: "rgba(240,208,128,0.2)", fontSize: 12 }}>|</span>
          <InlineField icon={<MapPin size={10} color="rgba(240,208,128,0.55)" />} value={family.city}
            placeholder="City" onSave={v => saveFamilyField("city", v.toUpperCase())} uppercase pulseDuration="1.6s" />
          <span style={{ color: "rgba(240,208,128,0.2)", fontSize: 12 }}>|</span>
          <InlineField icon={<span style={{ fontSize: 10 }}>🏡</span>} value={family.native}
            placeholder="Native" onSave={v => saveFamilyField("native", v.toUpperCase())} uppercase pulseDuration="2s" pulseDelay="0.4s" />
        </div>

        <div className="relative mb-3">
          <InlineField icon={<span style={{ fontSize: 10 }}>📬</span>} value={family.address}
            placeholder="Add address" onSave={v => saveFamilyField("address", toProperCase(v))} pulseDuration="2.5s" pulseDelay="0.6s" />
        </div>

        <div className="relative">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs" style={{ color: "rgba(240,208,128,0.65)" }}>Profile Completion</span>
            <span className="text-xs font-bold" style={{ color: "#F0D080" }}>{completion}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{
              width: `${completion}%`,
              background: completion === 100 ? "#C9A84C" : "linear-gradient(90deg, #C9A84C, #F0D080)",
            }} />
          </div>
        </div>
      </div>

      {/* Tab filter */}
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
                : { color: "#7B1C2E" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member cards */}
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
             <ImageUploadBox
  familyId={familyId}
  memberId={member.id}
  photoURL={member.photoURL}
  onPhotoUpdate={async (memberId, newUrl) => {
    await patchCache(fam => ({
      ...fam,
      members: fam.members.map(m =>
        m.id === memberId ? { ...m, photoURL: newUrl } : m
      ),
    }));
  }}
/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-sm" style={{ color: "#5A1020" }}>{toProperCase(member.name) || "—"}</p>
                  {member.isHead && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{ background: "#FDF0D0", color: "#7B5A00", border: "1px solid #C9A84C" }}>Head</span>
                  )}
                  {member.isStudent && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "#FDE8EC", color: "#7B1C2E" }}>Student</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#9B6060" }}>{memberDetail(member)}</p>
                {member.mobile && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1" style={{ color: "#9B2335", opacity: 0.7 }}>
                      <Phone size={10} /><span className="text-xs">{member.mobile}</span>
                    </div>
                    <a href={whatsappInvite(member)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#E8F5E9", color: "#2E7D32" }}
                      onClick={e => e.stopPropagation()}>
                      <span>📲</span> Invite
                    </a>
                  </div>
                )}
                {member.dob && <p className="text-xs mt-0.5" style={{ color: "#9B6060", opacity: 0.7 }}>🎂 {member.dob}</p>}
              </div>
              <button onClick={() => setEditingMember(member)}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "#FDE8EC", color: "#7B1C2E" }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <EditMemberModal open={!!editingMember} mode="edit" member={editingMember} familyId={familyId}
        onClose={async (updated, updatedMember) => {
          setEditingMember(null);
          if (updated && updatedMember) {
            await patchCache(fam => ({
              ...fam,
              members: fam.members.map(m => m.id === updatedMember.id ? { ...m, ...updatedMember } : m),
            }));
          }
        }} />
      <EditMemberModal open={showAddModal} mode="add" familyId={familyId}
        onClose={async (saved, newMember) => {
          setShowAddModal(false);
          if (saved && newMember)
            await patchCache(fam => ({ ...fam, members: [...fam.members, newMember] }));
        }} />

      {/* FAB */}
      <button onClick={() => setShowAddModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 text-white rounded-full shadow-xl flex items-center justify-center z-40 active:scale-95 transition-transform"
        style={{ background: "#7B1C2E", boxShadow: "0 4px 16px rgba(90,16,32,0.4)" }}>
        <Plus size={26} />
      </button>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </div>
  );
}
