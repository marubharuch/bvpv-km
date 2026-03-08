// pages/DashboardPage/index.jsx
// Improvements:
//  - useFamily hook replaces manual cache logic (cleaner, reusable)
//  - Skeleton loader instead of full-page spinner
//  - updateFamily now invalidates cache automatically (familyDb.js)
//  - InlineField, calcCompletion, memberSubtitle extracted below for readability

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate }         from "react-router-dom";
import { useAuth }             from "../../store/AuthContext";
import { useFamily }           from "../../hooks/useFamily";
import { updateFamily }        from "../../db/familyDb";
import { toProperCase }        from "../../lib/text";
import { COLORS }              from "../../constants/app";
import EditMemberModal         from "../../components/member/EditMemberModal";
import PhotoUpload             from "../../components/member/PhotoUpload";
import OnboardingTour          from "../../components/layout/OnboardingTour";
import { DASHBOARD_TOUR_STEPS } from "../../constants/tourSteps";
import { Plus, RefreshCw, ChevronRight, Phone, MapPin, Pencil } from "lucide-react";

// ── Skeleton loader ───────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="max-w-md mx-auto pb-24 animate-pulse">
      <div className="h-36 rounded-b-2xl mb-4" style={{ background: "rgba(90,16,32,0.15)" }} />
      <div className="px-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-3 flex gap-3" style={{ opacity: 1 - i * 0.2 }}>
            <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-gray-200 rounded w-2/3" />
              <div className="h-2 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inline editable field ─────────────────────────────────────────
