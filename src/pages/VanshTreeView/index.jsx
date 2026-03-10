// pages/VanshTreeView/index.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Multi-view family tree viewer. Loads from families/{familyId} via useTreeData.
// Views: Explorer | Vertical | OrgChart | Living | Table | Cards | Lineage
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate }       from "react-router-dom";
import { useAuth }           from "../../store/AuthContext";
import { useTreeData }       from "../../hooks/useTreeData";
import { getUserFamilyPointer } from "../../db/familyTreeDb";
import { migrateIfNeeded }   from "../../utils/migration";
import {
  buildVscTree, buildLineageRows,
  membersArray, computeStats, computeLineageStats, getAncestorChain, getChildren,
} from "../../utils/treeGraph";
import VscRow            from "../../components/vansh/VscRow";
import { VSC }           from "../../constants/vanshConstants";
import SyncBadge         from "./components/SyncBadge";
import LineageView        from "./components/LineageView";
import ReviewSaveSheet    from "./components/ReviewSaveSheet";

const C = {
  bg:"#FDF6EC", primary:"#7B1C2E", primaryDark:"#5A1020", primaryLight:"#9B2335",
  gold:"#C9A84C", goldLight:"#F0D080", goldFaint:"#FDF0D0", border:"#f0e6e6",
  textPrimary:"#3D0010", textSecondary:"#9B6060", textMuted:"#C0A0A0",
  error:"#ef4444", white:"#FFFFFF", green:"#2E7D32",
};
const mono  = "'JetBrains Mono', monospace";
const serif = "'Playfair Display', serif";

const VIEWS = [
  { id:"explorer", icon:"📁", label:"Explorer" },
  { id:"vertical", icon:"⬆️", label:"Vertical" },
  { id:"org",      icon:"↔️", label:"Org Chart" },
  { id:"living",   icon:"💚", label:"Living"   },
  { id:"table",    icon:"📋", label:"Table"    },
  { id:"cards",    icon:"🃏", label:"Cards"    },
  { id:"lineage",  icon:"📜", label:"Lineage"  },
];

