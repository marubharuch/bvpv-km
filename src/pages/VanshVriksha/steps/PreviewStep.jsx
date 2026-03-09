// pages/VanshVriksha/steps/PreviewStep.jsx — Step 4

import VscRow from "../../../components/vansh/VscRow";
import { VSC } from "../../../constants/vanshConstants";

export default function PreviewStep({ self, ancestors, descendants }) {
  const ancs  = [...ancestors].filter(a=>a.name).reverse();
  const descs = descendants.filter(d=>d.name);
  const total = ancs.length + 1 + descs.length;
  const rows  = [];

  ancs.forEach((anc,i)=>{
    const isLast = i===ancs.length-1;
    const guides = [];
    for(let j=0;j<i;j++) guides.push({type:"vl"});
    if(i>0) guides.push({type: isLast&&descs.length===0?"last":"conn"});
    rows.push(<VscRow key={"anc_"+i} node={{...anc,type:"anc"}} guides={guides} hasChildren={false} />);
  });

  const youGuides=[];
  for(let j=0;j<ancs.length-1;j++) youGuides.push({type:"vl"});
  if(ancs.length>0) youGuides.push({type:descs.length>0?"conn":"last"});
  rows.push(<VscRow key="self"
    node={{name:self.name,gender:self.gender,year:self.year,type:"you",relation:"YOU"}}
    guides={youGuides} hasChildren={false} />);

  descs.forEach((desc,i)=>{
    const isLast=i===descs.length-1;
    const guides=[];
    for(let j=0;j<ancs.length;j++) guides.push({type:"vl"});
    guides.push({type:isLast?"last":"conn"});
    rows.push(<VscRow key={"desc_"+i} node={{...desc,type:"child"}} guides={guides} hasChildren={false} />);
  });

  return (
    <div style={{ padding:"16px 14px 100px", background: VSC.bg, minHeight:"100%" }}>
      <StepBadge>Step 4 of 8</StepBadge>
      <h2 style={h2}>તમારી ઊભી શાખા</h2>
      <p style={sub}>અત્યાર સુધી ભેગી થયેલી માહિતી — vertical tree</p>

      <div style={{
        background:"#fff", border:`1.5px solid ${VSC.border}`,
        borderRadius:12, overflow:"hidden",
        boxShadow:"0 2px 10px rgba(90,16,32,0.06)",
      }}>
        <div style={{
          background:`linear-gradient(135deg,#5A1020,#7B1C2E)`,
          padding:"8px 14px", display:"flex", alignItems:"center", gap:6,
          borderBottom:`1px solid ${VSC.border}`,
        }}>
          <span style={{fontSize:"0.72rem",color:"rgba(240,208,128,0.8)",fontFamily:"'JetBrains Mono',monospace"}}>
            📄 family-chain.json
          </span>
          <span style={{marginLeft:"auto",fontSize:"0.6rem",color:"rgba(240,208,128,0.45)",fontFamily:"'JetBrains Mono',monospace"}}>
            read-only
          </span>
        </div>
        {total===0
          ? <div style={{padding:20,textAlign:"center",fontSize:"0.75rem",color:VSC.dim,fontFamily:"'JetBrains Mono',monospace"}}>
              // no members added yet
            </div>
          : <div>{rows}</div>
        }
      </div>
    </div>
  );
}

const h2  = { fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", color: VSC.text, marginBottom:4 };
const sub = { fontSize:"0.78rem", color: VSC.dim, marginBottom:16, lineHeight:1.5 };
const mono = "'JetBrains Mono', monospace";
function StepBadge({children}) {
  return <span style={{display:"inline-block",fontSize:"0.68rem",fontWeight:700,
    letterSpacing:"0.12em",padding:"3px 10px",borderRadius:20,
    background:`${VSC.kwColor}12`,color:VSC.kwColor,marginBottom:10,fontFamily:mono
  }}>{children}</span>;
}
