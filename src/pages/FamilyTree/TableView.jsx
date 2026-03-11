// pages/FamilyTree/TableView.jsx
import { useState, useEffect, useRef } from 'react';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a', blue:'#1a4f76',
  green:'#2e7d32',
};

const GEN_LABELS = ['Self / Parent','Father','Grandfather','Great-GF',
  '2x Great-GF','3x Great-GF','4x Great-GF','5x Great-GF'];

function Av({ name, type='m', size=26 }) {
  const bg = type==='s'?'#8b5e3c':type==='c'?C.blue:C.maroon;
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:bg,flexShrink:0,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:size*0.42,fontWeight:700,color:'#fff'}}>
      {(name||'?')[0].toUpperCase()}
    </div>
  );
}

function Stat({ num, label, last }) {
  return (
    <div style={{flex:1,textAlign:'center',padding:'10px 4px 8px',
      borderRight:last?'none':`1px solid ${C.border}`}}>
      <div style={{fontSize:18,fontWeight:700,color:C.maroon,lineHeight:1}}>{num}</div>
      <div style={{fontSize:9,fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',
        color:C.muted,marginTop:2}}>{label}</div>
    </div>
  );
}

function PersonCell({ person, nodes, isYoungest, onNameClick }) {
  if (!person) return <span style={{color:'#d6c99a',fontSize:16}}>—</span>;
  const spouses = nodes.filter(n => n.spouseOf === person.id);
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:spouses.length?5:0}}>
        <Av name={person.name} />
        <span onClick={e=>{e.stopPropagation();onNameClick&&onNameClick(person.id);}} style={{
          fontWeight:500,fontSize:13,
          cursor:onNameClick?'pointer':'default',
          color:onNameClick?C.maroon:'inherit',
          textDecoration:onNameClick?'underline dotted':'none',
        }}>
          {person.name}
          {isYoungest&&<span style={{display:'inline-block',background:'#fdebd0',color:'#a04000',
            fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',
            padding:'1px 5px',borderRadius:3,marginLeft:5,verticalAlign:'middle'}}>YOU</span>}
        </span>
      </div>
      {spouses.map(sp=>(
        <div key={sp.id} style={{display:'flex',alignItems:'center',gap:7,paddingLeft:10,marginTop:4}}>
          <Av name={sp.name} type='s'/>
          <span style={{fontWeight:500,fontSize:13,fontStyle:'italic',color:'#8b5e3c'}}>{sp.name}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Mobile Card ── */
function MobileCard({ chain, genCols, nodes, mn, onNameClick, index }) {
  const [open,setOpen]=useState(index<3);
  const leafGen=Math.min(...Object.keys(chain).map(Number));
  const leafNode=chain[leafGen];
  const spouses=leafNode?nodes.filter(n=>n.spouseOf===leafNode.id):[];
  return (
    <div style={{background:C.cream,border:`1.5px solid ${C.border}`,
      borderRadius:10,marginBottom:10,overflow:'hidden',
      boxShadow:'0 2px 8px rgba(60,15,15,0.08)'}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:10,
        padding:'12px 14px',cursor:'pointer',
        background:open?'#fdf5e0':C.cream,
        borderBottom:open?`1px solid ${C.border}`:'none'}}>
        <Av name={leafNode?.name||'?'} size={32}/>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:14,color:C.maroon}}>
            {leafNode?.name||'?'}
            {leafNode?.isYoungest&&<span style={{display:'inline-block',background:'#fdebd0',
              color:'#a04000',fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',
              padding:'1px 5px',borderRadius:3,marginLeft:6,verticalAlign:'middle'}}>YOU</span>}
          </div>
          {spouses.length>0&&<div style={{fontSize:11,color:'#8b5e3c',fontStyle:'italic',marginTop:1}}>
            ∞ {spouses.map(s=>s.name).join(', ')}</div>}
        </div>
        <div style={{fontSize:18,color:C.gold,fontWeight:300}}>{open?'▲':'▼'}</div>
      </div>
      {open&&<div style={{padding:'8px 0'}}>
        {genCols.filter(g=>g>leafGen).map((g,i)=>{
          const person=chain[g];
          const label=GEN_LABELS[g-mn]??`G${g}`;
          const sp2=person?nodes.filter(n=>n.spouseOf===person.id):[];
          return(
            <div key={g} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 14px',
              borderBottom:i<genCols.filter(g2=>g2>leafGen).length-1?`1px solid ${C.border}`:'none',
              background:i%2===0?C.cream:'#faf6e8'}}>
              <div style={{minWidth:80,fontSize:10,fontWeight:700,letterSpacing:'0.8px',
                textTransform:'uppercase',color:C.gold,paddingTop:5,flexShrink:0}}>{label}</div>
              <div style={{flex:1}}>
                {person?(
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      <Av name={person.name} size={24}/>
                      <span onClick={()=>onNameClick&&onNameClick(person.id)} style={{
                        fontWeight:500,fontSize:13,cursor:onNameClick?'pointer':'default',
                        color:onNameClick?C.maroon:'inherit',
                        textDecoration:onNameClick?'underline dotted':'none'}}>{person.name}</span>
                    </div>
                    {sp2.map(sp=>(
                      <div key={sp.id} style={{display:'flex',alignItems:'center',gap:7,paddingLeft:10,marginTop:4}}>
                        <Av name={sp.name} type='s' size={20}/>
                        <span style={{fontSize:12,fontStyle:'italic',color:'#8b5e3c'}}>{sp.name}</span>
                      </div>
                    ))}
                  </div>
                ):<span style={{color:'#d6c99a',fontSize:15}}>—</span>}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}

/* ── Main TableView ── */
export default function TableView({ nodes, onEditPerson, savedRowOrder, onSaveRowOrder, onResetRowOrder, onFlushToFirestore }) {
  const [isMobile] = useState(()=>typeof window!=='undefined'&&window.innerWidth<700);
  const [viewMode,setViewMode] = useState(()=>typeof window!=='undefined'&&window.innerWidth<700?'card':'table');
  const [selected,setSelected] = useState(null);   // {rowIdx, gen}
  const [customOrder,setCustomOrder] = useState(null); // local unsaved order
  const [saveFlash, setSaveFlash] = useState(false); // 'saved' | false
  const flashRef = useRef(null);

  // Load savedRowOrder from Firestore/localStorage on mount or when it changes
  useEffect(()=>{
    if (savedRowOrder) setCustomOrder(savedRowOrder);
  }, [savedRowOrder]);

  const ns=nodes.filter(n=>!n.spouseOf);
  if(ns.length===0) return(
    <div style={{padding:40,textAlign:'center',color:C.muted,fontFamily:"'DM Sans',sans-serif"}}>
      No data to display.
    </div>
  );

  const mn=Math.min(...ns.map(n=>n.gen));
  const mx=Math.max(...ns.map(n=>n.gen));
  const total=nodes.length,ancestors=ns.filter(n=>n.gen>mn).length;
  const children=ns.filter(n=>n.gen<mn).length,gens=mx-mn+1;
  const spouses=nodes.filter(n=>n.spouseOf).length;
  const siblings=ns.filter(n=>n.siblings&&n.siblings.length>0).length;

  const byId=id=>nodes.find(n=>n.id===id);

  const parentOf={};
  ns.forEach(n=>{(n.descendants||[]).forEach(cid=>{if(!parentOf[cid])parentOf[cid]=n.id;});});
  let ch=true;
  while(ch){ch=false;ns.forEach(n=>{if(parentOf[n.id])return;
    const p=(n.siblings||[]).map(sid=>{const s=byId(sid);return s?(s.ancestorId||parentOf[s.id]||null):null;}).find(Boolean);
    if(p){parentOf[n.id]=p;ch=true;}});}

  function chainOf(s){
    const c={};let cur=s;const seen=new Set();
    while(cur&&!seen.has(cur.id)){seen.add(cur.id);c[cur.gen]=cur;
      const nid=cur.ancestorId||parentOf[cur.id];cur=nid?byId(nid):null;}
    return c;
  }

  const hasOwnChildren=id=>{
    const n=byId(id);if(!n)return false;
    if((n.descendants||[]).some(cid=>{const c=byId(cid);return c&&!c.spouseOf;}))return true;
    return ns.some(x=>!x.spouseOf&&parentOf[x.id]===id);
  };

  const leaves=ns.filter(n=>!hasOwnChildren(n.id));
  const startNodes=leaves.length>0?leaves:ns.filter(n=>n.gen===mn);
  const basePaths=startNodes.map(l=>chainOf(l));

  function resolveChainAt(chain,g){
    if(chain[g])return chain[g];
    for(const kg of Object.keys(chain).map(Number)){
      let cur=chain[kg];const seen=new Set();
      while(cur&&!seen.has(cur.id)){seen.add(cur.id);
        if(cur.gen===g)return cur;
        const nid=cur.ancestorId||parentOf[cur.id];cur=nid?byId(nid):null;}
    }return null;
  }

  basePaths.sort((a,b)=>{
    for(let g=mx;g>=mn;g--){
      const an=resolveChainAt(a,g),bn=resolveChainAt(b,g);
      const aid=an?.id??-1,bid=bn?.id??-1;
      if(aid===bid)continue;
      const aname=an?.name||'\uFFFF',bname=bn?.name||'\uFFFF';
      if(aname!==bname)return aname.localeCompare(bname);
      return aid-bid;
    }return 0;
  });

  // customOrder stores leaf node IDs in desired order
  // Convert to index array into basePaths
  const getOrderedPaths = () => {
    if (!customOrder || customOrder.length === 0) return basePaths;
    // customOrder is array of leaf node IDs
    const idToPath = {};
    basePaths.forEach(path => {
      const leafGen = Math.min(...Object.keys(path).map(Number));
      const leaf = path[leafGen];
      if (leaf) idToPath[leaf.id] = path;
    });
    const ordered = [];
    customOrder.forEach(lid => { if (idToPath[lid]) ordered.push(idToPath[lid]); });
    // Add any new paths not in customOrder at the end
    basePaths.forEach(path => {
      const leafGen = Math.min(...Object.keys(path).map(Number));
      const leaf = path[leafGen];
      if (leaf && !customOrder.includes(leaf.id)) ordered.push(path);
    });
    return ordered;
  };

  const allPaths = getOrderedPaths();

  // Get leaf ID of a path
  const leafIdOf = path => {
    const g = Math.min(...Object.keys(path).map(Number));
    return path[g]?.id ?? null;
  };

  // Get span of consecutive rows sharing same person at gen g starting from rowIdx
  const getSpan=(rowIdx,gen)=>{
    const person=resolveChainAt(allPaths[rowIdx],gen);
    if(!person)return 1;
    let span=1;
    while(rowIdx+span<allPaths.length&&resolveChainAt(allPaths[rowIdx+span],gen)?.id===person.id)span++;
    return span;
  };

  const getBlockStart=(rowIdx,gen)=>{
    const person=resolveChainAt(allPaths[rowIdx],gen);
    if(!person)return rowIdx;
    let start=rowIdx;
    while(start>0&&resolveChainAt(allPaths[start-1],gen)?.id===person.id)start--;
    return start;
  };

  // Get size of the block immediately above or below our block
  const getAdjacentBlockSpan=(blockStart,blockSpan,dir,selGen)=>{
    if(dir===-1){
      const adjRow=blockStart-1;
      if(adjRow<0)return 0;
      const adjStart=getBlockStart(adjRow,selGen);
      return getSpan(adjStart,selGen);
    } else {
      const adjRow=blockStart+blockSpan;
      if(adjRow>=allPaths.length)return 0;
      return getSpan(adjRow,selGen);
    }
  };

  // Can block move? Adjacent block must share same ancestors (gen above selGen)
  const canMoveBlock=(blockStart,span,dir,selGen)=>{
    if(dir===-1){
      if(blockStart<=0)return false;
      const chainA=allPaths[blockStart];
      const chainB=allPaths[blockStart-1];
      for(let g=selGen+1;g<=mx;g++){
        const pa=resolveChainAt(chainA,g),pb=resolveChainAt(chainB,g);
        if(!pa&&!pb)continue;
        if(pa?.id!==pb?.id)return false;
      }return true;
    } else {
      if(blockStart+span>=allPaths.length)return false;
      const chainA=allPaths[blockStart+span-1];
      const chainB=allPaths[blockStart+span];
      for(let g=selGen+1;g<=mx;g++){
        const pa=resolveChainAt(chainA,g),pb=resolveChainAt(chainB,g);
        if(!pa&&!pb)continue;
        if(pa?.id!==pb?.id)return false;
      }return true;
    }
  };

  // Move block — also moves entire adjacent block as one unit
  const moveBlock=(blockStart,span,dir,selGen)=>{
    const adjSpan = getAdjacentBlockSpan(blockStart,span,dir,selGen);
    const currentOrder = allPaths.map(p => leafIdOf(p));
    const newOrder = [...currentOrder];

    if(dir===-1){
      // Block goes up past the adjacent block above
      const adjStart = blockStart - adjSpan;
      // Extract both blocks
      const movingBlock = newOrder.splice(blockStart, span);
      // After removing movingBlock, adjBlock is now at adjStart
      const adjBlock = newOrder.splice(adjStart, adjSpan);
      // Insert: adjBlock first, then movingBlock
      newOrder.splice(adjStart, 0, ...movingBlock, ...adjBlock);
      setCustomOrder(newOrder);
      setSelected(s=>s?{...s,rowIdx:adjStart}:null);
    } else {
      // Block goes down past the adjacent block below
      const adjStart = blockStart + span;
      const movingBlock = newOrder.splice(blockStart, span);
      const adjBlock = newOrder.splice(blockStart, adjSpan); // adjStart shifted left by span
      // Insert: adjBlock first, then movingBlock
      newOrder.splice(blockStart, 0, ...adjBlock, ...movingBlock);
      setCustomOrder(newOrder);
      setSelected(s=>s?{...s,rowIdx:blockStart+adjSpan}:null);
    }
  };

  // Save — order + Firestore flush
  const handleSave = async () => {
    const orderToSave = customOrder || allPaths.map(p=>leafIdOf(p));
    onSaveRowOrder && onSaveRowOrder(orderToSave);
    // Firestore mein save karo (nodes + order dono)
    if (onFlushToFirestore) await onFlushToFirestore(orderToSave);
    setSaveFlash(true);
    if(flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = setTimeout(()=>setSaveFlash(false), 2500);
  };

  const handleResetOrder = () => {
    setCustomOrder(null);
    setSelected(null);
    setSaveFlash(false);
    onResetRowOrder && onResetRowOrder();
  };

  // Rowspan
  const numRows=allPaths.length;
  const rowspan=allPaths.map(()=>({}));
  for(let g=mn;g<=mx;g++){
    let i=0;
    while(i<numRows){
      const person=resolveChainAt(allPaths[i],g);
      if(!person){rowspan[i][g]=1;i++;continue;}
      let span=1;
      while(i+span<numRows&&resolveChainAt(allPaths[i+span],g)?.id===person.id)span++;
      rowspan[i][g]=span;
      for(let k=1;k<span;k++)rowspan[i+k][g]=0;
      i+=span;
    }
  }

  const genCols=Array.from({length:mx-mn+1},(_,i)=>mn+i);
  const thS={padding:'11px 14px',fontSize:11,fontWeight:600,letterSpacing:'0.8px',
    textTransform:'uppercase',textAlign:'left',color:'#fff',
    borderRight:'1px solid rgba(255,255,255,0.15)',whiteSpace:'nowrap'};
  const tdS={padding:'10px 14px',verticalAlign:'top',
    borderRight:`1px solid ${C.border}`,fontSize:13};

  const isSelected=(ri,g)=>selected&&selected.rowIdx===ri&&selected.gen===g;
  const selectedPerson=selected?resolveChainAt(allPaths[selected.rowIdx],selected.gen):null;
  const selBlockStart=selected?getBlockStart(selected.rowIdx,selected.gen):0;
  const selSpan=selected?getSpan(selBlockStart,selected.gen):1;
  const canUp=selected?canMoveBlock(selBlockStart,selSpan,-1,selected.gen):false;
  const canDown=selected?canMoveBlock(selBlockStart,selSpan,+1,selected.gen):false;
  const isInSelBlock=ri=>selected&&ri>=selBlockStart&&ri<selBlockStart+selSpan;
  const isDirty = customOrder !== null &&
    JSON.stringify(customOrder) !== JSON.stringify(savedRowOrder);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif"}}>

      {/* Stats */}
      <div style={{display:'flex',background:C.cream,borderBottom:`2px solid ${C.border}`}}>
        <Stat num={total} label="Total"/>
        <Stat num={ancestors} label="Ancestors"/>
        <Stat num={children} label="Children"/>
        <Stat num={gens} label="Gens"/>
        <Stat num={spouses} label="Spouses"/>
        <Stat num={siblings} label="Siblings" last/>
      </div>

      {/* Toolbar */}
      <div style={{fontSize:12,color:C.muted,padding:'7px 12px',
        background:'#faf3e0',borderBottom:`1px solid ${C.border}`,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        gap:8,flexWrap:'wrap'}}>

        {/* Left: move controls */}
        <span style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          {selected?(
            <>
              <button onClick={()=>canUp&&moveBlock(selBlockStart,selSpan,-1,selected.gen)}
                disabled={!canUp}
                style={{padding:'4px 12px',borderRadius:5,border:`1px solid ${C.gold}`,
                  background:canUp?C.gold:'#eee',color:canUp?'#fff':'#bbb',
                  cursor:canUp?'pointer':'not-allowed',fontSize:14,fontWeight:700}}>↑</button>
              <button onClick={()=>canDown&&moveBlock(selBlockStart,selSpan,+1,selected.gen)}
                disabled={!canDown}
                style={{padding:'4px 12px',borderRadius:5,border:`1px solid ${C.gold}`,
                  background:canDown?C.gold:'#eee',color:canDown?'#fff':'#bbb',
                  cursor:canDown?'pointer':'not-allowed',fontSize:14,fontWeight:700}}>↓</button>
              <span style={{fontSize:11,color:C.maroon,fontWeight:600}}>
                {selectedPerson?.name}
                {selSpan>1&&<span style={{color:C.muted}}> ({selSpan} rows)</span>}
                {' '}selected
              </span>
              <button onClick={()=>setSelected(null)}
                style={{padding:'2px 7px',borderRadius:4,border:`1px solid #ccc`,
                  background:'transparent',color:'#aaa',fontSize:11,cursor:'pointer'}}>✕</button>
            </>
          ):(
            <span style={{fontSize:11}}>
              ℹ️ <strong>Cell click</strong> → ↑↓ row move karo
            </span>
          )}
        </span>

        {/* Right: save / reset / view toggle */}
        <span style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          {/* Save button — hamesha dikhta hai */}
          {!saveFlash ? (
            <button onClick={handleSave} style={{
              padding:'4px 14px',borderRadius:5,border:'none',cursor:'pointer',
              background:isDirty ? C.green : C.gold,
              color:'#fff',fontSize:11,fontWeight:700,
              boxShadow:`0 2px 6px rgba(${isDirty?'46,125,50':'196,153,58'},0.3)`}}>
              {isDirty ? '💾 Save Order' : '💾 Save'}
            </button>
          ) : (
            <span style={{fontSize:11,color:C.green,fontWeight:600}}>✓ Saved!</span>
          )}
          {customOrder&&(
            <button onClick={handleResetOrder}
              style={{padding:'3px 9px',borderRadius:5,border:`1px solid ${C.border}`,
                background:C.cream,color:C.muted,fontSize:11,cursor:'pointer'}}>
              ↺ Reset
            </button>
          )}
          <div style={{display:'flex',gap:0,border:`1px solid ${C.border}`,
            borderRadius:6,overflow:'hidden'}}>
            {['card','table'].map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)} style={{
                padding:'4px 12px',fontSize:11,fontWeight:600,border:'none',cursor:'pointer',
                background:viewMode===mode?C.maroon:C.cream,
                color:viewMode===mode?'#fff':C.muted}}>
                {mode==='card'?'📋 Cards':'📊 Table'}
              </button>
            ))}
          </div>
        </span>
      </div>

      {/* Card view */}
      {viewMode==='card'&&(
        <div style={{padding:'12px 12px 40px'}}>
          {allPaths.map((chain,ri)=>(
            <MobileCard key={ri} chain={chain} genCols={genCols}
              nodes={nodes} mn={mn} onNameClick={onEditPerson} index={ri}/>
          ))}
        </div>
      )}

      {/* Table view */}
      {viewMode==='table'&&(
        <div style={{overflowX:'auto',padding:16}} onClick={()=>setSelected(null)}>
          <table style={{borderCollapse:'collapse',width:'100%',minWidth:500,
            background:C.cream,border:`1px solid ${C.border}`}}
            onClick={e=>e.stopPropagation()}>
            <thead>
              <tr style={{background:C.maroon}}>
                <th style={{...thS,width:44,textAlign:'center'}}>Sr.</th>
                {genCols.map(g=>(
                  <th key={g} style={thS}>{GEN_LABELS[g-mn]??`G${g}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPaths.map((chain,ri)=>(
                <tr key={ri} style={{
                  borderBottom:`1px solid ${C.border}`,
                  background:isInSelBlock(ri)?'rgba(196,153,58,0.07)':ri%2===0?C.cream:'#faf6e8'}}>
                  <td style={{...tdS,textAlign:'center',color:C.muted,fontSize:12,
                    verticalAlign:'middle',width:44,
                    borderLeft:isInSelBlock(ri)?`3px solid ${C.gold}`:undefined}}>
                    {ri+1}
                  </td>
                  {genCols.map(g=>{
                    const span=rowspan[ri][g];
                    if(span===0)return null;
                    const person=resolveChainAt(chain,g);
                    const isSel=isSelected(ri,g);
                    return(
                      <td key={g} rowSpan={span}
                        onClick={e=>{e.stopPropagation();setSelected(isSel?null:{rowIdx:ri,gen:g});}}
                        style={{...tdS,minWidth:140,cursor:'pointer',
                          borderLeft:isSel?`3px solid ${C.gold}`:span>1?`3px solid ${C.gold}`:undefined,
                          verticalAlign:span>1?'middle':'top',
                          background:isSel?'rgba(196,153,58,0.18)':undefined,
                          outline:isSel?`2px inset ${C.gold}`:undefined,
                          transition:'background 0.15s',
                        }}>
                        {person
                          ?<PersonCell person={person} nodes={nodes}
                              isYoungest={!!person.isYoungest} onNameClick={onEditPerson}/>
                          :<span style={{color:'#d6c99a',fontSize:16}}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}