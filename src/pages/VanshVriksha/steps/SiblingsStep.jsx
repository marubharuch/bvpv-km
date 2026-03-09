// pages/VanshVriksha/steps/SiblingsStep.jsx — Step 6

import { useState, useCallback } from "react";
import BranchCard from "../../../components/vansh/BranchCard";
import { VSC } from "../../../constants/vanshConstants";

const mono = "'JetBrains Mono', monospace";

export default function SiblingsStep({ getVerticalMembers, siblings, onSetSiblingsFor }) {
  const members = getVerticalMembers();
  const [selectedId,   setSelectedId]   = useState(null);
  const [elderCount,   setElderCount]   = useState(0);
  const [youngerCount, setYoungerCount] = useState(0);
  const [elderList,    setElderList]    = useState([]);
  const [youngerList,  setYoungerList]  = useState([]);

  const selectMember = useCallback(id => {
    setSelectedId(id);
    const saved = siblings[id]||{elder:[],younger:[]};
    setElderCount(saved.elder.length||0);
    setYoungerCount(saved.younger.length||0);
    setElderList(saved.elder||[]);
    setYoungerList(saved.younger||[]);
  }, [siblings]);

  const save = () => {
    if(!selectedId) return;
    onSetSiblingsFor(selectedId, {
      elder:   elderList.slice(0,elderCount),
      younger: youngerList.slice(0,youngerCount),
    });
    showToast("✓ "+members.find(m=>m.id===selectedId)?.name+" ના ભાઈ-બહેન સાચવ્યા");
  };

  const selected = members.find(m=>m.id===selectedId);

  return (
    <div style={{ padding:"16px 14px 100px", background: VSC.bg, minHeight:"100%" }}>
      <StepBadge>Step 6 of 8</StepBadge>
      <h2 style={h2}>ભાઈ-બહેન</h2>
      <p style={sub}>Vertical line ના દરેક સભ્ય માટે ભાઈ-બહેન ભરો</p>

      {/* Node chips */}
      <div style={{fontSize:"0.65rem",color:VSC.kwColor,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,fontFamily:mono}}>
        સભ્ય પસંદ કરો
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {members.map(m=>{
          const hasSibs = siblings[m.id]&&((siblings[m.id].elder||[]).some(s=>s.name)||(siblings[m.id].younger||[]).some(s=>s.name));
          const isActive = m.id===selectedId;
          return (
            <button key={m.id} onClick={()=>selectMember(m.id)} style={{
              display:"inline-flex",alignItems:"center",gap:5,
              padding:"6px 12px",borderRadius:20,cursor:"pointer",
              border:`1.5px solid ${isActive?VSC.kwColor:m.isYou?VSC.gold:VSC.border}`,
              background:isActive?`${VSC.kwColor}10`:m.isYou?VSC.goldFaint:"#fff",
              color:isActive?VSC.kwColor:m.isYou?VSC.goldDark:VSC.text,
              fontSize:"0.75rem",fontWeight:isActive?700:400,
              transition:"all 0.15s",
            }}>
              {m.gender==="F"?"👩":"👨"} {m.name}
              {hasSibs&&<span style={{width:6,height:6,borderRadius:"50%",background:VSC.green,display:"inline-block"}}/>}
            </button>
          );
        })}
      </div>

      {!selectedId&&<p style={{textAlign:"center",color:VSC.dim,fontSize:"0.78rem",padding:"20px 0"}}>⬆️ ઉપરથી સભ્ય પસંદ કરો</p>}

      {selectedId&&selected&&(
        <>
          {/* Banner */}
          <div style={{
            display:"flex",alignItems:"center",gap:8,
            background:`${VSC.kwColor}08`, border:`1.5px solid ${VSC.gold}`,
            borderRadius:10,padding:"9px 14px",marginBottom:14,
          }}>
            <span style={{fontSize:"1.2rem"}}>{selected.gender==="F"?"👩":"👨"}</span>
            <div>
              <div style={{fontSize:"0.9rem",fontWeight:700,color:VSC.text}}>{selected.name}</div>
              <div style={{fontSize:"0.6rem",color:VSC.dim,fontFamily:mono}}>{selected.isYou?"📍 YOU":selected.relation}</div>
            </div>
            {(elderList.some(s=>s.name)||youngerList.some(s=>s.name))&&
              <span style={{marginLeft:"auto",fontSize:"0.6rem",padding:"2px 8px",borderRadius:8,background:"rgba(46,125,82,0.1)",border:"1px solid #6a9955",color:"#2E7D32"}}>✓ ભર્યું</span>}
          </div>

          <SibSection label="મોટા ભાઈ-બહેન" count={elderCount} onCountChange={setElderCount}
            list={elderList} onUpdate={(i,v)=>{const n=[...elderList];n[i]=v;setElderList(n);}} prefix="elder"/>
          <SibSection label="નાના ભાઈ-બહેન" count={youngerCount} onCountChange={setYoungerCount}
            list={youngerList} onUpdate={(i,v)=>{const n=[...youngerList];n[i]=v;setYoungerList(n);}} prefix="younger"/>

          <button onClick={save} style={{
            width:"100%",padding:11,marginTop:8,
            background:`linear-gradient(135deg,${VSC.gold},${VSC.goldBright})`,
            border:"none",borderRadius:10,color:"#4a0f1a",
            fontSize:"0.88rem",fontWeight:700,cursor:"pointer",
            fontFamily:"'Lato',sans-serif",
          }}>✓ સાચવો</button>
        </>
      )}
    </div>
  );
}

