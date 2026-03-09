// pages/VanshVriksha/steps/CousinsStep.jsx — Step 7

import { useState } from "react";
import { VSC } from "../../../constants/vanshConstants";

const mono = "'JetBrains Mono', monospace";

export default function CousinsStep({ cousins, onToggle, onAdd }) {
  const [name, setName] = useState("");
  const [rel,  setRel]  = useState("cousin");
  const [show, setShow] = useState(false);

  const handleAdd = () => {
    if(!name.trim()) return;
    onAdd({name:name.trim(),gender:"M",relation:rel||"cousin",selected:true});
    setName(""); setRel("cousin"); setShow(false);
  };

  return (
    <div style={{ padding:"16px 14px 100px", background: VSC.bg, minHeight:"100%" }}>
      <StepBadge>Step 7 of 8</StepBadge>
      <h2 style={h2}>કઝિન્સ</h2>
      <p style={sub}>ચાચા/માસા/ફઈ/મામા ના સંતાનો — select કરો અથવા નવા ઉમેરો</p>
      <InfoBox>💡 ભવિષ્યમાં Firebase login પછી automatically suggest થશે.</InfoBox>

      {cousins.length===0&&<p style={{textAlign:"center",color:VSC.dim,fontSize:"0.78rem",padding:"16px 0"}}>// cousins.length === 0</p>}

      {cousins.map((c,i)=>(
        <div key={i} onClick={()=>onToggle(i)} style={{
          display:"flex",alignItems:"center",gap:10,
          background:c.selected?`${VSC.kwColor}08`:"#fff",
          border:`1.5px solid ${c.selected?VSC.kwColor:VSC.border}`,
          borderRadius:10,padding:"11px 14px",cursor:"pointer",marginBottom:6,
          transition:"all 0.15s",
        }}>
          <span style={{fontSize:"1.1rem"}}>{c.gender==="F"?"👩":"👨"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:"0.88rem",fontWeight:600,color:VSC.text}}>{c.name}</div>
            <div style={{fontSize:"0.62rem",color:VSC.dim}}>{c.relation}</div>
          </div>
          <div style={{
            width:18,height:18,borderRadius:4,
            border:`1.5px solid ${c.selected?VSC.kwColor:VSC.border}`,
            background:c.selected?VSC.kwColor:"#fff",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"0.65rem",color:"#fff",
          }}>{c.selected?"✓":""}</div>
        </div>
      ))}

      {show?(
        <div style={{background:"#fff",border:`1.5px solid ${VSC.gold}`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
          <input autoFocus type="text" value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleAdd()}
            placeholder="Cousin નું નામ"
            style={{...inp,marginBottom:8}}/>
          <input type="text" value={rel} onChange={e=>setRel(e.target.value)}
            placeholder="સંબંધ (દા.ત. ચાચા ના પુત્ર)"
            style={{...inp,marginBottom:10}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShow(false)} style={cancelBtn}>Cancel</button>
            <button onClick={handleAdd} style={addBtn}>➕ ઉમેરો</button>
          </div>
        </div>
      ):(
        <button onClick={()=>setShow(true)} style={addMoreBtn}>➕ નવો Cousin ઉમેરો</button>
      )}

      {cousins.some(c=>c.name)&&(
        <>
          <Divider>Join Requests</Divider>
          {cousins.filter(c=>c.name).map((c,i)=>(
            <div key={i} style={{background:"#fff",border:`1.5px solid ${VSC.border}`,borderLeft:`3px solid ${VSC.kwColor}`,borderRadius:10,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:"1rem"}}>{c.gender==="F"?"👩":"👨"}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.82rem",fontWeight:600,color:VSC.text}}>{c.name}</div>
                <div style={{fontSize:"0.6rem",color:VSC.dim}}>Join request pending</div>
              </div>
              <span style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:8,border:`1px solid ${VSC.border}`,color:VSC.dim}}>⏳ Pending</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const h2  = {fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",color:VSC.text,marginBottom:4};
const sub = {fontSize:"0.78rem",color:VSC.dim,marginBottom:16,lineHeight:1.5};
const inp = {width:"100%",background:"#fff",border:`1.5px solid ${VSC.border}`,borderRadius:8,padding:"9px 12px",color:VSC.text,fontSize:16,fontFamily:"'Lato',sans-serif",outline:"none",display:"block"};
const addMoreBtn = {width:"100%",padding:11,background:"none",border:`1.5px dashed ${VSC.border}`,borderRadius:10,color:VSC.dim,fontSize:"0.82rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:"'Lato',sans-serif",marginBottom:12};
const cancelBtn = {flex:1,padding:"9px 0",background:"rgba(90,16,32,0.06)",border:"none",borderRadius:8,color:VSC.textSecondary,fontSize:"0.82rem",cursor:"pointer",fontFamily:"'Lato',sans-serif"};
const addBtn = {flex:1,padding:"9px 0",background:VSC.kwColor,border:"none",borderRadius:8,color:"#fff",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"'Lato',sans-serif"};
function InfoBox({children}){return<div style={{background:`${VSC.kwColor}08`,border:`1px solid ${VSC.border}`,borderLeft:`3px solid ${VSC.gold}`,borderRadius:8,padding:"9px 12px",marginBottom:14,fontSize:"0.75rem",color:VSC.textSecondary,lineHeight:1.6}}>{children}</div>;}
function Divider({children}){return<div style={{display:"flex",alignItems:"center",gap:8,margin:"14px 0 10px"}}><div style={{flex:1,height:1,background:VSC.border}}/><span style={{fontSize:"0.65rem",color:VSC.dim,fontFamily:mono}}>{children}</span><div style={{flex:1,height:1,background:VSC.border}}/></div>;}
function StepBadge({children}){return<span style={{display:"inline-block",fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.12em",padding:"3px 10px",borderRadius:20,background:`${VSC.kwColor}12`,color:VSC.kwColor,marginBottom:10,fontFamily:mono}}>{children}</span>;}