const BRANCH_FILTERS = [
  { id:"all",         label:"All Branches",    icon:"🌳" },
  { id:"ancestors",   label:"Ancestors Only",  icon:"⬆️" },
  { id:"descendants", label:"Descendants",     icon:"⬇️" },
  { id:"spouses",     label:"With Spouses",    icon:"💑" },
  { id:"siblings",    label:"With Siblings",   icon:"👥" },
  { id:"rip",         label:"Deceased Only",   icon:"🪔" },
  { id:"male",        label:"Male Line",       icon:"👨" },
  { id:"female",      label:"Female Line",     icon:"👩" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function VanshTreeView() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [familyId,  setFamilyId]  = useState(null);
  const [selfId,    setSelfId]    = useState(null);
  const [booting,   setBooting]   = useState(true);

  // Resolve familyId on mount (with migration if needed)
  useEffect(() => {
    if (!user?.uid) { setBooting(false); return; }
    migrateIfNeeded(user.uid)
      .then(pointer => {
        if (pointer?.familyId) {
          setFamilyId(pointer.familyId);
          setSelfId(pointer.memberId);
        }
        setBooting(false);
      })
      .catch(e => { console.error(e); setBooting(false); });
  }, [user?.uid]);

  const {
    members, treeDoc, status, isLoading, isSyncing, isOnline,
    syncError, syncNow, pendingChanges, clearPendingChanges,
    editTreeMember, addTreeMember,
  } = useTreeData(familyId, user?.uid);

  const [view,         setView]         = useState("explorer");
  const [branchFilter, setBranchFilter] = useState("all");
  const [expanded,     setExpanded]     = useState(new Set());
  const [selId,        setSelId]        = useState(null);
  const [showPanel,    setShowPanel]    = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showReview,   setShowReview]   = useState(false);
  const [tableSearch,  setTableSearch]  = useState("");
  const [tableSortGen, setTableSortGen] = useState(true);

  // Expand root on load
  useEffect(() => {
    if (selfId) setExpanded(new Set([selfId]));
  }, [selfId]);

  const toggle = useCallback(id => setExpanded(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  }), []);

  const select = useCallback((id) => { setSelId(id); setShowPanel(true); }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const allMembers   = useMemo(() => membersArray(members), [members]);
  const stats        = useMemo(() => computeStats(members), [members]);
  const lineageStats = useMemo(() => computeLineageStats(members, selfId), [members, selfId]);
  const livingMembers= useMemo(() => allMembers.filter(m => !m.rip), [allMembers]);

  const root = useMemo(() => selfId ? buildVscTree(members, selfId) : null, [members, selfId]);

  const ancestors = useMemo(() =>
    selfId ? getAncestorChain(members, selfId) : [], [members, selfId]);

  const tableRows = useMemo(() => {
    if (!selfId) return [];

    // ── Step 1: BFS to assign a generation number to every reachable member ──
    // gen = 0 for self, -1 for father, -2 for grandfather, +1 for child, etc.
    // We walk: parent links (fatherId/motherId) going UP, children going DOWN,
    // and spouseId sideways (same gen as partner).
    // Siblings share the same gen as the person whose parents they share.

    const genMap  = {};   // id → gen number
    const roleMap = {};   // id → human-readable role
    const queue   = [{ id: selfId, gen: 0 }];
    const visited = new Set();

    genMap[selfId]  = 0;
    roleMap[selfId] = "Self";
    visited.add(selfId);

    while (queue.length > 0) {
      const { id, gen } = queue.shift();
      const m = members[id];
      if (!m) continue;

      // Father → gen - 1
      if (m.fatherId && !visited.has(m.fatherId) && members[m.fatherId]) {
        visited.add(m.fatherId);
        genMap[m.fatherId]  = gen - 1;
        roleMap[m.fatherId] = roleMap[m.fatherId] || "Ancestor";
        queue.push({ id: m.fatherId, gen: gen - 1 });
      }
      // Mother → gen - 1 (same generation as father)
      if (m.motherId && !visited.has(m.motherId) && members[m.motherId]) {
        visited.add(m.motherId);
        genMap[m.motherId]  = gen - 1;
        roleMap[m.motherId] = roleMap[m.motherId] || (gen - 1 < 0 ? "Ancestor" : "Parent");
        queue.push({ id: m.motherId, gen: gen - 1 });
      }
      // Spouse → same gen (sideways)
      if (m.spouseId && !visited.has(m.spouseId) && members[m.spouseId]) {
        visited.add(m.spouseId);
        genMap[m.spouseId]  = gen;
        roleMap[m.spouseId] = `Spouse of ${m.name}`;
        queue.push({ id: m.spouseId, gen });
      }
      // Children → gen + 1
      Object.entries(members).forEach(([cid, cm]) => {
        if (visited.has(cid)) return;
        if (cm.fatherId === id || cm.motherId === id) {
          visited.add(cid);
          genMap[cid]  = gen + 1;
          roleMap[cid] = gen + 1 === 1 ? "Child"
            : gen + 1 === 2 ? "Grandchild"
            : `G+${gen + 1}`;
          queue.push({ id: cid, gen: gen + 1 });
        }
      });
    }

    // ── Step 2: Siblings — share same gen as the person whose parents they share ─
    Object.entries(members).forEach(([id, m]) => {
      if (visited.has(id)) return; // already assigned
      // Find any already-assigned member that shares a parent
      const sharedParent = Object.entries(members).find(([pid]) => {
        if (!genMap.hasOwnProperty(pid)) return false;
        const pm = members[pid];
        return (m.fatherId && m.fatherId === pm.fatherId) ||
               (m.motherId && m.motherId === pm.motherId);
      });
      if (sharedParent) {
        const [sibId] = sharedParent;
        const sibGen  = genMap[sibId];
        genMap[id]    = sibGen;
        roleMap[id]   = `Sibling of ${members[sibId]?.name || sibId}`;
        visited.add(id);
        // Also assign their spouse
        if (m.spouseId && !visited.has(m.spouseId) && members[m.spouseId]) {
          genMap[m.spouseId]  = sibGen;
          roleMap[m.spouseId] = `Spouse of ${m.name}`;
          visited.add(m.spouseId);
        }
      }
    });

    // ── Step 3: Build rows for ALL members ────────────────────────────────────
    const rows = Object.entries(members).map(([id, m]) => {
      const gen  = genMap.hasOwnProperty(id) ? genMap[id] : 99;
      const role = roleMap[id] || (m.relation ? m.relation : "Unlinked");
      const genLabel = id === selfId    ? "YOU"
        : gen === 99                    ? (m.relation || "—")
        : gen === 0 && id !== selfId    ? "G 0"
        : gen > 0                       ? `G+${gen}`
        : `G${gen}`; // e.g. G-1, G-2, G-3
      return { ...m, id, gen, genLabel, role };
    });

    const q = tableSearch.toLowerCase();
    const filtered = q ? rows.filter(r => r.name?.toLowerCase().includes(q)) : rows;
    return tableSortGen
      ? filtered.sort((a,b) => a.gen - b.gen || (a.name||"").localeCompare(b.name||""))
      : filtered.sort((a,b) => (a.name||"").localeCompare(b.name||""));
  }, [members, selfId, tableSearch, tableSortGen]);

  // ── Loading / error / empty states ───────────────────────────────────────
  if (booting || isLoading) return (
    <Center>
      <Spinner />
      <p style={{ fontSize:"0.82rem", color:C.primary, fontFamily:mono, marginTop:12 }}>Tree લોડ થઈ રહ્યું છે...</p>
      <Styles />
    </Center>
  );

  if (!familyId || !selfId) return (
    <Center>
      <div style={{ width:80, height:80, borderRadius:"50%", background:C.goldFaint, border:`2px dashed ${C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.5rem" }}>🌱</div>
      <h2 style={{ fontFamily:serif, fontSize:"1.4rem", color:C.primaryDark, margin:"16px 0 8px" }}>Tree બનાવ્યું નથી</h2>
      <p style={{ fontSize:"0.82rem", color:C.textSecondary, maxWidth:280, textAlign:"center", margin:"0 0 20px" }}>Wizard ખોલો અને family members ઉમેરો.</p>
      <Btn onClick={()=>navigate("/vansh")}>🌳 Tree બનાવો</Btn>
      <Styles />
    </Center>
  );

  const selfMember = members[selfId] || {};
  const updatedAt  = treeDoc?.updatedAt
    ? new Date(treeDoc.updatedAt).toLocaleDateString("gu-IN", { day:"2-digit", month:"long", year:"numeric" })
    : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100dvh", overflow:"hidden", background:C.bg, fontFamily:mono }}>
      <Styles />

      {/* ── Title bar ────────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 14px", height:36, background:C.primaryDark, borderBottom:`1px solid rgba(201,168,76,0.3)`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>🌳</span>
          <span style={{ fontSize:"0.7rem", color:C.goldLight, letterSpacing:"0.06em" }}>
            {treeDoc?.treeName || selfMember.name + "'s Family Tree"}
          </span>
          {treeDoc?.pin && (
            <span style={{ fontSize:"0.55rem", color:"rgba(240,208,128,0.45)", fontFamily:mono }}>
              PIN: {treeDoc.pin}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {pendingChanges.length > 0 ? (
            <button onClick={()=>setShowReview(true)} style={{
              display:"flex", alignItems:"center", gap:5, padding:"4px 12px",
              background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,
              color:"#fff", border:`1.5px solid ${C.gold}60`,
              borderRadius:20, fontSize:"0.62rem", fontWeight:700,
              cursor:"pointer", fontFamily:mono,
              animation:"reviewPulse 2s ease-in-out infinite",
              boxShadow:`0 2px 10px ${C.primary}50`,
            }}>
              <span style={{ fontSize:"0.8rem" }}>🔍</span>
              Review & Save
              <span style={{ background:C.gold, color:C.primaryDark, borderRadius:10, padding:"0 5px", fontSize:"0.55rem", fontWeight:900 }}>
                {pendingChanges.length}
              </span>
            </button>
          ) : (
            <SyncBadge meta={{ isDirty:false, lastSyncedAt:treeDoc?.updatedAt }} status={status} isOnline={isOnline} syncError={syncError} onSyncNow={syncNow} />
          )}
          {updatedAt && <span style={{ fontSize:"0.55rem", color:"rgba(240,208,128,0.5)" }}>Updated: {updatedAt}</span>}
          <button
            onClick={syncNow}
            disabled={isSyncing || isLoading}
            title="Refresh from Firestore"
            style={{
              padding:"4px 10px", background:"rgba(255,255,255,0.08)",
              border:"1px solid rgba(240,208,128,0.25)", borderRadius:5,
              fontSize:"0.85rem", cursor: isSyncing||isLoading ? "default":"pointer",
              opacity: isSyncing||isLoading ? 0.5 : 1,
              animation: isSyncing ? "spin 0.7s linear infinite" : "none",
              lineHeight:1, display:"flex", alignItems:"center",
            }}
          >🔄</button>
          <button onClick={()=>navigate("/vansh")} style={{ padding:"4px 12px", background:C.gold, color:C.primaryDark, border:"none", borderRadius:5, fontSize:"0.68rem", fontWeight:700, cursor:"pointer", fontFamily:mono }}>
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* ── View switcher ─────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", background:C.white, borderBottom:`1px solid ${C.border}`, overflowX:"auto", flexShrink:0, scrollbarWidth:"none" }}>
        {VIEWS.map(v=>(
          <button key={v.id} onClick={()=>{setView(v.id);setShowBranches(false);}}
            style={{ flexShrink:0, padding:"0 12px", height:36, display:"flex", alignItems:"center", gap:5, fontSize:"0.65rem", fontFamily:mono, border:"none", borderBottom:`2px solid ${view===v.id?C.primary:"transparent"}`, background:view===v.id?C.goldFaint:C.white, color:view===v.id?C.primary:C.textMuted, cursor:"pointer", fontWeight:view===v.id?700:400, transition:"all 0.15s" }}>
            <span>{v.icon}</span>
            <span className="view-label">{v.label}</span>
          </button>
        ))}
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", background:C.white, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        {(view === "lineage" ? [
          { n:lineageStats.total,       l:"Total"       },
          { n:lineageStats.ancestors,   l:"Ancestors"   },
          { n:lineageStats.children,    l:"Children"    },
          { n:lineageStats.generations, l:"Generations" },
          { n:lineageStats.spouses,     l:"Spouses"     },
          { n:lineageStats.siblings,    l:"Siblings"    },
        ] : [
          { n:stats.total,                              l:"Total"     },
          { n:ancestors.length,                         l:"Ancestors" },
          { n:getChildren(members,selfId||"").length,   l:"Children"  },
          { n:stats.males,                              l:"Male"      },
          { n:stats.females,                            l:"Female"    },
          { n:stats.living,                             l:"Living"    },
        ]).map((s,i)=>(
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 2px", borderRight:i<5?`1px solid ${C.border}`:"none" }}>
            <div style={{ fontFamily:serif, fontSize:"1rem", color:C.primary, fontWeight:700 }}>{s.n}</div>
            <div style={{ fontSize:"0.48rem", color:C.textMuted, letterSpacing:"0.07em", textTransform:"uppercase" }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* ── View note — explains count for Lineage ──────────────────────────── */}
      {view === "lineage" && stats.total > 0 && (
        <div style={{ background:"#FFFBF0", borderBottom:`1px solid ${C.border}`,
          padding:"4px 14px", fontSize:"0.58rem", color:C.textSecondary, fontFamily:mono,
          display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          <span>ℹ️</span>
          Lineage shows {stats.total} members total · spouses appear inside their partner's cell · tap any cell to edit
        </div>
      )}

      {/* ── Scrollable content ────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", WebkitOverflowScrolling:"touch" }}>

        {/* EXPLORER */}
        {view === "explorer" && root && (
          <>
            <div style={{ background:VSC.sidebar, borderBottom:`1px solid rgba(201,168,76,0.2)` }}>
              <div style={{ display:"flex", alignItems:"center", padding:"6px 14px", gap:8 }}>
                <span style={{ fontSize:"0.58rem", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>Branch:</span>
                <button onClick={()=>setShowBranches(p=>!p)} style={{ fontSize:"0.62rem", color:C.primary, background:C.goldFaint, border:`1px solid ${C.gold}40`, borderRadius:5, padding:"3px 10px", cursor:"pointer", fontFamily:mono }}>
                  {BRANCH_FILTERS.find(b=>b.id===branchFilter)?.icon} {BRANCH_FILTERS.find(b=>b.id===branchFilter)?.label} <span style={{ fontSize:"0.5rem" }}>{showBranches?"▲":"▼"}</span>
                </button>
                <button onClick={()=>setExpanded(new Set([selfId]))} style={{ marginLeft:"auto", fontSize:"0.58rem", color:C.textMuted, background:"none", border:`1px solid ${C.border}`, borderRadius:4, padding:"2px 8px", cursor:"pointer", fontFamily:mono }}>⊟ collapse</button>
                <button onClick={()=>{ const all=new Set(); const addAll=n=>{if(!n)return;all.add(n.id);(n.children||[]).forEach(addAll);}; addAll(root); setExpanded(all); }} style={{ fontSize:"0.58rem", color:C.textMuted, background:"none", border:`1px solid ${C.border}`, borderRadius:4, padding:"2px 8px", cursor:"pointer", fontFamily:mono }}>⊞ expand</button>
              </div>
              {showBranches && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"8px 14px 10px", borderTop:`1px solid rgba(201,168,76,0.15)` }}>
                  {BRANCH_FILTERS.map(b=>(
                    <button key={b.id} onClick={()=>{setBranchFilter(b.id);setShowBranches(false);}}
                      style={{ fontSize:"0.62rem", fontFamily:mono, padding:"4px 10px", borderRadius:12, border:`1.5px solid ${branchFilter===b.id?C.primary:C.border}`, background:branchFilter===b.id?C.primary:C.white, color:branchFilter===b.id?C.white:C.textSecondary, cursor:"pointer" }}>
                      {b.icon} {b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:VSC.sidebar, borderBottom:`1px solid rgba(201,168,76,0.3)`, fontSize:"0.6rem", color:"rgba(123,28,46,0.6)", letterSpacing:"0.12em", textTransform:"uppercase" }}>
              📁 EXPLORER — {treeDoc?.treeName || "vansh-vriksha"}
            </div>
            <div style={{ background:VSC.bg }}>
              {renderNode(root, [], expanded, selId, toggle, select, branchFilter)}
            </div>
          </>
        )}

        {/* VERTICAL */}
        {view === "vertical" && <VerticalView members={members} selfId={selfId} onSelect={select} selId={selId} />}

        {/* LIVING */}
        {view === "living" && <LivingView livingMembers={livingMembers} onSelect={select} selId={selId} />}

        {/* TABLE */}
        {view === "table" && <TableView rows={tableRows} search={tableSearch} onSearch={setTableSearch} sortByGen={tableSortGen} onToggleSort={()=>setTableSortGen(p=>!p)} onSelect={select} selId={selId} />}

        {/* CARDS */}
        {view === "cards" && <CardsView allMembers={allMembers} selfId={selfId} onSelect={select} selId={selId} />}

        {/* LINEAGE */}
        {view === "lineage" && (
          <LineageView
            members={members}
            selfId={selfId}
            onEditMember={editTreeMember}
            onAddMember={addTreeMember}
          />
        )}

        <div style={{ height:80 }} />
      </div>

      {/* ── Review & Save sheet ──────────────────────────────────────────────── */}
      {showReview && (
        <ReviewSaveSheet
          pendingChanges={pendingChanges}
          meta={{ isDirty: pendingChanges.length > 0, lastSyncedAt: treeDoc?.updatedAt }}
          status={status}
          isOnline={isOnline}
          syncError={syncError}
          onSyncNow={syncNow}
          onClose={()=>setShowReview(false)}
          onDiscardAll={clearPendingChanges}
        />
      )}

      {/* ── Node panel ───────────────────────────────────────────────────────── */}
      {showPanel && selId && members[selId] && (
        <NodePanel
          member={{ ...members[selId], id:selId }}
          selfId={selfId}
          onClose={()=>setShowPanel(false)}
          onEdit={()=>navigate("/vansh")}
        />
      )}

      {/* ── Status bar ───────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 12px", height:22, background:C.primaryDark, flexShrink:0 }}>
        <span style={{ fontSize:"0.55rem", color:"rgba(240,208,128,0.7)", fontFamily:mono }}>
          🌳 {treeDoc?.familyId} · {VIEWS.find(v=>v.id===view)?.label}
        </span>
        <span style={{ fontSize:"0.55rem", color:"rgba(240,208,128,0.7)", fontFamily:mono }}>{stats.total} members</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VSCode explorer renderer
// ─────────────────────────────────────────────────────────────────────────────
function applyBranchFilter(node, filter) {
  if (filter === "all")         return true;
  if (filter === "ancestors")   return node.type === "anc"   || node.type === "you";
  if (filter === "descendants") return node.type === "child" || node.type === "you";
  if (filter === "rip")         return node.rip === true;
  if (filter === "male")        return node.gender === "M";
  if (filter === "female")      return node.gender === "F";
  return true;
}

function renderNode(node, guides, expanded, selId, toggle, select, branchFilter) {
  if (!node || !applyBranchFilter(node, branchFilter)) return [];
  const rows   = [];
  const hasCh  = node.children?.length > 0;
  const isOpen = expanded.has(node.id);

  rows.push(<VscRow key={"r_"+node.id} node={node} guides={guides}
    hasChildren={hasCh} isOpen={isOpen}
    onToggle={()=>toggle(node.id)} onSelect={()=>select(node.id)}
    isSelected={selId===node.id} />);

  if (["all","spouses"].includes(branchFilter) && node.spouse?.name)
    rows.push(<VscRow key={"sp_"+node.id}
      node={{...node.spouse, id:node.id+"_sp", type:"spouse", relation:"♥ spouse"}}
      guides={guides.map(g=>({...g}))} hasChildren={false}
      isSelected={selId===node.id+"_sp"} onSelect={()=>select(node.id+"_sp")} />);

  if (["all","siblings"].includes(branchFilter))
    (node.siblings||[]).forEach((sib,si) => {
      const sg = guides.map(g=>g.type==="conn"?{type:"vl"}:g.type==="last"?{type:"blank"}:{...g});
      sg.push({type:si===node.siblings.length-1?"last":"conn"});
      rows.push(<VscRow key={"sib_"+sib.id} node={sib} guides={sg} hasChildren={false}
        isSelected={selId===sib.id} onSelect={()=>select(sib.id)} />);
    });

  if (hasCh && isOpen)
    node.children.forEach((child,ci) => {
      const cg = guides.map(g=>g.type==="conn"?{type:"vl"}:g.type==="last"?{type:"blank"}:{...g});
      cg.push({type:ci===node.children.length-1?"last":"conn"});
      rows.push(...renderNode(child, cg, expanded, selId, toggle, select, branchFilter));
    });
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-views (Vertical, Living, Table, Cards)
// ─────────────────────────────────────────────────────────────────────────────
function VerticalView({ members, selfId, onSelect, selId }) {
  const ancestors = getAncestorChain(members, selfId).reverse();
  const children  = getChildren(members, selfId);
  const chain = [
    ...ancestors.map(a => ({ ...a, type:"anc"   })),
    { ...members[selfId], id:selfId, type:"you"   },
    ...children.map(c  => ({ ...c,  type:"child" })),
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 20px" }}>
      <div style={{ fontSize:"0.6rem", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:20, fontFamily:mono }}>⬆️ Oldest → Youngest ⬇️</div>
      {chain.map((m,i) => (
        <div key={m.id||i} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%", maxWidth:320 }}>
          <div onClick={()=>onSelect(m.id)} style={{ width:"100%", padding:"12px 16px", background:m.type==="you"?C.goldFaint:m.type==="anc"?"#FFFAF5":C.white, border:`2px solid ${selId===m.id?C.primary:m.type==="you"?C.gold:C.border}`, borderLeft:`4px solid ${m.type==="you"?C.gold:m.type==="anc"?C.primaryLight:C.primary}`, borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:m.gender==="F"?"#FFF0F3":C.goldFaint, border:`2px solid ${m.gender==="F"?C.primaryLight:C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", flexShrink:0 }}>{m.gender==="F"?"👩":"👨"}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                {m.type==="you" && <span style={{ fontSize:"0.5rem", background:C.gold, color:"#fff", padding:"1px 6px", borderRadius:3, fontWeight:700, fontFamily:mono }}>YOU</span>}
                <span style={{ fontSize:"0.92rem", fontWeight:m.type==="you"?700:500, color:C.primaryDark, fontFamily:serif }}>{m.name}</span>
                {m.rip && <span>🪔</span>}
              </div>
              <div style={{ fontSize:"0.62rem", color:C.textMuted, fontFamily:mono, marginTop:2 }}>{m.year&&`b. ${m.year}`}</div>
            </div>
          </div>
          {i < chain.length-1 && (
            <div style={{ width:2, height:24, background:`linear-gradient(${C.gold},${C.primaryLight})`, borderRadius:2, margin:"2px 0" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function LivingView({ livingMembers, onSelect, selId }) {
  const currentYear = new Date().getFullYear();
  return (
    <div style={{ padding:"16px 14px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, boxShadow:`0 0 6px ${C.green}` }} />
        <span style={{ fontSize:"0.7rem", color:C.green, fontFamily:mono, fontWeight:700 }}>{livingMembers.length} Living Members</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {livingMembers.map((m,i) => {
          const age = m.year ? currentYear - parseInt(m.year) : null;
          return (
            <div key={m.id||i} onClick={()=>onSelect(m.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:selId===m.id?C.goldFaint:C.white, border:`1.5px solid ${selId===m.id?C.primary:C.border}`, borderLeft:`4px solid ${C.green}`, borderRadius:10, cursor:"pointer" }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:m.gender==="F"?"#FFF0F3":C.goldFaint, border:`2px solid ${m.gender==="F"?C.primaryLight:C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", flexShrink:0 }}>{m.gender==="F"?"👩":"👨"}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"0.88rem", fontWeight:600, color:C.primaryDark, fontFamily:serif }}>{m.name}</div>
                {m.year && <div style={{ fontSize:"0.6rem", color:C.textMuted, fontFamily:mono, marginTop:2 }}>b. {m.year}</div>}
              </div>
              {age && <div style={{ textAlign:"center" }}><div style={{ fontSize:"1.1rem", fontFamily:serif, fontWeight:700, color:C.primary }}>{age}</div><div style={{ fontSize:"0.48rem", color:C.textMuted, fontFamily:mono, textTransform:"uppercase" }}>yrs</div></div>}
              <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, boxShadow:`0 0 4px ${C.green}`, flexShrink:0 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableView({ rows, search, onSearch, sortByGen, onToggleSort, onSelect, selId }) {
  return (
    <div style={{ padding:"14px" }}>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input value={search} onChange={e=>onSearch(e.target.value)} placeholder="🔍 Search..." style={{ flex:1, padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:14, fontFamily:mono, outline:"none" }} />
        <button onClick={onToggleSort} style={{ padding:"8px 12px", background:C.goldFaint, border:`1.5px solid ${C.gold}40`, borderRadius:8, fontSize:"0.68rem", fontFamily:mono, color:C.primary, cursor:"pointer" }}>{sortByGen?"Gen ↑":"A-Z ↑"}</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"50px 1fr 60px 70px", background:C.primaryDark, borderRadius:"8px 8px 0 0", overflow:"hidden" }}>
        {["Gen","Name","Year","Status"].map((h,i)=>(
          <div key={i} style={{ padding:"8px 10px", fontSize:"0.58rem", color:C.goldLight, fontFamily:mono, letterSpacing:"0.08em", textTransform:"uppercase", borderRight:i<3?`1px solid rgba(240,208,128,0.15)`:"none" }}>{h}</div>
        ))}
      </div>
      {rows.map((r,i)=>(
        <div key={r.id||i} onClick={()=>onSelect(r.id)} style={{ display:"grid", gridTemplateColumns:"50px 1fr 60px 70px", background:selId===r.id?C.goldFaint:i%2===0?C.white:"#FDFAF5", borderBottom:`1px solid ${C.border}`, cursor:"pointer", borderLeft:`3px solid ${r.role==="Self"?C.gold:r.role==="Ancestor"?C.primaryLight:r.role?.startsWith("Spouse")?"#9B2335":r.role==="Sibling"?"#C9A84C80":C.primary}` }}>
          <div style={{ padding:"8px 10px", fontSize:"0.65rem", fontFamily:mono, color:C.primary, fontWeight:700, borderRight:`1px solid ${C.border}`, display:"flex", alignItems:"center" }}>{r.genLabel}</div>
          <div style={{ padding:"8px 10px", borderRight:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:"0.85rem" }}>{r.gender==="F"?"👩":"👨"}</span>
            <span style={{ fontSize:"0.82rem", fontWeight:r.role==="Self"?700:500, color:C.primaryDark, fontFamily:serif }}>{r.name}</span>
            {r.role && r.role !== "Self" && r.role !== "Ancestor" && r.role !== "Child" && (
              <span style={{ fontSize:"0.48rem", padding:"1px 5px", borderRadius:3,
                background:"rgba(123,28,46,0.07)", color:C.textSecondary,
                fontFamily:mono, flexShrink:0, whiteSpace:"nowrap",
                maxWidth:80, overflow:"hidden", textOverflow:"ellipsis" }}>
                {r.role}
              </span>
            )}
          </div>
          <div style={{ padding:"8px 10px", fontSize:"0.62rem", color:C.textMuted, fontFamily:mono, borderRight:`1px solid ${C.border}`, display:"flex", alignItems:"center" }}>{r.year||"—"}</div>
          <div style={{ padding:"8px 10px", display:"flex", alignItems:"center" }}>
            {r.rip ? <span style={{ fontSize:"0.7rem" }}>🪔</span> : <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.62rem", color:C.green }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.green, display:"inline-block" }}/>Living</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CardsView({ allMembers, selfId, onSelect, selId }) {
  return (
    <div style={{ padding:"16px 14px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12 }}>
        {allMembers.map(m => {
          const isYou = m.id === selfId;
          const age   = m.year ? new Date().getFullYear()-parseInt(m.year) : null;
          return (
            <div key={m.id} onClick={()=>onSelect(m.id)} style={{ background:isYou?C.goldFaint:m.rip?"#FAFAFA":C.white, border:`2px solid ${selId===m.id?C.primary:isYou?C.gold:C.border}`, borderRadius:14, padding:"16px 12px", cursor:"pointer", textAlign:"center", position:"relative", opacity:m.rip?0.7:1 }}>
              {isYou && <div style={{ position:"absolute", top:8, right:8, fontSize:"0.45rem", background:C.gold, color:"#fff", padding:"1px 5px", borderRadius:3, fontWeight:700, fontFamily:mono }}>YOU</div>}
              <div style={{ fontSize:"2rem", marginBottom:8 }}>{m.gender==="F"?"👩":"👨"}</div>
              <div style={{ fontSize:"0.82rem", fontWeight:isYou?700:600, color:C.primaryDark, fontFamily:serif, marginBottom:4 }}>{m.name}</div>
              {age && <div style={{ display:"inline-block", background:isYou?C.white:C.goldFaint, border:`1px solid ${C.gold}40`, borderRadius:10, padding:"2px 8px", fontSize:"0.65rem", color:C.primary, fontFamily:mono }}>{age} yrs</div>}
              {m.rip && <div style={{ marginTop:6, fontSize:"0.85rem" }}>🪔</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodePanel({ member, selfId, onClose, onEdit }) {
  const age = member.year ? new Date().getFullYear()-parseInt(member.year) : null;
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.white, borderTop:`2px solid ${C.gold}`, borderRadius:"16px 16px 0 0", padding:"16px 20px 32px", boxShadow:`0 -8px 32px rgba(90,16,32,0.12)`, animation:"fadeUp 0.22s ease", zIndex:100 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:member.gender==="F"?"#FFF0F3":C.goldFaint, border:`2px solid ${member.gender==="F"?C.primaryLight:C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem" }}>
            {member.gender==="F"?"👩":"👨"}
          </div>
          <div>
            <div style={{ fontFamily:serif, fontSize:"1.1rem", color:C.primaryDark, fontWeight:700 }}>{member.name} {member.rip&&"🪔"}</div>
            <div style={{ fontSize:"0.62rem", color:C.textMuted, fontFamily:mono, marginTop:2 }}>
              {member.id === selfId && <span style={{ marginRight:6, background:C.gold, color:"#fff", padding:"1px 5px", borderRadius:3, fontSize:"0.5rem", fontWeight:700 }}>YOU</span>}
              {member.year&&`b. ${member.year}`} {age&&`· ${age} yrs`}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", color:C.textMuted, padding:4 }}>✕</button>
      </div>
      <div onClick={onEdit} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:C.goldFaint, border:`1px solid ${C.gold}40`, borderRadius:10, cursor:"pointer" }}>
        <span>✏️</span>
        <div><div style={{ fontSize:"0.72rem", fontWeight:700, color:C.primary, fontFamily:mono }}>Edit Tree</div><div style={{ fontSize:"0.6rem", color:C.textSecondary, fontFamily:mono }}>Wizard ખોલો</div></div>
        <span style={{ marginLeft:"auto", color:C.textMuted }}>›</span>
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width:40, height:40, borderRadius:"50%", border:`3px solid ${C.primary}`, borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }} />;
}
function Btn({ onClick, children }) {
  return <button onClick={onClick} style={{ padding:"10px 24px", background:C.primary, color:"#fff", border:"none", borderRadius:10, fontSize:"0.88rem", fontWeight:700, cursor:"pointer", fontFamily:mono }}>{children}</button>;
}
function Center({ children }) {
  return <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:C.bg, padding:24, gap:12, textAlign:"center", fontFamily:mono }}>{children}</div>;
}
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700&display=swap');
      @keyframes spin       { to { transform:rotate(360deg); } }
      @keyframes fadeUp     { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      @keyframes flicker    { 0%,100%{opacity:1} 40%{opacity:0.7} 60%{opacity:0.9} }
      @keyframes reviewPulse{ 0%,100%{box-shadow:0 2px 10px rgba(123,28,46,0.4)} 50%{box-shadow:0 2px 18px rgba(201,168,76,0.7)} }
      * { box-sizing:border-box; }
      ::-webkit-scrollbar { width:4px; height:4px; }
      ::-webkit-scrollbar-thumb { background:#C9A84C40; border-radius:4px; }
      @media(max-width:380px){ .view-label{ display:none; } }
    `}</style>
  );
}