function SibSection({ label, count, onCountChange, list, onUpdate, prefix }) {
  return (
    <>
      <Divider>{label}</Divider>
      <div style={{display:"flex",alignItems:"center",gap:8,background:"#fff",border:`1.5px solid ${VSC.border}`,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
        <div style={{flex:1,fontSize:"0.82rem",color:VSC.text}}>કેટલા <strong>{prefix==="elder"?"મોટા":"નાના"}</strong>?</div>
        <button onClick={()=>onCountChange(c=>Math.max(0,c-1))} style={cBtn}>−</button>
        <div style={{fontSize:"1rem",fontWeight:700,color:VSC.kwColor,minWidth:24,textAlign:"center"}}>{count}</div>
        <button onClick={()=>onCountChange(c=>c+1)} style={cBtn}>+</button>
      </div>
      {Array.from({length:count}).map((_,i)=>(
        <BranchCard key={i} relation={`${prefix==="elder"?"મોટા":"નાના"} ભાઈ/બહેન [${i+1}]`}
          value={list[i]||{}} onChange={v=>onUpdate(i,v)} />
      ))}
    </>
  );
}

function Divider({children}){
  return <div style={{display:"flex",alignItems:"center",gap:8,margin:"14px 0 10px"}}>
    <div style={{flex:1,height:1,background:VSC.border}}/>
    <span style={{fontSize:"0.65rem",color:VSC.dim,fontFamily:mono}}>{children}</span>
    <div style={{flex:1,height:1,background:VSC.border}}/>
  </div>;
}

const h2  = { fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", color: VSC.text, marginBottom:4 };
const sub = { fontSize:"0.78rem", color: VSC.dim, marginBottom:16, lineHeight:1.5 };
const cBtn = { width:28,height:28,borderRadius:8,border:`1.5px solid ${VSC.border}`,background:"#fff",color:VSC.text,fontSize:"1rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" };
function StepBadge({children}){return<span style={{display:"inline-block",fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.12em",padding:"3px 10px",borderRadius:20,background:`${VSC.kwColor}12`,color:VSC.kwColor,marginBottom:10,fontFamily:mono}}>{children}</span>;}
function showToast(msg){const t=document.createElement("div");t.style.cssText=`position:fixed;bottom:75px;left:50%;transform:translateX(-50%);background:#fff;border:1.5px solid ${VSC.gold};color:${VSC.kwColor};padding:7px 16px;border-radius:18px;font-size:0.75rem;z-index:300;pointer-events:none;white-space:nowrap;box-shadow:0 2px 10px rgba(90,16,32,0.15);font-family:'Lato',sans-serif;`;t.textContent=msg;document.body.appendChild(t);setTimeout(()=>{t.style.opacity="0";t.style.transition="opacity 0.3s";setTimeout(()=>t.remove(),300);},1800);}
