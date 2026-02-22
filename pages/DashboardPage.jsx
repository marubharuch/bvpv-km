import { useContext, useEffect, useState, useCallback } from "react";
import { signOut } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import EditMemberModal from "../components/modals/EditMemberModal";
import ImageUploadBox from "../components/ImageUploadBox";
import { Users, GraduationCap, Briefcase, Plus, RefreshCw, LogOut, ChevronRight, Phone, MapPin } from "lucide-react";
import { loadCache, saveCache, invalidateCache } from "../utils/cache"; // ✅ import cache utils

export default function FamilyDashboardPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const loadFamily = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const CACHE_KEY = `family_${user.uid}`;

    // ✅ Try cache first
    if (!forceRefresh) {
      const cached = await loadCache(CACHE_KEY);
      if (cached) {
        setFamily(cached.family);
        setFamilyId(cached.familyId);
        setLoading(false);
        return; // ← zero Firebase reads
      }
    }

    // 1️⃣ Get user's familyId (UID first)
    let famId = null;

    const uidSnap = await get(ref(db, `users/${user.uid}`));
    if (uidSnap.exists()) {
      famId = uidSnap.val()?.familyId;
    }

    // 🟡 FALLBACK — old users stored by emailKey
    if (!famId && user?.email) {
      const emailKey = user.email
        .toLowerCase()
        .replace(/\./g, ",")
        .replace(/@/g, "_");

      const emailSnap = await get(ref(db, `users/${emailKey}`));

      if (emailSnap.exists()) {
        const oldData = emailSnap.val();
        famId = oldData.familyId;

        // Auto-migrate to UID-based key
        await set(ref(db, `users/${user.uid}`), {
          ...oldData,
          email: user.email
        });
      }
    }

    if (!famId) {
      setLoading(false);
      return;
    }

    // 2️⃣ Get family info
    const famSnap = await get(ref(db, `families/${famId}`));
    const famData = famSnap.val();

    if (!famData) {
      setLoading(false);
      return;
    }

    // 3️⃣ Get member IDs from family
    const memberIds = Object.keys(famData.members || {});

    // 4️⃣ Fetch all members in parallel ✅ (faster than sequential for loop)
    const snapshots = await Promise.all(
      memberIds.map(id => get(ref(db, `members/${id}`)))
    );
    const membersData = snapshots
      .filter(s => s.exists())
      .map(s => ({ id: s.key, ...s.val() }));

    const familyResult = { ...famData, members: membersData };

    // ✅ Save to cache
    await saveCache(CACHE_KEY, { family: familyResult, familyId: famId });

    setFamilyId(famId);
    setFamily(familyResult);
    setLoading(false);

  }, [user]);

  useEffect(() => { loadFamily(); }, [loadFamily]);

  const members = family?.members || [];
  const head = members.find(m => m.isHead) || members[0];
  const students = members.filter(m => m.isStudent);
  const contacts = members.filter(m => !m.isStudent);

  const filteredMembers =
    activeTab === "students" ? students :
    activeTab === "contacts" ? contacts :
    members;

  // ✅ Clear cache on logout
  const logout = async () => {
    await invalidateCache(`family_${user.uid}`);
    await signOut(auth);
    navigate("/");
  };

  // ── LOADING ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your family...</p>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">👨‍👩‍👧</div>
          <p className="text-gray-600 mb-4">No family found.</p>
          <button onClick={() => navigate("/registration")} className="bg-blue-600 text-white px-5 py-2 rounded-lg">
            Register Family
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-24 bg-gray-50 min-h-screen">

      {/* ── HERO BANNER ── */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white px-5 pt-5 pb-8 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white opacity-5" />
        <div className="absolute -bottom-10 -left-4 w-40 h-40 rounded-full bg-white opacity-5" />

        {/* Top bar — ✅ forceRefresh on button click */}
        <div className="flex justify-between items-center mb-5 relative">
          <button onClick={() => loadFamily(true)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <RefreshCw size={14} />
          </button>
          <button onClick={logout} className="flex items-center gap-1 text-xs bg-white/20 px-3 py-1.5 rounded-full">
            <LogOut size={12} /> Logout
          </button>
        </div>

        {/* Family identity */}
        <div className="flex items-center gap-4 relative">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl flex-shrink-0">
            👨‍👩‍👧
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight">
              {head?.name?.split(" ").slice(-1)[0] || "My"} Family
            </h1>
            <div className="flex items-center gap-1 text-blue-100 text-xs mt-1">
              <MapPin size={11} />
              <span>{family.city || "—"}</span>
              {family.native && <span>· Native: {family.native}</span>}
            </div>
            <div className="mt-1.5">
              <span className="bg-white/25 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                PIN: {family.familyPin}
              </span>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-2 mt-5 relative">
          {[
            { icon: <Users size={16} />, label: "Members", count: members.length, color: "bg-white/20" },
            { icon: <GraduationCap size={16} />, label: "Students", count: students.length, color: "bg-green-500/30" },
            { icon: <Briefcase size={16} />, label: "Working", count: contacts.filter(m => m.occupation && m.occupation !== "Homemaker").length, color: "bg-purple-500/30" },
          ].map((s, i) => (
            <div key={i} className={`${s.color} rounded-xl p-3 text-center`}>
              <div className="flex justify-center mb-1 opacity-80">{s.icon}</div>
              <div className="text-2xl font-bold leading-none">{s.count}</div>
              <div className="text-xs opacity-75 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MEMBER AVATAR STRIP ── */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Family Members</h3>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => setEditingMember(m)}
                className="flex flex-col items-center flex-shrink-0 gap-1"
              >
                <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${m.isHead ? "border-blue-500" : m.isStudent ? "border-green-400" : "border-gray-200"} bg-gray-100 flex items-center justify-center`}>
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-gray-400">
                      {(m.name || "?")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600 max-w-[56px] truncate text-center leading-tight">
                  {m.name?.split(" ")[0] || "—"}
                </span>
                {m.isHead && <span className="text-xs text-blue-500 -mt-1">Head</span>}
              </button>
            ))}

            <button
              onClick={() => navigate("/registration")}
              className="flex flex-col items-center flex-shrink-0 gap-1"
            >
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                <Plus size={22} />
              </div>
              <span className="text-xs text-gray-400">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB FILTER ── */}
      <div className="px-4 mt-4">
        <div className="bg-gray-200 rounded-xl p-1 flex">
          {[
            { key: "all", label: `All (${members.length})` },
            { key: "students", label: `Students (${students.length})` },
            { key: "contacts", label: `Others (${contacts.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.key
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MEMBER CARDS ── */}
      <div className="px-4 mt-3 space-y-2">
        {filteredMembers.length === 0 && (
          <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">
            No members in this category
          </div>
        )}

        {filteredMembers.map(member => (
          <div key={member.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <ImageUploadBox
                familyId={familyId}
                memberId={member.id}
                photoUrl={member.photoUrl}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 truncate">{member.name || "—"}</p>
                  {member.isHead && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">Head</span>
                  )}
                  {member.isStudent && (
                    <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full flex-shrink-0">Student</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                  {member.mobile && (
                    <>
                      <Phone size={10} />
                      <span>{member.mobile}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {member.isStudent
                    ? member.education || member.educationType || "Student"
                    : member.occupation || member.relation || "Member"}
                </p>
              </div>
              <button
                onClick={() => setEditingMember(member)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="px-4 mt-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate("/registration")}
            className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <GraduationCap size={20} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">Add Student Info</span>
          </button>

          <button
            onClick={() => {
              const msg = `Join our family app.\nLink: ${window.location.origin}/join?familyId=${familyId}\nPIN: ${family.familyPin}`;
              navigator.clipboard.writeText(msg);
              alert("Invite copied!");
            }}
            className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">
              📲
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">Invite Member</span>
          </button>
        </div>
      </div>

      {/* ── FAMILY INFO CARD ── */}
      <div className="px-4 mt-3">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Family Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">City</span>
              <span className="font-medium text-gray-800">{family.city || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Native</span>
              <span className="font-medium text-gray-800">{family.native || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Address</span>
              <span className="font-medium text-gray-800 text-right max-w-[60%]">{family.address || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Family PIN</span>
              <span className="font-bold text-blue-600">{family.familyPin}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── EDIT MODAL ── ✅ invalidate cache after edit */}
      <EditMemberModal
        open={!!editingMember}
        member={editingMember}
        familyId={familyId}
      onClose={async (updated, updatedMember) => {
  setEditingMember(null);
  if (updated && updatedMember) {
    // ✅ Patch cache locally — zero Firebase read
    const CACHE_KEY = `family_${user.uid}`;
    const cached = await loadCache(CACHE_KEY);
    if (cached) {
      const updatedMembers = cached.family.members.map(m =>
        m.id === updatedMember.id ? { ...m, ...updatedMember } : m
      );
      const updatedFamily = { ...cached.family, members: updatedMembers };
      await saveCache(CACHE_KEY, { family: updatedFamily, familyId: cached.familyId });
      setFamily(updatedFamily); // ✅ UI updates instantly
    }
  }
  // ✅ if cancelled (updated=false) — do nothing
}}
        
      />

      {/* ── FAB ── */}
      <button
        onClick={() => navigate("/registration")}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center z-40 active:scale-95 transition-transform"
        title="Add member"
      >
        <Plus size={26} />
      </button>

    </div>
  );
}