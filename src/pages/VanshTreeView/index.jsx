// pages/VanshTreeView/index.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Multi-view family tree viewer with 6 view modes + VSCode explorer branches.
// Views: Explorer | Vertical | OrgChart | Living | Table | Cards
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth }      from "../../store/AuthContext";
import { getVanshTree } from "../../db/vanshTreeDb";
import VscRow           from "../../components/vansh/VscRow";
import { VSC }          from "../../constants/vanshConstants";

const C = {
  bg:           "#FDF6EC",
  primary:      "#7B1C2E",
  primaryDark:  "#5A1020",
  primaryLight: "#9B2335",
  gold:         "#C9A84C",
  goldLight:    "#F0D080",
  goldFaint:    "#FDF0D0",
  border:       "#f0e6e6",
  textPrimary:  "#3D0010",
  textSecondary:"#9B6060",
  textMuted:    "#C0A0A0",
  error:        "#ef4444",
  white:        "#FFFFFF",
  green:        "#2E7D32",
};

const mono = "'JetBrains Mono', monospace";
const serif = "'Playfair Display', serif";

// ── View mode config ──────────────────────────────────────────────────────────
const VIEWS = [
  { id: "explorer", icon: "📁", label: "Explorer",  short: "VSCode" },
  { id: "vertical", icon: "⬆️", label: "Vertical",  short: "Chain"  },
  { id: "org",      icon: "↔️", label: "Org Chart", short: "Chart"  },
  { id: "living",   icon: "💚", label: "Living",    short: "Alive"  },
  { id: "table",    icon: "📋", label: "Table",     short: "Table"  },
  { id: "cards",    icon: "🃏", label: "Cards",     short: "Cards"  },
  { id: "lineage",  icon: "📜", label: "Lineage",   short: "Table"  },
];

// ── VSCode Explorer branch filter options ─────────────────────────────────────
const BRANCH_FILTERS = [
  { id: "all",        label: "All Branches",      icon: "🌳" },
  { id: "ancestors",  label: "Ancestors Only",    icon: "⬆️" },
  { id: "descendants",label: "Descendants Only",  icon: "⬇️" },
  { id: "spouses",    label: "With Spouses",      icon: "💑" },
  { id: "siblings",   label: "With Siblings",     icon: "👥" },
  { id: "cousins",    label: "Cousins",           icon: "🤝" },
  { id: "rip",        label: "Deceased Only",     icon: "🪔" },
  { id: "male",       label: "Male Line",         icon: "👨" },
  { id: "female",     label: "Female Line",       icon: "👩" },
];

