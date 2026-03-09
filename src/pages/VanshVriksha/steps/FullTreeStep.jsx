// pages/VanshVriksha/steps/FullTreeStep.jsx — Step 8

import { useState, useCallback } from "react";
import VscRow from "../../../components/vansh/VscRow";
import { VSC } from "../../../constants/vanshConstants";

export default function FullTreeStep({ self, ancestors, descendants, spouses, siblings, cousins, getAllMembers }) {
  const [expanded, setExpanded] = useState(new Set(["self"]));
  const [selId,    setSelId]    = useState(null);

  const toggle = useCallback(id => setExpanded(prev => {
    const next = new Set(prev); next.has(id)?next.delete(id):next.add(id); return next;
  }), []);
  const select = useCallback(id => setSelId(id), []);

  const allM  = getAllMembers();
  const males = allM.filter(m=>m.gender==="M").length;
  const fems  = allM.filter(m=>m.gender==="F").length;
  const ancsN = ancestors.filter(a=>a.name).length;
  const descN = descendants.filter(d=>d.name).length;

  const root = buildTree(self, ancestors, descendants, spouses, siblings);
  const rows = renderNode(root, [], null, expanded, selId, toggle, select);

  return (
    <div style={{ paddingBottom:80 }}>
      {/* Stats */}
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${VSC.border}`}}>
        {[{n:allM.length,l:"Total"},{n:ancsN,l:"Ancestors"},{n:descN,l:"Children"},{n:males,l:"Male"},{n:fems,l:"Female"}].map((s,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 4px",borderRight:i<4?`1px solid ${VSC.border}`:"none"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",color:VSC.kwColor,fontWeight:700}}>{s.n}</div>
            <div style={{fontSize:"0.52rem",color:VSC.dim,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:1}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Explorer header */}
      <div style={{
        display:"flex",alignItems:"center",gap:6,
        padding:"7px 14px", background:VSC.sidebar,
        borderBottom:`1px solid rgba(201,168,76,0.3)`,
        fontSize:"0.6rem",color:"rgba(240,208,128,0.7)",
        letterSpacing:"0.12em",textTransform:"uppercase",
        fontFamily:"'JetBrains Mono',monospace",
      }}>
        <span>📁</span> EXPLORER — vansh-vriksha
        <button onClick={()=>setExpanded(new Set(["self"]))} style={{
          marginLeft:"auto",fontSize:"0.6rem",color:"rgba(240,208,128,0.6)",
          padding:"2px 6px",borderRadius:2,border:"none",
          background:"rgba(255,255,255,0.08)",cursor:"pointer",
          fontFamily:"'JetBrains Mono',monospace",
        }}>⊟ collapse all</button>
      </div>

      {/* Tree rows */}
      <div style={{background:VSC.bg}}>{rows}</div>

      {/* Cousins */}
      {cousins.filter(c=>c.name).length>0&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:VSC.sidebar,borderTop:`1px solid rgba(201,168,76,0.2)`,borderBottom:`1px solid rgba(201,168,76,0.2)`,fontSize:"0.58rem",color:"rgba(240,208,128,0.7)",fontFamily:"'JetBrains Mono',monospace"}}>
            🤝 COUSINS
          </div>
          {cousins.filter(c=>c.name).map((c,i)=>(
            <VscRow key={"c_"+i} node={{...c,type:"sib",id:"cousin_"+i}}
              guides={[{type:"last"}]} hasChildren={false}
              isSelected={selId==="cousin_"+i} onSelect={()=>select("cousin_"+i)} />
          ))}
        </>
      )}
    </div>
  );
}

function buildTree(self, ancestors, descendants, spouses, siblings) {
  const ancs  = ancestors.filter(a=>a.name);
  const descs = descendants.filter(d=>d.name);
  const getSibsFor = id => {
    if(!siblings||!siblings[id]) return [];
    return [...(siblings[id].elder||[]),...(siblings[id].younger||[])].filter(x=>x.name)
      .map((x,i)=>({...x,id:id+"_sib"+i,type:"sib",spouse:null,siblings:[],children:[]}));
  };
  const selfNode = {
    id:"self",name:self.name,gender:self.gender,year:self.year,rip:false,
    relation:"YOU",type:"you",spouse:spouses["self"]||null,
    siblings:getSibsFor("self"),_childCount:descs.length,
    children:descs.map((d,i)=>({
      id:"desc"+i,name:d.name,gender:d.gender,year:d.year,rip:d.rip,
      relation:d.relation,type:"child",spouse:spouses["desc_"+d.relation]||null,
      siblings:[],children:[],
    })),
  };
  let cur = selfNode;
  ancs.forEach((anc,i)=>{
    cur = {
      id:"anc"+i,name:anc.name,gender:anc.gender,year:anc.year,rip:anc.rip,
      relation:anc.relation,type:"anc",spouse:spouses["anc_"+anc.relation]||null,
      siblings:getSibsFor("anc_"+i),children:[cur],_childCount:1,
    };
  });
  return cur;
}

function renderNode(node, guides, parentNode, expanded, selId, toggle, select) {
  if(!node) return [];
  const rows = [];
  const hasCh = node.children&&node.children.length>0;
  const isOpen = expanded.has(node.id);

  rows.push(<VscRow key={"r_"+node.id} node={node} guides={guides}
    hasChildren={hasCh} isOpen={isOpen}
    onToggle={()=>toggle(node.id)} onSelect={()=>select(node.id)}
    isSelected={selId===node.id} />);

  if(node.spouse&&node.spouse.name)
    rows.push(<VscRow key={"sp_"+node.id}
      node={{...node.spouse,id:node.id+"_sp",type:"spouse",relation:"♥ spouse"}}
      guides={guides.map(g=>({...g}))} hasChildren={false}
      isSelected={selId===node.id+"_sp"} onSelect={()=>select(node.id+"_sp")} />);

  (node.siblings||[]).forEach((sib,si)=>{
    const sibIsLast=si===node.siblings.length-1;
    const sg=guides.map(g=>g.type==="conn"?{type:"vl"}:g.type==="last"?{type:"blank"}:{...g});
    sg.push({type:sibIsLast?"last":"conn"});
    rows.push(<VscRow key={"sib_"+sib.id} node={sib} guides={sg} hasChildren={false}
      isSelected={selId===sib.id} onSelect={()=>select(sib.id)} />);
  });

  if(hasCh&&isOpen)
    node.children.forEach((child,ci)=>{
      const cg=guides.map(g=>g.type==="conn"?{type:"vl"}:g.type==="last"?{type:"blank"}:{...g});
      cg.push({type:ci===node.children.length-1?"last":"conn"});
      rows.push(...renderNode(child,cg,node,expanded,selId,toggle,select));
    });

  return rows;
}