function InlineField({ icon, value, placeholder, onSave, uppercase = false }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value || "");
  const inputRef              = useRef(null);

  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 80); }, [editing]);

  const save = () => {
    const t = draft.trim();
    if (!t) { setEditing(false); return; }
    onSave(uppercase ? t.toUpperCase() : toProperCase(t));
    setEditing(false);
  };

  return (
    <>
      <button onClick={() => { setDraft(value || ""); setEditing(true); }}
        className="flex items-center gap-1 text-left group">
        {icon}
        {value
          ? <span className="text-xs font-medium" style={{ color: "rgba(240,208,128,0.9)" }}>{value}</span>
          : <span className="text-xs animate-pulse" style={{ color: "rgba(255,220,100,0.85)" }}>{placeholder}</span>}
        <Pencil size={9} className="ml-0.5 opacity-0 group-hover:opacity-50 transition-opacity" color="#F0D080" />
      </button>

      {editing && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setEditing(false)}>
          <div className="rounded-t-2xl p-5 w-full" style={{ background: COLORS.bg, paddingBottom: "96px" }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: COLORS.gold }} />
            <p className="text-sm font-semibold mb-3" style={{ color: COLORS.primaryDark }}>{placeholder}</p>
            <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "#fff", border: `2px solid ${COLORS.gold}`, color: COLORS.primaryDark, fontSize: 16 }}
              placeholder={placeholder} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(90,16,32,0.08)", color: COLORS.primary }}>Cancel</button>
              <button onClick={save} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: COLORS.primary }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function calcCompletion(family, members) {
  const head   = members.find(m => m.isHead) || members[0];
  const checks = [!!family.city, !!family.native, !!family.address, members.length > 1, !!head?.mobile, !!head?.gender, !!head?.dob];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function memberSubtitle(m) {
  const parts = [];
  if (m.isStudent) parts.push(m.education || m.educationType || "Student");
  else if (m.occupation) parts.push(m.occupation);
  if (m.maritalStatus === "Married") parts.push("Married");
  if (m.stayAway && m.stayCity) parts.push(`📍 ${m.stayCity}`);
  return parts.join(" · ") || "Member";
}

// ── Main component ────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  // useFamily hook — handles cache, loading, refresh automatically
  const { family, members, loading, refresh } = useFamily(user?.familyId);

  const [familyData,    setFamilyData]    = useState(null);
  const [memberList,    setMemberList]    = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [activeTab,     setActiveTab]     = useState("all");
  const [dashTour,      setDashTour]      = useState(false);

  // Sync hook data into local state for optimistic updates
  useEffect(() => {
    if (family)  setFamilyData(family);
    if (members) setMemberList(members);
  }, [family, members]);

  // Dashboard tour
  useEffect(() => {
    const navDone  = localStorage.getItem("appTourDone");
    const dashDone = localStorage.getItem("dashTourDone");
    if (navDone && !dashDone) {
      const t = setTimeout(() => setDashTour(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const handleDashTourFinish = () => {
    localStorage.setItem("dashTourDone", "true");
    setDashTour(false);
  };

  // Optimistic update helper — updates local state immediately
  const patchMember = useCallback((id, data) => {
    setMemberList(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  }, []);

  const saveField = async (field, value) => {
    setFamilyData(prev => ({ ...prev, [field]: value })); // optimistic
    await updateFamily(user?.familyId, { [field]: value }); // cache invalidated inside
  };

  if (loading && !familyData) return <DashboardSkeleton />;

  if (!familyData) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: COLORS.bg }}>
      <div className="text-center space-y-4">
        <div className="text-5xl">👨‍👩‍👧</div>
        <p style={{ color: COLORS.primaryDark }}>No family found.</p>
        <button onClick={() => navigate("/registration")}
          className="px-5 py-2 rounded-lg text-white font-semibold" style={{ background: COLORS.primary }}>
          Register Family
        </button>
      </div>
    </div>
  );

  const head     = memberList.find(m => m.isHead) || memberList[0];
  const students = memberList.filter(m => m.isStudent);
  const others   = memberList.filter(m => !m.isStudent);
  const filtered = activeTab === "students" ? students : activeTab === "others" ? others : memberList;
  const pct      = calcCompletion(familyData, memberList);

  const waInvite = m => {
    const text = encodeURIComponent(`Hello ${m.name?.split(" ")[0] || ""}! 🙏\nJoin our Family App.\nLink: ${window.location.origin}/join?familyId=${user?.familyId}\nPIN: ${familyData.familyPin}`);
    return `https://wa.me/${(m.mobile || "").replace(/\D/g, "")}?text=${text}`;
  };

  return (
    <div className="max-w-md mx-auto pb-24 min-h-screen" style={{ background: COLORS.bg }}>

      {/* Hero header */}
      <div id="tour-profile-section" className="px-4 pt-3 pb-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#5A1020,#7B1C2E,#9B2335)" }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: COLORS.gold }} />

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold truncate flex-1 min-w-0" style={{ color: COLORS.goldLight }}>
            {toProperCase(head?.name) || "My Family"}
          </h1>
          <button onClick={refresh}
            className="w-7 h-7 rounded-full flex items-center justify-center ml-2"
            style={{ background: "rgba(201,168,76,0.25)" }}>
            <RefreshCw size={13} color={COLORS.goldLight} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: COLORS.gold, color: COLORS.primaryDark }}>{familyData.familyPin}</span>
          <span style={{ color: "rgba(240,208,128,0.2)", fontSize: 12 }}>|</span>
          <InlineField icon={<MapPin size={10} color="rgba(240,208,128,0.55)" />}
            value={familyData.city} placeholder="City" onSave={v => saveField("city", v)} uppercase />
          <span style={{ color: "rgba(240,208,128,0.2)", fontSize: 12 }}>|</span>
          <InlineField icon={<span style={{ fontSize: 10 }}>🏡</span>}
            value={familyData.native} placeholder="Native" onSave={v => saveField("native", v)} uppercase />
        </div>

        <div className="mb-3">
          <InlineField icon={<span style={{ fontSize: 10 }}>📬</span>}
            value={familyData.address} placeholder="Add address" onSave={v => saveField("address", v)} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs" style={{ color: "rgba(240,208,128,0.65)" }}>Profile Completion</span>
            <span className="text-xs font-bold" style={{ color: COLORS.goldLight }}>{pct}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct === 100 ? COLORS.gold : "linear-gradient(90deg,#C9A84C,#F0D080)" }} />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 mt-4">
        <div className="rounded-xl p-1 flex" style={{ background: "rgba(90,16,32,0.08)" }}>
          {[
            { key: "all",      label: `All (${memberList.length})` },
            { key: "students", label: `Students (${students.length})` },
            { key: "others",   label: `Others (${others.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
              style={activeTab === tab.key
                ? { background: COLORS.primary, color: COLORS.goldLight, boxShadow: "0 1px 4px rgba(90,16,32,0.3)" }
                : { color: COLORS.primary }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member cards */}
      <div id="tour-member-list" className="px-4 mt-3 space-y-2">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl p-6 text-center text-sm" style={{ color: COLORS.primaryLight }}>
            No members in this category
          </div>
        )}
        {filtered.map((member, index) => (
          <div key={member.id} className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: "0 2px 10px rgba(90,16,32,0.08)" }}>
            <div className="flex items-start gap-3 p-3">
              <div id={index === 0 ? "tour-member-photo" : undefined}>
                <PhotoUpload
                  memberId={member.id}
                  photoURL={member.photoURL}
                  honoraryOrgs={member.honoraryOrgs || []}
                  onUpdate={(id, url) => patchMember(id, { photoURL: url })}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-sm" style={{ color: COLORS.primaryDark }}>
                    {toProperCase(member.name) || "—"}
                  </p>
                  {member.isHead && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{ background: COLORS.goldFaint, color: "#7B5A00", border: `1px solid ${COLORS.gold}` }}>Head</span>
                  )}
                  {member.isStudent && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "#FDE8EC", color: COLORS.primary }}>Student</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: COLORS.textSecondary }}>{memberSubtitle(member)}</p>
                {member.mobile && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1" style={{ color: COLORS.primaryLight, opacity: 0.7 }}>
                      <Phone size={10} />
                      <span className="text-xs">{member.mobile}</span>
                    </div>
                    <a href={waInvite(member)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "#E8F5E9", color: "#2E7D32" }}
                      onClick={e => e.stopPropagation()}>
                      <span>📲</span> Invite
                    </a>
                  </div>
                )}
                {member.dob && (
                  <p className="text-xs mt-0.5" style={{ color: COLORS.textSecondary, opacity: 0.7 }}>🎂 {member.dob}</p>
                )}
              </div>
              <button id={index === 0 ? "tour-edit-member" : undefined} onClick={() => setEditingMember(member)}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "#FDE8EC", color: COLORS.primary }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit modal */}
      <EditMemberModal open={!!editingMember} mode="edit" member={editingMember} familyId={user?.familyId}
        onClose={(saved, updated) => {
          setEditingMember(null);
          if (saved && updated) patchMember(updated.id, updated);
        }} />

      {/* Add modal */}
      <EditMemberModal open={showAdd} mode="add" familyId={user?.familyId}
        onClose={(saved, newMember) => {
          setShowAdd(false);
          if (saved && newMember) setMemberList(prev => [...prev, newMember]);
        }} />

      {/* FAB */}
      <button id="tour-add-member" onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 text-white rounded-full shadow-xl flex items-center justify-center z-40 active:scale-95 transition-transform"
        style={{ background: COLORS.primary, boxShadow: "0 4px 16px rgba(90,16,32,0.4)" }}>
        <Plus size={26} />
      </button>

      {dashTour && (
        <OnboardingTour steps={DASHBOARD_TOUR_STEPS} onFinish={handleDashTourFinish} />
      )}
    </div>
  );
}