// ─────────────────────────────────────────────────────────────────────────────
// BUILD TREE HELPER
// ─────────────────────────────────────────────────────────────────────────────
function buildTree(self, ancestors = [], descendants = [], spouses = {}, siblings = {}) {
  const ancs  = (ancestors  || []).filter(a => a?.name);
  const descs = (descendants|| []).filter(d => d?.name);

  const getSibsFor = id => {
    if (!siblings?.[id]) return [];
    return [...(siblings[id].elder||[]),...(siblings[id].younger||[])]
      .filter(x => x?.name)
      .map((x,i) => ({ ...x, id: id+"_sib"+i, type:"sib", spouse:null, siblings:[], children:[] }));
  };

  const selfNode = {
    id:"self", name:self?.name||"", gender:self?.gender||"",
    year:self?.year||"", rip:false, relation:"YOU", type:"you",
    spouse: spouses["self"]||null,
    siblings: getSibsFor("self"),
    _childCount: descs.length,
    children: descs.map((d,i) => ({
      id:"desc"+i, name:d.name, gender:d.gender,
      year:d.year, rip:d.rip||false, relation:d.relation,
      type:"child",
      spouse: spouses["desc_"+d.relation]||null,
      siblings:[], children:[],
    })),
  };

  let cur = selfNode;
  ancs.forEach((anc,i) => {
    cur = {
      id:"anc"+i, name:anc.name, gender:anc.gender,
      year:anc.year, rip:anc.rip||false, relation:anc.relation,
      type:"anc",
      spouse: spouses["anc_"+anc.relation]||null,
      siblings: getSibsFor("anc_"+i),
      children:[cur], _childCount:1,
    };
  });
  return cur;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER TREE ROWS (VSCode Explorer)
// ─────────────────────────────────────────────────────────────────────────────
function renderNode(node, guides, expanded, selId, toggle, select, branchFilter) {
  if (!node) return [];
  const rows   = [];
  const hasCh  = node.children?.length > 0;
  const isOpen = expanded.has(node.id);

  // Apply branch filter
  const showNode = applyBranchFilter(node, branchFilter);
  if (!showNode) return [];

  rows.push(
    <VscRow key={"r_"+node.id} node={node} guides={guides}
      hasChildren={hasCh} isOpen={isOpen}
      onToggle={()=>toggle(node.id)} onSelect={()=>select(node.id)}
      isSelected={selId===node.id} />
  );

  if (branchFilter !== "ancestors" && branchFilter !== "descendants" && branchFilter !== "rip" && branchFilter !== "male" && branchFilter !== "female") {
    if (node.spouse?.name && (branchFilter === "all" || branchFilter === "spouses"))
      rows.push(
        <VscRow key={"sp_"+node.id}
          node={{...node.spouse, id:node.id+"_sp", type:"spouse", relation:"♥ spouse"}}
          guides={guides.map(g=>({...g}))} hasChildren={false}
          isSelected={selId===node.id+"_sp"} onSelect={()=>select(node.id+"_sp")} />
      );

    if (branchFilter === "all" || branchFilter === "siblings")
      (node.siblings||[]).forEach((sib,si) => {
        const sibIsLast = si===node.siblings.length-1;
        const sg = guides.map(g=>g.type==="conn"?{type:"vl"}:g.type==="last"?{type:"blank"}:{...g});
        sg.push({type:sibIsLast?"last":"conn"});
        rows.push(
          <VscRow key={"sib_"+sib.id} node={sib} guides={sg} hasChildren={false}
            isSelected={selId===sib.id} onSelect={()=>select(sib.id)} />
        );
      });
  }

  if (hasCh && isOpen)
    node.children.forEach((child,ci) => {
      const cg = guides.map(g=>g.type==="conn"?{type:"vl"}:g.type==="last"?{type:"blank"}:{...g});
      cg.push({type:ci===node.children.length-1?"last":"conn"});
      rows.push(...renderNode(child, cg, expanded, selId, toggle, select, branchFilter));
    });

  return rows;
}

function applyBranchFilter(node, filter) {
  if (filter === "all")         return true;
  if (filter === "ancestors")   return node.type === "anc"   || node.type === "you";
  if (filter === "descendants") return node.type === "child" || node.type === "you";
  if (filter === "rip")         return node.rip === true;
  if (filter === "male")        return node.gender === "M";
  if (filter === "female")      return node.gender === "F";
  return true; // spouses, siblings, cousins — show all nodes, filter children only
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VanshTreeView() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [treeData,     setTreeData]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [view,         setView]         = useState("explorer");
  const [branchFilter, setBranchFilter] = useState("all");
  const [expanded,     setExpanded]     = useState(new Set(["self"]));
  const [selId,        setSelId]        = useState(null);
  const [selNode,      setSelNode]      = useState(null);
  const [showPanel,    setShowPanel]    = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [tableSearch,  setTableSearch]  = useState("");
  const [tableSortGen, setTableSortGen] = useState(true);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    getVanshTree(user.uid)
      .then(d => { if (d) setTreeData(d); })
      .catch(e => { console.error(e); setError("Tree લોડ કરવામાં ભૂલ."); })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const toggle = useCallback(id => setExpanded(p => {
    const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n;
  }), []);

  const select = useCallback((id, node) => {
    setSelId(id); setSelNode(node); setShowPanel(true);
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  const allMembers = useMemo(() => {
    if (!treeData) return [];
    return [
      treeData.self,
      ...(treeData.ancestors  ||[]).filter(a=>a?.name),
      ...(treeData.descendants||[]).filter(d=>d?.name),
      ...Object.values(treeData.spouses||{}).filter(Boolean),
    ].filter(m=>m?.name);
  }, [treeData]);

  const livingMembers = useMemo(() =>
    allMembers.filter(m => !m.rip), [allMembers]);

  const stats = useMemo(() => ({
    total:   allMembers.length,
    living:  livingMembers.length,
    ancs:    (treeData?.ancestors  ||[]).filter(a=>a?.name).length,
    descs:   (treeData?.descendants||[]).filter(d=>d?.name).length,
    males:   allMembers.filter(m=>m.gender==="M").length,
    females: allMembers.filter(m=>m.gender==="F").length,
  }), [allMembers, livingMembers, treeData]);

  // ── Table data (generation rows) ───────────────────────────────────────────
  const tableRows = useMemo(() => {
    if (!treeData) return [];
    const ancs  = (treeData.ancestors  ||[]).filter(a=>a?.name);
    const descs = (treeData.descendants||[]).filter(d=>d?.name);

    const rows = [
      ...ancs.map((a,i)  => ({ ...a, gen: -(ancs.length - i),  genLabel: `G-${ancs.length - i}`,  role:"Ancestor"   })),
      { ...treeData.self, gen: 0, genLabel: "YOU",              role:"Self"       },
      ...descs.map((d,i) => ({ ...d, gen: i+1,                  genLabel: `G+${i+1}`,             role:"Descendant" })),
    ];

    const q = tableSearch.toLowerCase();
    const filtered = q ? rows.filter(r => r.name?.toLowerCase().includes(q) || r.relation?.toLowerCase().includes(q)) : rows;
    return tableSortGen ? filtered.sort((a,b)=>a.gen-b.gen) : filtered.sort((a,b)=>a.name?.localeCompare(b.name));
  }, [treeData, tableSearch, tableSortGen]);

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING / ERROR / EMPTY states
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <Center>
      <div style={{ width:40, height:40, borderRadius:"50%", border:`3px solid ${C.primary}`, borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }} />
      <p style={{ fontSize:"0.82rem", color:C.primary, fontFamily:mono, marginTop:12 }}>Tree લોડ થઈ રહ્યું છે...</p>
      <Styles />
    </Center>
  );

  if (error) return (
    <Center>
      <div style={{ fontSize:"2.5rem" }}>⚠️</div>
      <p style={{ color:C.error, fontSize:"0.88rem" }}>{error}</p>
      <Btn onClick={()=>window.location.reload()}>↻ Retry</Btn>
      <Styles />
    </Center>
  );

  if (!treeData?.self?.name) return (
    <Center>
      <div style={{ width:80, height:80, borderRadius:"50%", background:C.goldFaint, border:`2px dashed ${C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.5rem" }}>🌱</div>
      <h2 style={{ fontFamily:serif, fontSize:"1.4rem", color:C.primaryDark, margin:"16px 0 8px" }}>હજી Tree બનાવ્યું નથી</h2>
      <p style={{ fontSize:"0.82rem", color:C.textSecondary, lineHeight:1.6, maxWidth:280, textAlign:"center", margin:"0 0 20px" }}>
        Wizard ખોલો અને family members ઉમેરો.
      </p>
      <Btn onClick={()=>navigate("/vansh")}>🌳 Tree બનાવો</Btn>
      <Styles />
    </Center>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TREE BUILT
  // ─────────────────────────────────────────────────────────────────────────
  const root    = buildTree(treeData.self, treeData.ancestors, treeData.descendants, treeData.spouses, treeData.siblings);
  const cousins = (treeData.cousins||[]).filter(c=>c?.name);

  const updatedAt = treeData.updatedAt
    ? new Date(treeData.updatedAt).toLocaleDateString("gu-IN",{day:"2-digit",month:"long",year:"numeric"})
    : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100dvh", overflow:"hidden", background:C.bg, fontFamily:mono }}>
      <Styles />

      {/* ── Title bar ────────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 14px", height:36, background:C.primaryDark, borderBottom:`1px solid rgba(201,168,76,0.3)`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>🌳</span>
          <span style={{ fontSize:"0.7rem", color:C.goldLight, letterSpacing:"0.06em" }}>
            વંશ વૃક્ષ — {treeData.self?.name}
          </span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {updatedAt && <span style={{ fontSize:"0.55rem", color:"rgba(240,208,128,0.5)" }}>Updated: {updatedAt}</span>}
          <button onClick={()=>navigate("/vansh")} style={{ padding:"4px 12px", background:C.gold, color:C.primaryDark, border:"none", borderRadius:5, fontSize:"0.68rem", fontWeight:700, cursor:"pointer", fontFamily:mono }}>
            ✏️ Edit
          </button>
        </div>
      </div>

      {/* ── View switcher ────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", background:C.white, borderBottom:`1px solid ${C.border}`, overflowX:"auto", flexShrink:0, scrollbarWidth:"none" }}>
        {VIEWS.map(v => (
          <button key={v.id} onClick={()=>{ setView(v.id); setShowBranches(false); }}
            style={{ flexShrink:0, padding:"0 12px", height:36, display:"flex", alignItems:"center", gap:5, fontSize:"0.65rem", fontFamily:mono, border:"none", borderBottom:`2px solid ${view===v.id?C.primary:"transparent"}`, background:view===v.id?C.goldFaint:C.white, color:view===v.id?C.primary:C.textMuted, cursor:"pointer", fontWeight:view===v.id?700:400, transition:"all 0.15s" }}>
            <span>{v.icon}</span>
            <span className="view-label">{v.label}</span>
          </button>
        ))}
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", background:C.white, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        {[
          { n:stats.total,   l:"Total"    },
          { n:stats.ancs,    l:"Ancestors" },
          { n:stats.descs,   l:"Children" },
          { n:stats.males,   l:"Male"     },
          { n:stats.females, l:"Female"   },
          { n:stats.living,  l:"Living"   },
        ].map((s,i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 2px", borderRight:i<5?`1px solid ${C.border}`:"none" }}>
            <div style={{ fontFamily:serif, fontSize:"1rem", color:C.primary, fontWeight:700 }}>{s.n}</div>
            <div style={{ fontSize:"0.48rem", color:C.textMuted, letterSpacing:"0.07em", textTransform:"uppercase" }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", WebkitOverflowScrolling:"touch" }}>

        {/* ── EXPLORER VIEW ──────────────────────────────────────────────────── */}
        {view === "explorer" && (
          <>
            {/* Branch filter bar */}
            <div style={{ background:VSC.sidebar, borderBottom:`1px solid rgba(201,168,76,0.2)` }}>
              <div style={{ display:"flex", alignItems:"center", padding:"6px 14px", gap:8 }}>
                <span style={{ fontSize:"0.58rem", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>Branch:</span>
                <button onClick={()=>setShowBranches(p=>!p)} style={{ fontSize:"0.62rem", color:C.primary, background:C.goldFaint, border:`1px solid ${C.gold}40`, borderRadius:5, padding:"3px 10px", cursor:"pointer", fontFamily:mono, display:"flex", alignItems:"center", gap:5 }}>
                  {BRANCH_FILTERS.find(b=>b.id===branchFilter)?.icon} {BRANCH_FILTERS.find(b=>b.id===branchFilter)?.label}
                  <span style={{ fontSize:"0.5rem" }}>{showBranches?"▲":"▼"}</span>
                </button>
                <button onClick={()=>setExpanded(new Set(["self"]))} style={{ marginLeft:"auto", fontSize:"0.58rem", color:C.textMuted, background:"none", border:`1px solid ${C.border}`, borderRadius:4, padding:"2px 8px", cursor:"pointer", fontFamily:mono }}>
                  ⊟ collapse
                </button>
                <button onClick={()=>{ const all=new Set(); const addAll=n=>{if(!n)return;all.add(n.id);(n.children||[]).forEach(addAll);}; addAll(root); setExpanded(all); }} style={{ fontSize:"0.58rem", color:C.textMuted, background:"none", border:`1px solid ${C.border}`, borderRadius:4, padding:"2px 8px", cursor:"pointer", fontFamily:mono }}>
                  ⊞ expand
                </button>
              </div>

              {/* Branch dropdown */}
              {showBranches && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"8px 14px 10px", borderTop:`1px solid rgba(201,168,76,0.15)` }}>
                  {BRANCH_FILTERS.map(b => (
                    <button key={b.id} onClick={()=>{ setBranchFilter(b.id); setShowBranches(false); }}
                      style={{ fontSize:"0.62rem", fontFamily:mono, padding:"4px 10px", borderRadius:12, border:`1.5px solid ${branchFilter===b.id?C.primary:C.border}`, background:branchFilter===b.id?C.primary:C.white, color:branchFilter===b.id?C.white:C.textSecondary, cursor:"pointer", display:"flex", alignItems:"center", gap:4, transition:"all 0.12s" }}>
                      {b.icon} {b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Explorer header */}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:VSC.sidebar, borderBottom:`1px solid rgba(201,168,76,0.3)`, fontSize:"0.6rem", color:"rgba(123,28,46,0.6)", letterSpacing:"0.12em", textTransform:"uppercase" }}>
              📁 EXPLORER — vansh-vriksha
              <span style={{ marginLeft:"auto", fontSize:"0.55rem", color:C.textMuted }}>
                {BRANCH_FILTERS.find(b=>b.id===branchFilter)?.icon} {BRANCH_FILTERS.find(b=>b.id===branchFilter)?.label}
              </span>
            </div>

            {/* Tree rows */}
            <div style={{ background:VSC.bg }}>
              {renderNode(root, [], expanded, selId, toggle, (id)=>{ const n=findNodeById(root,id); select(id,n); }, branchFilter)}
            </div>

            {/* Cousins */}
            {(branchFilter==="all"||branchFilter==="cousins") && cousins.length>0 && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:VSC.sidebar, borderTop:`1px solid rgba(201,168,76,0.2)`, borderBottom:`1px solid rgba(201,168,76,0.2)`, fontSize:"0.58rem", color:"rgba(123,28,46,0.6)" }}>
                  🤝 COUSINS ({cousins.length})
                </div>
                {cousins.map((c,i)=>(
                  <VscRow key={"c_"+i} node={{...c,type:"sib",id:"cousin_"+i}} guides={[{type:"last"}]} hasChildren={false}
                    isSelected={selId==="cousin_"+i} onSelect={()=>select("cousin_"+i,c)} />
                ))}
              </>
            )}
          </>
        )}

        {/* ── VERTICAL CHAIN VIEW ─────────────────────────────────────────────── */}
        {view === "vertical" && (
          <VerticalView treeData={treeData} onSelect={select} selId={selId} />
        )}

        {/* ── ORG CHART VIEW ──────────────────────────────────────────────────── */}
        {view === "org" && (
          <OrgChartView treeData={treeData} onSelect={select} selId={selId} />
        )}

        {/* ── LIVING MEMBERS VIEW ─────────────────────────────────────────────── */}
        {view === "living" && (
          <LivingView livingMembers={livingMembers} treeData={treeData} onSelect={select} selId={selId} />
        )}

        {/* ── TABLE VIEW ──────────────────────────────────────────────────────── */}
        {view === "table" && (
          <TableView rows={tableRows} search={tableSearch} onSearch={setTableSearch} sortByGen={tableSortGen} onToggleSort={()=>setTableSortGen(p=>!p)} onSelect={select} selId={selId} />
        )}

        {/* ── CARDS VIEW ──────────────────────────────────────────────────────── */}
        {view === "cards" && (
          <CardsView allMembers={allMembers} treeData={treeData} onSelect={select} selId={selId} />
        )}

        {/* ── LINEAGE TABLE VIEW ───────────────────────────────────────────────── */}
        {view === "lineage" && (
          <LineageView treeData={treeData} />
        )}

        <div style={{ height:80 }} />
      </div>

      {/* ── Selected node panel ──────────────────────────────────────────────── */}
      {showPanel && selNode && (
        <NodePanel node={selNode} onClose={()=>setShowPanel(false)} onEdit={()=>navigate("/vansh")} />
      )}

      {/* ── Status bar ───────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 12px", height:22, background:C.primaryDark, flexShrink:0 }}>
        <span style={{ fontSize:"0.55rem", color:"rgba(240,208,128,0.7)", fontFamily:mono }}>🌳 vansh-vriksha · {VIEWS.find(v=>v.id===view)?.label}</span>
        <span style={{ fontSize:"0.55rem", color:"rgba(240,208,128,0.7)", fontFamily:mono }}>{stats.total} members</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: VERTICAL CHAIN
// ─────────────────────────────────────────────────────────────────────────────
function VerticalView({ treeData, onSelect, selId }) {
  const ancs  = [...(treeData.ancestors||[])].filter(a=>a?.name).reverse();
  const descs = (treeData.descendants||[]).filter(d=>d?.name);
  const chain = [
    ...ancs.map((a,i)  => ({ ...a, type:"anc"  })),
    { ...treeData.self,   type:"you"   },
    ...descs.map((d,i) => ({ ...d, type:"child" })),
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 20px" }}>
      <div style={{ fontSize:"0.6rem", color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:20, fontFamily:mono }}>
        ⬆️ Oldest → Youngest ⬇️
      </div>
      {chain.map((m, i) => (
        <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%", maxWidth:320 }}>
          <div
            onClick={()=>onSelect("v_"+i, m)}
            style={{
              width:"100%", padding:"12px 16px",
              background: m.type==="you"?C.goldFaint : m.type==="anc"?"#FFFAF5":C.white,
              border:`2px solid ${selId==="v_"+i?C.primary : m.type==="you"?C.gold:C.border}`,
              borderLeft:`4px solid ${m.type==="you"?C.gold:m.type==="anc"?C.primaryLight:C.primary}`,
              borderRadius:10, cursor:"pointer",
              boxShadow: selId==="v_"+i?`0 4px 16px ${C.primary}30`:"0 1px 4px rgba(0,0,0,0.05)",
              transition:"all 0.15s",
              display:"flex", alignItems:"center", gap:12,
            }}
          >
            <div style={{ width:36, height:36, borderRadius:"50%", background:m.gender==="F"?"#FFF0F3":C.goldFaint, border:`2px solid ${m.gender==="F"?C.primaryLight:C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", flexShrink:0 }}>
              {m.gender==="F"?"👩":"👨"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                {m.type==="you" && <span style={{ fontSize:"0.5rem", background:C.gold, color:"#fff", padding:"1px 6px", borderRadius:3, fontWeight:700, fontFamily:mono }}>YOU</span>}
                <span style={{ fontSize:"0.92rem", fontWeight:m.type==="you"?700:500, color:C.primaryDark, fontFamily:serif }}>{m.name}</span>
                {m.rip && <span>🪔</span>}
              </div>
              <div style={{ fontSize:"0.62rem", color:C.textMuted, fontFamily:mono, marginTop:2 }}>
                {m.relation && <span style={{ marginRight:8 }}>{m.relation}</span>}
                {m.year     && <span>b. {m.year}</span>}
              </div>
            </div>
            {/* Spouse badge */}
            {treeData.spouses?.["self"] && m.type==="you" && (
              <div style={{ fontSize:"0.6rem", color:C.primaryLight, fontFamily:mono }}>
                ♥ {treeData.spouses["self"].name}
              </div>
            )}
          </div>
          {i < chain.length-1 && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"4px 0" }}>
              <div style={{ width:2, height:20, background:`linear-gradient(${C.gold},${C.primaryLight})`, borderRadius:2 }} />
              <div style={{ fontSize:"0.55rem", color:C.textMuted, fontFamily:mono }}>│</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: ORG CHART — proper connected tree, couples in one chip
// Each level: members connected by horizontal line, vertical drop from parent
// Matches the image: hargovina at top, children below on one horizontal line
// ─────────────────────────────────────────────────────────────────────────────
function OrgChartView({ treeData, onSelect, selId }) {
  // Build a proper tree structure for the org chart
  // ancestors stack (oldest first), self + siblings at self's level, descendants below
  const ancs     = [...(treeData.ancestors||[])].filter(a=>a?.name).reverse(); // oldest→newest
  const descs    = (treeData.descendants||[]).filter(d=>d?.name);
  const siblings = Object.values(treeData.siblings||{})
    .flatMap(s=>[...(s.elder||[]),...(s.younger||[])]).filter(x=>x?.name);
  const spouses  = treeData.spouses || {};

  // Each "level" = one horizontal row
  // ancestors: one node per level (main line)
  // self level: self + siblings all on same row
  // descendants: all on same row below self
  const levels = [
    ...ancs.map((a, i) => ({
      key:     "anc_"+i,
      nodes:   [{ member:a, spouse: spouses["anc_"+a.relation]||null, isMain:true }],
      label:   a.relation,
      isAnc:   true,
    })),
    {
      key:   "self",
      nodes: [
        ...siblings.filter((_,i)=>i<siblings.length/2).map((s,i)=>({ member:s, spouse:null, isMain:false, isSib:true })),
        { member:treeData.self, spouse:spouses["self"]||null, isMain:true, isYou:true },
        ...siblings.filter((_,i)=>i>=siblings.length/2).map((s,i)=>({ member:s, spouse:null, isMain:false, isSib:true })),
      ],
      label: "Your Generation",
      isSelf: true,
    },
    ...(descs.length > 0 ? [{
      key:   "descs",
      nodes: descs.map((d,i)=>({ member:d, spouse:spouses["desc_"+d.relation]||null, isMain:false, isChild:true })),
      label: "Children",
      isDesc: true,
    }] : []),
  ];

  return (
    <div style={{ overflowX:"auto", overflowY:"visible", padding:"24px 0 40px", minWidth:"100%", background:C.bg }}>
      <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", minWidth:"100%", paddingBottom:8 }}>

        {levels.map((level, li) => {
          const isLast   = li === levels.length - 1;
          const nextLevel= levels[li+1];
          const hasMulti = level.nodes.length > 1;
          const mainIdx  = level.nodes.findIndex(n=>n.isMain||n.isYou);

          return (
            <div key={level.key} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>

              {/* ── vertical drop from above ── */}
              {li > 0 && (
                <div style={{ width:2, height:24, background:`linear-gradient(${C.gold},${C.gold})`, flexShrink:0 }} />
              )}

              {/* ── level label ── */}
              <div style={{ fontSize:"0.5rem", color:C.textMuted, fontFamily:mono, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6, opacity:0.8 }}>
                {level.label}
              </div>

              {/* ── nodes row with connecting horizontal line ── */}
              <div style={{ position:"relative", display:"flex", alignItems:"flex-start", justifyContent:"center", gap:0, padding:"0 20px", width:"100%" }}>

                {/* Horizontal line spanning all sibling nodes */}
                {hasMulti && (
                  <div style={{
                    position:"absolute",
                    top: 22, // halfway up chip
                    left:"50%", right:"50%",
                    // We use a pseudo approach — full width line clipped by flex row
                    width:"calc(100% - 80px)",
                    transform:"translateX(-50%)",
                    height:2,
                    background: level.isSelf ? C.primary : C.gold,
                    zIndex:0,
                    borderRadius:2,
                  }} />
                )}

                {level.nodes.map((n, ni) => (
                  <div key={ni} style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1, maxWidth:130, position:"relative", zIndex:1 }}>
                    {/* vertical tick down from horizontal line for each sibling */}
                    {hasMulti && ni !== mainIdx && (
                      <div style={{ width:2, height:12, background:level.isSelf?C.primary:C.gold, margin:"0 auto" }} />
                    )}
                    {hasMulti && ni === mainIdx && (
                      <div style={{ width:2, height:12, background:C.gold, margin:"0 auto" }} />
                    )}

                    {/* ── Couple chip ── */}
                    <CoupleChip
                      member={n.member}
                      spouse={n.spouse}
                      isYou={n.isYou}
                      isSib={n.isSib}
                      isSelected={selId===level.key+"_"+ni}
                      onClick={()=>onSelect(level.key+"_"+ni, n.member)}
                    />

                    {/* vertical drop to next level — only from main/YOU node */}
                    {!isLast && (n.isMain||n.isYou) && (
                      <div style={{ width:2, height:20, background:C.gold, margin:"4px auto 0" }} />
                    )}
                  </div>
                ))}
              </div>

              {/* ── horizontal spread line above children ── */}
              {!isLast && nextLevel && nextLevel.nodes.length > 1 && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
                  <div style={{ width:"calc(100% - 80px)", height:2, background:C.gold, borderRadius:2 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Couple chip: person + spouse side by side in one rounded card ─────────────
function CoupleChip({ member, spouse, isYou, isSib, isSelected, onClick }) {
  const hasSpouse = spouse?.name;

  return (
    <div
      onClick={onClick}
      style={{
        display:       "flex",
        alignItems:    "center",
        background:    isYou ? C.goldFaint : isSib ? "#FFFAF5" : C.white,
        border:        `2px solid ${isSelected ? C.primary : isYou ? C.gold : C.border}`,
        borderRadius:  20,
        padding:       hasSpouse ? "6px 10px 6px 6px" : "6px 10px",
        cursor:        "pointer",
        boxShadow:     isSelected
                         ? `0 4px 16px ${C.primary}30`
                         : "0 1px 6px rgba(0,0,0,0.06)",
        transition:    "all 0.15s",
        gap:           hasSpouse ? 0 : 6,
        maxWidth:      hasSpouse ? 200 : 130,
        minWidth:      80,
        position:      "relative",
      }}
    >
      {/* Main person */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"0 6px" }}>
        <span style={{ fontSize:"1.1rem" }}>{member.gender==="F"?"👩":"👨"}</span>
        <span style={{
          fontSize:   "0.68rem",
          fontFamily: serif,
          fontWeight: isYou ? 700 : 500,
          color:      isYou ? C.primaryDark : isSib ? C.textSecondary : C.primaryDark,
          fontStyle:  isSib ? "italic" : "normal",
          whiteSpace: "nowrap",
          marginTop:  2,
          maxWidth:   80,
          overflow:   "hidden",
          textOverflow:"ellipsis",
        }}>
          {member.name}
        </span>
        {member.year && (
          <span style={{ fontSize:"0.5rem", color:C.textMuted, fontFamily:mono }}>
            b.{member.year}
          </span>
        )}
        {member.rip && <span style={{ fontSize:"0.65rem" }}>🪔</span>}
        {isYou && (
          <span style={{ fontSize:"0.42rem", background:C.gold, color:"#fff", padding:"1px 5px", borderRadius:3, fontWeight:700, fontFamily:mono, marginTop:2 }}>
            YOU
          </span>
        )}
      </div>

      {/* Divider + spouse */}
      {hasSpouse && (
        <>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"0 4px" }}>
            <div style={{ height:36, width:1, background:`linear-gradient(transparent,${C.primaryLight},transparent)` }} />
            <span style={{ fontSize:"0.6rem", color:C.primaryLight, marginTop:-2 }}>♥</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"0 6px" }}>
            <span style={{ fontSize:"1.1rem" }}>{spouse.gender==="F"?"👩":"👨"}</span>
            <span style={{
              fontSize:"0.68rem", fontFamily:serif, fontWeight:500,
              color:C.primaryLight, whiteSpace:"nowrap",
              marginTop:2, maxWidth:80, overflow:"hidden", textOverflow:"ellipsis",
            }}>
              {spouse.name}
            </span>
            {spouse.year && (
              <span style={{ fontSize:"0.5rem", color:C.textMuted, fontFamily:mono }}>
                b.{spouse.year}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: LIVING MEMBERS
// ─────────────────────────────────────────────────────────────────────────────
function LivingView({ livingMembers, treeData, onSelect, selId }) {
  const currentYear = new Date().getFullYear();
  return (
    <div style={{ padding:"16px 14px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, boxShadow:`0 0 6px ${C.green}` }} />
        <span style={{ fontSize:"0.7rem", color:C.green, fontFamily:mono, fontWeight:700 }}>
          {livingMembers.length} Living Members
        </span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {livingMembers.map((m,i) => {
          const age = m.year ? currentYear - parseInt(m.year) : null;
          return (
            <div key={i} onClick={()=>onSelect("live_"+i,m)}
              style={{
                display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                background:selId==="live_"+i?C.goldFaint:C.white,
                border:`1.5px solid ${selId==="live_"+i?C.primary:C.border}`,
                borderLeft:`4px solid ${C.green}`,
                borderRadius:10, cursor:"pointer", transition:"all 0.15s",
              }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:m.gender==="F"?"#FFF0F3":C.goldFaint, border:`2px solid ${m.gender==="F"?C.primaryLight:C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", flexShrink:0 }}>
                {m.gender==="F"?"👩":"👨"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"0.88rem", fontWeight:600, color:C.primaryDark, fontFamily:serif }}>{m.name}</div>
                <div style={{ fontSize:"0.6rem", color:C.textMuted, fontFamily:mono, marginTop:2 }}>
                  {m.relation && <span style={{ marginRight:8 }}>🔗 {m.relation}</span>}
                  {m.year     && <span>b. {m.year}</span>}
                </div>
              </div>
              {age && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"1.1rem", fontFamily:serif, fontWeight:700, color:C.primary }}>{age}</div>
                  <div style={{ fontSize:"0.48rem", color:C.textMuted, fontFamily:mono, textTransform:"uppercase" }}>yrs</div>
                </div>
              )}
              <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, boxShadow:`0 0 4px ${C.green}`, flexShrink:0 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: TABLE
// ─────────────────────────────────────────────────────────────────────────────
function TableView({ rows, search, onSearch, sortByGen, onToggleSort, onSelect, selId }) {
  return (
    <div style={{ padding:"14px" }}>
      {/* Search + Sort */}
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input
          value={search} onChange={e=>onSearch(e.target.value)}
          placeholder="🔍 નામ શોધો..."
          style={{ flex:1, padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:14, fontFamily:mono, outline:"none", background:C.white, color:C.textPrimary }}
        />
        <button onClick={onToggleSort}
          style={{ padding:"8px 12px", background:C.goldFaint, border:`1.5px solid ${C.gold}40`, borderRadius:8, fontSize:"0.68rem", fontFamily:mono, color:C.primary, cursor:"pointer", whiteSpace:"nowrap" }}>
          {sortByGen?"Gen ↑":"A-Z ↑"}
        </button>
      </div>

      {/* Table header */}
      <div style={{ display:"grid", gridTemplateColumns:"50px 1fr 80px 60px 70px", gap:0, background:C.primaryDark, borderRadius:"8px 8px 0 0", overflow:"hidden" }}>
        {["Gen","Name","Relation","Year","Status"].map((h,i)=>(
          <div key={i} style={{ padding:"8px 10px", fontSize:"0.58rem", color:C.goldLight, fontFamily:mono, letterSpacing:"0.08em", textTransform:"uppercase", borderRight:i<4?`1px solid rgba(240,208,128,0.15)`:"none" }}>
            {h}
          </div>
        ))}
      </div>

      {/* Table rows */}
      {rows.map((r,i)=>(
        <div key={i} onClick={()=>onSelect("tbl_"+i,r)}
          style={{ display:"grid", gridTemplateColumns:"50px 1fr 80px 60px 70px", background:selId==="tbl_"+i?C.goldFaint:i%2===0?C.white:"#FDFAF5", borderBottom:`1px solid ${C.border}`, cursor:"pointer", transition:"background 0.1s", borderLeft:`3px solid ${r.type==="you"?C.gold:r.type==="anc"?C.primaryLight:C.primary}` }}>
          <div style={{ padding:"8px 10px", fontSize:"0.65rem", fontFamily:mono, color:C.primary, fontWeight:700, borderRight:`1px solid ${C.border}`, display:"flex", alignItems:"center" }}>
            {r.genLabel}
          </div>
          <div style={{ padding:"8px 10px", borderRight:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:"0.85rem" }}>{r.gender==="F"?"👩":"👨"}</span>
            <div>
              <div style={{ fontSize:"0.82rem", fontWeight:r.type==="you"?700:500, color:C.primaryDark, fontFamily:serif }}>{r.name}</div>
              {r.type==="you" && <span style={{ fontSize:"0.45rem", background:C.gold, color:"#fff", padding:"1px 5px", borderRadius:3, fontFamily:mono }}>YOU</span>}
            </div>
          </div>
          <div style={{ padding:"8px 10px", fontSize:"0.62rem", color:C.textSecondary, fontFamily:mono, borderRight:`1px solid ${C.border}`, display:"flex", alignItems:"center" }}>
            {r.relation||"—"}
          </div>
          <div style={{ padding:"8px 10px", fontSize:"0.62rem", color:C.textMuted, fontFamily:mono, borderRight:`1px solid ${C.border}`, display:"flex", alignItems:"center" }}>
            {r.year||"—"}
          </div>
          <div style={{ padding:"8px 10px", display:"flex", alignItems:"center" }}>
            {r.rip
              ? <span style={{ fontSize:"0.7rem" }}>🪔 Deceased</span>
              : <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.62rem", color:C.green, fontFamily:mono }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.green, display:"inline-block" }}/>Living</span>
            }
          </div>
        </div>
      ))}

      {rows.length===0 && (
        <div style={{ textAlign:"center", padding:24, color:C.textMuted, fontSize:"0.78rem", fontFamily:mono }}>
          કોઈ result મળ્યું નથી
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: CARDS
// ─────────────────────────────────────────────────────────────────────────────
function CardsView({ allMembers, treeData, onSelect, selId }) {
  return (
    <div style={{ padding:"16px 14px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12 }}>
        {allMembers.map((m,i)=>{
          const isYou = m.name===treeData.self?.name;
          const age   = m.year ? new Date().getFullYear()-parseInt(m.year) : null;
          return (
            <div key={i} onClick={()=>onSelect("card_"+i,m)}
              style={{
                background:isYou?C.goldFaint:m.rip?"#FAFAFA":C.white,
                border:`2px solid ${selId==="card_"+i?C.primary:isYou?C.gold:C.border}`,
                borderRadius:14, padding:"16px 12px", cursor:"pointer", textAlign:"center",
                boxShadow:selId==="card_"+i?`0 4px 20px ${C.primary}25`:"0 2px 8px rgba(0,0,0,0.04)",
                transition:"all 0.15s", opacity:m.rip?0.7:1,
                position:"relative",
              }}>
              {isYou && (
                <div style={{ position:"absolute", top:8, right:8, fontSize:"0.45rem", background:C.gold, color:"#fff", padding:"1px 5px", borderRadius:3, fontWeight:700, fontFamily:mono }}>YOU</div>
              )}
              <div style={{ fontSize:"2rem", marginBottom:8 }}>{m.gender==="F"?"👩":"👨"}</div>
              <div style={{ fontSize:"0.82rem", fontWeight:isYou?700:600, color:C.primaryDark, fontFamily:serif, lineHeight:1.3, marginBottom:4 }}>
                {m.name}
              </div>
              {m.relation && (
                <div style={{ fontSize:"0.55rem", color:C.textMuted, fontFamily:mono, marginBottom:4 }}>
                  {m.relation}
                </div>
              )}
              {age && (
                <div style={{ display:"inline-block", background:isYou?C.white:C.goldFaint, border:`1px solid ${C.gold}40`, borderRadius:10, padding:"2px 8px", fontSize:"0.65rem", color:C.primary, fontFamily:mono }}>
                  {age} yrs
                </div>
              )}
              {m.rip && <div style={{ marginTop:6, fontSize:"0.85rem" }}>🪔</div>}
              {!m.rip && !m.rip && m.year && (
                <div style={{ position:"absolute", bottom:8, right:8, width:7, height:7, borderRadius:"50%", background:C.green, boxShadow:`0 0 4px ${C.green}` }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: LINEAGE TABLE — merged cells, Excel style
// Columns: Sr | Descendant/Child | Self/Parent | Father(anc_0) | Grandfather(anc_1) | ...
//
// Row layout (matching screenshot):
//  Sr | Descendant | Self/Parent     | anc_0       | anc_1      | anc_2
//  1  | Dhruv      | Sanjay (merged) | Gunvantbhai | Laxmichand | Hargovind
//  2  | Hetavi     | ↑               | (merged)    | (merged)   | (merged)
//  3  | —          | Nikesh          | ↑           | ↑          | ↑
//  4  | —          | Parul           | ↑           | ↑          | ↑
//  5  | —          | —               | Shantilal   | ↑          | ↑
//  6  | —          | —               | Harilala    | ↑          | ↑
//
// ancestors array = [father, grandfather, great-gf, ...]  (index 0 = father)
// ─────────────────────────────────────────────────────────────────────────────
function LineageView({ treeData }) {
  const spouses  = treeData.spouses  || {};
  const siblings = treeData.siblings || {};
  console.log("🌳 FIRESTORE TREE DATA:", JSON.stringify(treeData, null, 2));

  const ancestors = (treeData.ancestors||[]).filter(a=>a?.name);
  const descs     = (treeData.descendants||[]).filter(d=>d?.name);

  const ancSpouse  = (i) => { const s=spouses["anc_"+i]; return s?.name?s:null; };
  const selfSpouse = spouses["self"]?.name ? spouses["self"] : null;
  const descSpouse = (i) => { const s=spouses["desc_"+i]; return s?.name?s:null; };

  // ── Build flat row list ───────────────────────────────────────────────────
  // Each row: { desc, self, ancs[] }
  // desc  = { name, gender, spouse? } | null
  // self  = { name, gender, spouse?, isYou? } | null
  // ancs  = array of length ancestors.length, each { name, gender, spouse? } | null

  const rows = [];

  // Descendants + their siblings
  descs.forEach((d, di) => {
    const dSp = descSpouse(di);
    // Desc row: desc=d, self=YOU, ancs=[anc_0, anc_1, ...]
    rows.push({
      desc: { name:d.name, gender:d.gender, spouse:dSp },
      self: { name:treeData.self?.name, gender:treeData.self?.gender, spouse:selfSpouse, isYou:true },
      ancs: ancestors.map((_,i) => { const sp=ancSpouse(i); return { name:ancestors[i].name, gender:ancestors[i].gender, spouse:sp }; }),
    });
    // Siblings of this desc → appear in Descendant col, same self+ancs as desc row
    [...(siblings["desc_"+di]?.elder||[]),...(siblings["desc_"+di]?.younger||[])]
      .filter(s=>s?.name)
      .forEach(sib => {
        rows.push({
          desc: { name:sib.name, gender:sib.gender, spouse:null },
          self: { name:treeData.self?.name, gender:treeData.self?.gender, spouse:selfSpouse, isYou:true },
          ancs: ancestors.map((_,i) => { const sp=ancSpouse(i); return { name:ancestors[i].name, gender:ancestors[i].gender, spouse:sp }; }),
        });
      });
  });

  // No descendants — show YOU
  if (descs.length === 0) {
    rows.push({
      desc: null,
      self: { name:treeData.self?.name, gender:treeData.self?.gender, spouse:selfSpouse, isYou:true },
      ancs: ancestors.map((_,i) => { const sp=ancSpouse(i); return { name:ancestors[i].name, gender:ancestors[i].gender, spouse:sp }; }),
    });
  }

  // Siblings of YOU
  [...(siblings["self"]?.elder||[]),...(siblings["self"]?.younger||[])]
    .filter(s=>s?.name)
    .forEach(sib => {
      rows.push({
        desc: null,
        self: { name:sib.name, gender:sib.gender, spouse:null },
        ancs: ancestors.map((_,i) => { const sp=ancSpouse(i); return { name:ancestors[i].name, gender:ancestors[i].gender, spouse:sp }; }),
      });
    });

  // Siblings of ancestors[ancIdx]
  // From the data: siblings["anc_1"] = Shantilal, Harilala (siblings of Laxmichand)
  // Excel shows them in Father col (anc_0 column) — one column LEFT of Laxmichand
  // Rule: sibling of anc_i → displayed in column (i-1), parent = anc_(i+1)
  // Special case: sibling of anc_0 (father) → goes in "Self/Parent" column (self=sib, ancs same)
  ancestors.forEach((anc, ancIdx) => {
    [...(siblings["anc_"+ancIdx]?.elder||[]),...(siblings["anc_"+ancIdx]?.younger||[])]
      .filter(s=>s?.name)
      .forEach(sib => {
        if (ancIdx === 0) {
          // Sibling of father → goes in Self/Parent column, same ancs as YOU
          rows.push({
            desc: null,
            self: { name:sib.name, gender:sib.gender, spouse:null },
            ancs: ancestors.map((_,i) => {
              const sp = ancSpouse(i);
              return { name:ancestors[i].name, gender:ancestors[i].gender, spouse:sp };
            }),
          });
        } else {
          // Sibling of anc_i → goes in column (i-1), cols 0..i-2 = null, col i-1 = sib, cols i+ = ancestors
          rows.push({
            desc: null,
            self: null,
            ancs: ancestors.map((_,i) => {
              if (i < ancIdx - 1)  return null;
              if (i === ancIdx - 1) return { name:sib.name, gender:sib.gender, spouse:null, isSib:true };
              const sp = ancSpouse(i);
              return { name:ancestors[i].name, gender:ancestors[i].gender, spouse:sp };
            }),
          });
        }
      });
  });

  // ── Compute rowSpan for each column ──────────────────────────────────────
  // For a given column accessor fn, compute how many consecutive rows share same name
  const spanMap = {}; // key: "col_ri" → span count (1 = no merge, 0 = skip/merged)

  const computeSpans = (colKey, getName) => {
    let ri = 0;
    while (ri < rows.length) {
      const name = getName(rows[ri]);
      if (!name) { spanMap[colKey+"_"+ri] = 1; ri++; continue; }
      let span = 1;
      while (ri+span < rows.length && getName(rows[ri+span]) === name) span++;
      spanMap[colKey+"_"+ri] = span;
      for (let k=1;k<span;k++) spanMap[colKey+"_"+(ri+k)] = 0; // 0 = skip
      ri += span;
    }
  };

  computeSpans("self", r => r.self?.name || null);
  ancestors.forEach((_, i) => computeSpans("anc"+i, r => r.ancs[i]?.name || null));

  // ── Cell renderer ─────────────────────────────────────────────────────────
  const Cell = ({ data, isYou }) => {
    if (!data?.name) return <span style={{color:"#C0A0A0",fontSize:"0.75rem"}}>—</span>;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:2}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontSize:"0.82rem"}}>{data.gender==="F"?"👩":"👨"}</span>
          <span style={{fontFamily:"'Playfair Display',serif",fontWeight:isYou?700:600,color:isYou?"#5A1020":"#7B1C2E",fontSize:"0.8rem"}}>
            {data.name}
          </span>
          {isYou && <span style={{fontSize:"0.42rem",background:"#C9A84C",color:"#fff",padding:"1px 5px",borderRadius:3,fontWeight:700,fontFamily:"monospace"}}>YOU</span>}
        </div>
        {data.spouse?.name && <>
          <div style={{height:1,background:"#f0d0d0",margin:"1px 4px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:"0.72rem"}}>{data.spouse.gender==="F"?"👩":"👨"}</span>
            <span style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",color:"#9B2335",fontSize:"0.72rem"}}>{data.spouse.name}</span>
          </div>
        </>}
      </div>
    );
  };

  const TH = ({children}) => (
    <th style={{padding:"8px 12px",background:"#5A1020",color:"#F0D080",fontSize:"0.58rem",fontFamily:"monospace",fontWeight:700,letterSpacing:"0.08em",textAlign:"left",borderRight:"1px solid rgba(240,208,128,0.15)",borderBottom:"2px solid #C9A84C",whiteSpace:"nowrap"}}>
      {children}
    </th>
  );

  const ancHeaders = ["Father\n(anc_0 / Brother)","Grandfather\n(anc_1)","Great-GF\n(anc_2)","Great²-GF","Great³-GF"];

  return (
    <div style={{overflowX:"auto",padding:"16px 0 40px"}}>
      <div style={{padding:"0 14px 10px",fontSize:"0.6rem",color:"#C0A0A0",fontFamily:"monospace"}}>
        📜 Lineage Table · cells merge vertically when value repeats
      </div>
      <table style={{borderCollapse:"collapse",fontFamily:"monospace",fontSize:"0.75rem",background:"#fff",minWidth:"max-content"}}>
        <thead>
          <tr>
            <TH>Sr. No.</TH>
            <TH>Descendant{"\n"}/ Child</TH>
            <TH>Self /{"\n"}Parent</TH>
            {ancestors.map((_,i) => <TH key={i}>{ancHeaders[i]||`Anc ${i}`}</TH>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const selfSpanVal = spanMap["self_"+ri];
            return (
              <tr key={ri} style={{background:ri%2===0?"#fff":"#FDFAF5"}}>
                {/* Sr No */}
                <td style={{padding:"8px 10px",borderRight:"1px solid #f0e6e6",borderBottom:"1px solid #f0e6e6",color:"#C0A0A0",textAlign:"center",fontSize:"0.65rem",minWidth:36}}>
                  {ri+1}
                </td>
                {/* Descendant */}
                <td style={{padding:"8px 10px",borderRight:"1px solid #f0e6e6",borderBottom:"1px solid #f0e6e6",minWidth:100,verticalAlign:"middle"}}>
                  <Cell data={row.desc} />
                </td>
                {/* Self/Parent — merged */}
                {selfSpanVal > 0 && (
                  <td rowSpan={selfSpanVal} style={{padding:"8px 10px",borderRight:"1px solid #f0e6e6",borderBottom:"1px solid #f0e6e6",minWidth:110,verticalAlign:"middle",background:row.self?.isYou?"#FDF6EC":"inherit"}}>
                    <Cell data={row.self} isYou={row.self?.isYou} />
                  </td>
                )}
                {/* Ancestor columns — merged */}
                {ancestors.map((_,i) => {
                  const spanVal = spanMap["anc"+i+"_"+ri];
                  if (spanVal === 0) return null;
                  return (
                    <td key={i} rowSpan={spanVal} style={{padding:"8px 10px",borderRight:"1px solid #f0e6e6",borderBottom:"1px solid #f0e6e6",minWidth:130,verticalAlign:"middle"}}>
                      <Cell data={row.ancs[i]} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE DETAIL PANEL
// ─────────────────────────────────────────────────────────────────────────────
function NodePanel({ node, onClose, onEdit }) {
  const age = node.year ? new Date().getFullYear()-parseInt(node.year) : null;
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.white, borderTop:`2px solid ${C.gold}`, borderRadius:"16px 16px 0 0", padding:"16px 20px 32px", boxShadow:`0 -8px 32px rgba(90,16,32,0.12)`, animation:"fadeUp 0.22s ease", zIndex:100 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:node.gender==="F"?"#FFF0F3":C.goldFaint, border:`2px solid ${node.gender==="F"?C.primaryLight:C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem" }}>
            {node.type==="spouse"?"♥":node.gender==="F"?"👩":"👨"}
          </div>
          <div>
            <div style={{ fontFamily:serif, fontSize:"1.1rem", color:C.primaryDark, fontWeight:700 }}>
              {node.name} {node.rip&&"🪔"}
            </div>
            <div style={{ fontSize:"0.62rem", color:C.textMuted, fontFamily:mono, marginTop:2 }}>
              {node.relation&&<span style={{ marginRight:8 }}>🔗 {node.relation}</span>}
              {node.year&&<span>📅 b.{node.year}</span>}
              {age&&<span style={{ marginLeft:8 }}>· {age} yrs</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", color:C.textMuted, padding:4 }}>✕</button>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        <Tag label={node.gender==="F"?"Female":"Male"} color={node.gender==="F"?C.primaryLight:C.primary} />
        {node.type&&<Tag label={node.type} color={C.gold} />}
        {node.rip
          ? <Tag label="Deceased" color={C.textSecondary} />
          : <Tag label="Living" color={C.green} />
        }
      </div>

      <div onClick={onEdit} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:C.goldFaint, border:`1px solid ${C.gold}40`, borderRadius:10, cursor:"pointer" }}>
        <span style={{ fontSize:"1rem" }}>✏️</span>
        <div>
          <div style={{ fontSize:"0.72rem", fontWeight:700, color:C.primary, fontFamily:mono }}>Edit Tree</div>
          <div style={{ fontSize:"0.6rem", color:C.textSecondary, fontFamily:mono }}>Details update કરવા Wizard ખોલો</div>
        </div>
        <span style={{ marginLeft:"auto", color:C.textMuted }}>›</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function findNodeById(root, id) {
  if (!root) return null;
  if (root.id === id) return root;
  for (const c of root.children||[]) { const f=findNodeById(c,id); if(f) return f; }
  for (const s of root.siblings||[]) { if(s.id===id) return s; }
  if (root.spouse?.id===id) return root.spouse;
  return null;
}

function Tag({ label, color }) {
  return (
    <span style={{ fontSize:"0.6rem", padding:"2px 8px", borderRadius:10, border:`1px solid ${color}30`, background:color+"15", color, fontFamily:mono }}>
      {label}
    </span>
  );
}

function Btn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding:"10px 24px", background:C.primary, color:"#fff", border:"none", borderRadius:10, fontSize:"0.88rem", fontWeight:700, cursor:"pointer", fontFamily:mono }}>
      {children}
    </button>
  );
}

function Center({ children }) {
  return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:C.bg, padding:24, gap:12, textAlign:"center", fontFamily:mono }}>
      {children}
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700&display=swap');
      @keyframes spin    { to { transform:rotate(360deg); } }
      @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
      @keyframes flicker { 0%,100%{opacity:1} 40%{opacity:0.7} 60%{opacity:0.9} }
      * { box-sizing: border-box; }
      ::-webkit-scrollbar { width:4px; height:4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #C9A84C40; border-radius:4px; }
      @media (max-width: 380px) { .view-label { display: none; } }
    `}</style>
  );
}