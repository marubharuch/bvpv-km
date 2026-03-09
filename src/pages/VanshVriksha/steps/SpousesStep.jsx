// pages/VanshVriksha/steps/SpousesStep.jsx — Step 5

import BranchCard from "../../../components/vansh/BranchCard";
import { VSC } from "../../../constants/vanshConstants";

const mono = "'JetBrains Mono', monospace";

export default function SpousesStep({ self, ancestors, descendants, spouses, onSetSpouse }) {
  const members = [
    ...ancestors.filter(a=>a.name).map((a,i)=>({id:"anc_"+i,name:a.name,gender:a.gender,relation:a.relation})),
    {id:"self",name:self.name,gender:self.gender,relation:"YOU"},
    ...descendants.filter(d=>d.name).map((d,i)=>({id:"desc_"+i,name:d.name,gender:d.gender,relation:d.relation})),
  ];

  return (
    <div style={{ padding:"16px 14px 100px", background: VSC.bg, minHeight:"100%" }}>
      <StepBadge>Step 5 of 8</StepBadge>
      <h2 style={h2}>જીવનસાથી</h2>
      <p style={sub}>દરેક સભ્યના જીવનસાથી ઉમેરો</p>

      {members.map(member => {
        const saved  = spouses[member.id]||{};
        const sp     = { gender: member.gender==="M"?"F":"M", ...saved };
        return (
          <div key={member.id} style={{ marginBottom:16 }}>
            <div style={{
              display:"flex", alignItems:"center", gap:6,
              marginBottom:6, padding:"5px 10px",
              background:`${VSC.kwColor}08`,
              borderLeft:`3px solid ${VSC.gold}`,
              borderRadius:"0 8px 8px 0",
            }}>
              <span>{member.gender==="F"?"👩":"👨"}</span>
              <span style={{fontSize:"0.82rem",color:VSC.text,fontWeight:700}}>{member.name}</span>
              <span style={{fontSize:"0.6rem",color:VSC.dim,fontFamily:mono}}>// {member.relation} ♥ spouse</span>
            </div>
            <BranchCard relation="spouse" value={sp}
              onChange={val => val.name ? onSetSpouse(member.id,val) : onSetSpouse(member.id,null)} />
          </div>
        );
      })}
    </div>
  );
}

const h2  = { fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", color: VSC.text, marginBottom:4 };
const sub = { fontSize:"0.78rem", color: VSC.dim, marginBottom:16, lineHeight:1.5 };
function StepBadge({children}) {
  return <span style={{display:"inline-block",fontSize:"0.68rem",fontWeight:700,
    letterSpacing:"0.12em",padding:"3px 10px",borderRadius:20,
    background:`${VSC.kwColor}12`,color:VSC.kwColor,marginBottom:10,fontFamily:mono
  }}>{children}</span>;
}
