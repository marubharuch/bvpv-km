// pages/FamilyTree/TreeAnimView.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const C = {
  maroon:'#6b1f1f', gold:'#c4993a', border:'#d6c99a',
  cream:'#fefcf5', bg:'#f9f5e7', muted:'#9c7c5a',
  spouse:'#8b5e3c', green:'#2e7d32',
};


function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 700 : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 700);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

// ── Build nested tree ─────────────────────────────────────────
function buildTree(nodes) {
  if (!nodes?.length) return null;
  const byId = {};
  nodes.forEach(n => { byId[n.id] = n; });
  const ns = nodes.filter(n => !n.spouseOf);
  if (!ns.length) return null;
  const allChildIds = new Set();
  ns.forEach(n => (n.descendants || []).forEach(id => allChildIds.add(id)));
  const roots = ns.filter(n => !allChildIds.has(n.id));
  const minGen = Math.min(...ns.map(n => n.gen));
  const maxGen = Math.max(...ns.map(n => n.gen));
  function buildNode(n) {
    const spouse = nodes.find(x => x.spouseOf === n.id) || null;
    const children = (n.descendants || [])
      .map(id => byId[id])
      .filter(c => c && !c.spouseOf)
      .map(c => buildNode(c));
    return { ...n, spouse, children, minGen, maxGen };
  }
  if (roots.length === 1) return buildNode(roots[0]);
  return { id:'__root__', name:null, gen:maxGen+1, spouse:null, minGen, maxGen, children:roots.map(r=>buildNode(r)) };
}

function buildRevealOrder(tree) {
  if (!tree) return [];
  const order = [];
  const q = [tree];
  while (q.length) {
    const n = q.shift();
    if (n.name) order.push(n.id);
    (n.children||[]).forEach(c => q.push(c));
  }
  return order;
}

function getAllNodes(tree) {
  const arr = [];
  function col(n) { if (!n) return; if (n.name) arr.push(n); (n.children||[]).forEach(col); }
  col(tree);
  return arr;
}

// ── Avatar ────────────────────────────────────────────────────
function Av({ name, bg, size=34 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color:'#fff',
      fontSize:Math.floor(size*0.38), fontWeight:700, display:'flex', alignItems:'center',
      justifyContent:'center', flexShrink:0 }}>
      {(name||'?')[0].toUpperCase()}
    </div>
  );
}

// ── Couple Card ───────────────────────────────────────────────
function CoupleCard({ node, isLatest, cardRef, compact=false }) {
  const isLeaf   = node.gen === node.minGen;
  const pad      = compact ? '8px 10px' : '10px 12px';
  const avSize   = compact ? 28 : 34;
  const nameSize = compact ? 12 : 13;
  return (
    <div ref={cardRef} style={{
      display:'inline-flex', alignItems:'stretch',
      background:C.cream, border:`2px solid ${isLeaf?C.gold:C.maroon}`,
      borderRadius:12, overflow:'hidden', minWidth: compact ? 110 : 140,
      boxShadow: isLatest ? `0 4px 20px rgba(107,31,31,0.25)` : '0 1px 4px rgba(0,0,0,0.08)',
      animation: isLatest ? 'popIn 0.38s cubic-bezier(.32,1.4,.46,1) both' : 'none',
    }}>
      <div style={{ padding:pad }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Av name={node.name} bg={isLeaf?C.gold:C.maroon} size={avSize} />
          <div>
            <div style={{ fontSize:nameSize, fontWeight:700, color:C.maroon, lineHeight:1.3, whiteSpace:'nowrap' }}>
              {node.name}
              {node.isYoungest && (
                <span style={{ display:'inline-block', background:'#fdebd0', color:'#a04000',
                  fontSize:7, fontWeight:700, letterSpacing:1, textTransform:'uppercase',
                  padding:'1px 4px', borderRadius:3, marginLeft:4, verticalAlign:'middle' }}>YOU</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {node.spouse && (
        <div style={{ borderLeft:`1.5px solid ${C.border}`, background:'#fdf8f2',
          padding:pad, display:'flex', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Av name={node.spouse.name} bg={C.spouse} size={compact?22:28} />
            <div style={{ fontSize:compact?10:11, fontWeight:600, color:C.spouse, whiteSpace:'nowrap' }}>
              {node.spouse.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DESKTOP — horizontal RTL tree (unchanged)
// ════════════════════════════════════════════════════════════════
function collectEdgesDesktop(node, shownIds, edges=[]) {
  if (!node || !node.name) { (node?.children||[]).forEach(c => collectEdgesDesktop(c, shownIds, edges)); return edges; }
  if (!shownIds.has(node.id)) return edges;
  (node.children||[]).filter(c=>shownIds.has(c.id)).forEach(child => {
    edges.push({ from: node.id, to: child.id });
    collectEdgesDesktop(child, shownIds, edges);
  });
  return edges;
}

function DesktopNode({ node, shownIds, latestId, cardRefs }) {
  if (!node) return null;
  if (!node.name) {
    const vis = (node.children||[]).filter(c=>shownIds.has(c.id));
    if (!vis.length) return null;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16, alignItems:'flex-end' }}>
        {vis.map(c => <DesktopNode key={c.id} node={c} shownIds={shownIds} latestId={latestId} cardRefs={cardRefs} />)}
      </div>
    );
  }
  if (!shownIds.has(node.id)) return null;
  const visChildren = (node.children||[]).filter(c=>shownIds.has(c.id));
  return (
    <div style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:52 }}>
      {visChildren.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:16, alignItems:'flex-end' }}>
          {visChildren.map(c => (
            <DesktopNode key={c.id} node={c} shownIds={shownIds} latestId={latestId} cardRefs={cardRefs} />
          ))}
        </div>
      )}
      <div data-nodeid={node.id}>
        <CoupleCard node={node} isLatest={node.id===latestId}
          cardRef={el => { if (el) cardRefs.current[node.id] = el; }} />
      </div>
    </div>
  );
}

// SVG overlay — same for both layouts, measures DOM positions
function ConnectorOverlay({ edges, cardRefs, containerRef, vertical=false }) {
  const [lines, setLines] = useState([]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!containerRef.current) return;
      const cr = containerRef.current.getBoundingClientRect();
      const computed = [];
      edges.forEach(({ from, to }) => {
        const fEl = cardRefs.current[from];
        const tEl = cardRefs.current[to];
        if (!fEl || !tEl) return;
        const fR = fEl.getBoundingClientRect();
        const tR = tEl.getBoundingClientRect();

        if (vertical) {
          // parent bottom-center → child top-center
          const fx = fR.left - cr.left + fR.width / 2;
          const fy = fR.bottom - cr.top;
          const tx = tR.left - cr.left + tR.width / 2;
          const ty = tR.top - cr.top;
          const my = fy + (ty - fy) / 2;
          computed.push({ fx, fy, tx, ty, my, key:`${from}-${to}`, vertical:true });
        } else {
          // parent left-center → child right-center (RTL desktop)
          const fx = fR.left - cr.left;
          const fy = fR.top  - cr.top + fR.height / 2;
          const tx = tR.right - cr.left;
          const ty = tR.top   - cr.top + tR.height / 2;
          const mx = fx - (fx - tx) / 2;
          computed.push({ fx, fy, tx, ty, mx, key:`${from}-${to}`, vertical:false });
        }
      });
      setLines(computed);
    }, 60);
    return () => clearTimeout(t);
  }, [edges, vertical]);

  if (!lines.length) return null;
  return (
    <svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%',
      pointerEvents:'none', overflow:'visible', zIndex:1 }}>
      {lines.map(l => l.vertical ? (
        <path key={l.key}
          d={`M ${l.fx} ${l.fy} V ${l.my} H ${l.tx} V ${l.ty}`}
          fill="none" stroke={C.gold} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path key={l.key}
          d={`M ${l.fx} ${l.fy} H ${l.mx} V ${l.ty} H ${l.tx}`}
          fill="none" stroke={C.gold} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════
// MOBILE — vertical top-down tree
// ════════════════════════════════════════════════════════════════
function MobileTreeNode({ node, shownIds, latestId, cardRefs }) {
  if (!node) return null;

  // Virtual root (name=null) — children side by side in a ROW
  if (!node.name) {
    const vis = (node.children||[]).filter(c=>shownIds.has(c.id));
    if (!vis.length) return null;
    return (
      <div style={{ display:'flex', flexDirection:'row', alignItems:'flex-start',
        gap:16, justifyContent:'center' }}>
        {vis.map(c => (
          <MobileTreeNode key={c.id} node={c} shownIds={shownIds} latestId={latestId} cardRefs={cardRefs} />
        ))}
      </div>
    );
  }

  if (!shownIds.has(node.id)) return null;
  const visChildren = (node.children||[]).filter(c=>shownIds.has(c.id));
  const isLatest = node.id === latestId;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      {/* This node card */}
      <div data-nodeid={node.id}>
        <CoupleCard node={node} isLatest={isLatest} compact={true}
          cardRef={el => { if (el) cardRefs.current[node.id] = el; }} />
      </div>

      {/* Children side by side below */}
      {visChildren.length > 0 && (
        <div style={{
          display:'flex', flexDirection:'row',
          gap:16, alignItems:'flex-start',
          marginTop:36, justifyContent:'center',
        }}>
          {visChildren.map(c => (
            <MobileTreeNode key={c.id} node={c} shownIds={shownIds} latestId={latestId} cardRefs={cardRefs} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mobile edges (vertical) ───────────────────────────────────
function collectEdgesMobile(node, shownIds, edges=[]) {
  if (!node || !node.name) { (node?.children||[]).forEach(c => collectEdgesMobile(c, shownIds, edges)); return edges; }
  if (!shownIds.has(node.id)) return edges;
  (node.children||[]).filter(c=>shownIds.has(c.id)).forEach(child => {
    edges.push({ from: node.id, to: child.id });
    collectEdgesMobile(child, shownIds, edges);
  });
  return edges;
}

// ════════════════════════════════════════════════════════════════
// MOBILE PAN CANVAS
// - During animation: smooth spring-pan so latest card stays visible
//   When tree height > 70% of screen → canvas shifts up
//   When card goes left/right → canvas shifts horizontally
// - After done: free touch drag in all directions
// ════════════════════════════════════════════════════════════════
function MobilePanCanvas({ children, containerRef, latestId, cardRefs, done, started }) {
  const outerRef  = useRef(null);
  const offsetRef = useRef({ x:0, y:0 });
  const dragRef   = useRef(null);
  const [offset, setOffset] = useState({ x:0, y:0 });
  const [isDragging, setIsDragging] = useState(false);

  const smoothPanTo = useCallback((nx, ny) => {
    offsetRef.current = { x:nx, y:ny };
    setOffset({ x:nx, y:ny });
  }, []);

  // Auto-pan during animation
  useEffect(() => {
    if (!started || done || !latestId) return;
    const t = setTimeout(() => {
      const outer = outerRef.current;
      const card  = cardRefs.current[latestId];
      if (!outer || !card) return;

      const oR = outer.getBoundingClientRect();
      const cR = card.getBoundingClientRect();

      // Card position relative to outer
      const cardRelTop    = cR.top  - oR.top;
      const cardRelBottom = cR.bottom - oR.top;
      const cardRelLeft   = cR.left - oR.left;
      const cardRelRight  = cR.right - oR.left;

      const threshold = oR.height * 0.70; // 70% of screen height
      const margin    = 60; // px breathing room

      let dy = 0;
      let dx = 0;

      // If card bottom is beyond 70% of screen → shift canvas up
      if (cardRelBottom > threshold) {
        dy = threshold - cardRelBottom - margin;
      }
      // If card top is going off screen top → shift down
      if (cardRelTop + offsetRef.current.y < margin) {
        dy = margin - cardRelTop;
      }

      // Horizontal: keep card horizontally centered if going off edges
      const cardCenterX = (cardRelLeft + cardRelRight) / 2;
      const outerCenterX = oR.width / 2;
      if (cardRelLeft < margin) {
        dx = margin - cardRelLeft;
      } else if (cardRelRight > oR.width - margin) {
        dx = oR.width - margin - cardRelRight;
      }

      const nx = offsetRef.current.x + dx;
      const ny = offsetRef.current.y + dy;

      if (dx !== 0 || dy !== 0) {
        smoothPanTo(nx, ny);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [latestId, done, started, smoothPanTo]);

  // Touch pan (free drag when done)
  const onTouchStart = useCallback((e) => {
    if (!done || e.touches.length !== 1) return;
    setIsDragging(true);
    dragRef.current = {
      sx: e.touches[0].clientX - offsetRef.current.x,
      sy: e.touches[0].clientY - offsetRef.current.y,
    };
  }, [done]);

  const onTouchMove = useCallback((e) => {
    if (!done || !dragRef.current) return;
    e.preventDefault();
    const x = e.touches[0].clientX - dragRef.current.sx;
    const y = e.touches[0].clientY - dragRef.current.sy;
    offsetRef.current = { x, y };
    setOffset({ x, y });
  }, [done]);

  const onTouchEnd = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  return (
    <div ref={outerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        flex:1, overflow:'hidden', position:'relative',
        touchAction: done ? 'none' : 'auto',
        userSelect:'none',
      }}>

      {/* Spring-animated canvas */}
      <div style={{
        position:'absolute',
        left: '50%',   // start centered horizontally
        top: 0,
        transform:`translate(calc(-50% + ${offset.x}px), ${offset.y}px)`,
        // Spring-like transition during auto-pan, instant during drag
        transition: isDragging ? 'none' : 'transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
        willChange:'transform',
      }}>
        <div ref={containerRef}
          style={{ position:'relative', display:'inline-block', padding:'32px 24px 48px' }}>
          {children}
        </div>
      </div>

      {/* Drag hint when done */}
      {done && (
        <div style={{
          position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
          background:'rgba(107,31,31,0.78)', color:'#fff',
          fontSize:11, borderRadius:20, padding:'5px 14px',
          pointerEvents:'none', whiteSpace:'nowrap', backdropFilter:'blur(4px)',
        }}>
          ☝️ Drag karke poora tree dekho
        </div>
      )}
    </div>
  );
}

// ── Desktop Pan Canvas (horizontal, same as before) ───────────
function DesktopPanCanvas({ children, containerRef, latestId, cardRefs, done, started }) {
  const outerRef  = useRef(null);
  const offsetRef = useRef({ x:0, y:0 });
  const dragRef   = useRef(null);
  const [offset, setOffset]     = useState({ x:0, y:0 });
  const [isDragging, setIsDrag] = useState(false);

  useEffect(() => {
    if (!started || done || !latestId) return;
    const t = setTimeout(() => {
      const outer = outerRef.current;
      const card  = cardRefs.current[latestId];
      if (!outer || !card) return;
      const oR = outer.getBoundingClientRect();
      const cR = card.getBoundingClientRect();
      const dx = (oR.left + oR.width  / 2) - (cR.left + cR.width  / 2);
      const dy = (oR.top  + oR.height / 2) - (cR.top  + cR.height / 2);
      const nx = offsetRef.current.x + dx;
      const ny = offsetRef.current.y + dy;
      offsetRef.current = { x:nx, y:ny };
      setOffset({ x:nx, y:ny });
    }, 120);
    return () => clearTimeout(t);
  }, [latestId, done, started]);

  const onMouseDown = useCallback((e) => {
    if (!done) return;
    setIsDrag(true);
    dragRef.current = { sx: e.clientX - offsetRef.current.x, sy: e.clientY - offsetRef.current.y };
  }, [done]);
  const onMouseMove = useCallback((e) => {
    if (!done || !dragRef.current) return;
    const x = e.clientX - dragRef.current.sx;
    const y = e.clientY - dragRef.current.sy;
    offsetRef.current = { x, y };
    setOffset({ x, y });
  }, [done]);
  const onMouseUp = useCallback(() => { dragRef.current = null; setIsDrag(false); }, []);

  const onTouchStart = useCallback((e) => {
    if (!done || e.touches.length !== 1) return;
    setIsDrag(true);
    dragRef.current = { sx: e.touches[0].clientX - offsetRef.current.x, sy: e.touches[0].clientY - offsetRef.current.y };
  }, [done]);
  const onTouchMove = useCallback((e) => {
    if (!done || !dragRef.current) return;
    e.preventDefault();
    const x = e.touches[0].clientX - dragRef.current.sx;
    const y = e.touches[0].clientY - dragRef.current.sy;
    offsetRef.current = { x, y };
    setOffset({ x, y });
  }, [done]);
  const onTouchEnd = useCallback(() => { dragRef.current = null; setIsDrag(false); }, []);

  return (
    <div ref={outerRef}
      onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ flex:1, overflow:'hidden', position:'relative',
        cursor: done ? 'grab' : 'default',
        touchAction: done ? 'none' : 'auto', userSelect:'none' }}>
      <div style={{
        position:'absolute',
        transform:`translate(${offset.x}px, ${offset.y}px)`,
        transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(.25,.8,.25,1)',
        willChange:'transform',
      }}>
        <div ref={containerRef}
          style={{ position:'relative', display:'inline-block', padding:'40px 48px' }}>
          {children}
        </div>
      </div>
      {done && (
        <div style={{
          position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)',
          background:'rgba(107,31,31,0.78)', color:'#fff',
          fontSize:11, borderRadius:20, padding:'5px 14px',
          pointerEvents:'none', whiteSpace:'nowrap', backdropFilter:'blur(4px)',
        }}>
          ☝️ Drag karke poora tree dekho
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
export default function TreeAnimView({ nodes, treeName, onClose, autoPlay=false, onDone }) {
  const isMobile = useIsMobile();
  const tree     = useMemo(() => buildTree(nodes), [nodes]);
  const revOrder = useMemo(() => buildRevealOrder(tree), [tree]);
  const allNodes = useMemo(() => getAllNodes(tree), [tree]);

  const [step,    setStep]    = useState(0);
  const [started, setStarted] = useState(autoPlay);
  const autoRef   = useRef(null);
  const cardRefs  = useRef({});
  const containerRef = useRef(null);

  const total    = revOrder.length;
  const done     = step >= total;
  const shownIds = useMemo(() => new Set(revOrder.slice(0, step)), [step, revOrder]);
  const latestId = step > 0 ? revOrder[step - 1] : null;

  const desktopEdges = useMemo(() => !isMobile ? collectEdgesDesktop(tree, shownIds) : [], [tree, shownIds, isMobile]);
  const mobileEdges  = useMemo(() =>  isMobile ? collectEdgesMobile(tree, shownIds)  : [], [tree, shownIds, isMobile]);

  const nextNodeName = step < total ? (allNodes.find(n=>n.id===revOrder[step])?.name||'') : '';

  const handleTap = useCallback(() => {
    if (!started) { setStarted(true); setStep(1); return; }
    if (!done) setStep(s => s + 1);
  }, [started, done]);

  useEffect(() => {
    if (!autoPlay || !total) return;
    clearInterval(autoRef.current);
    setStarted(true);
    setStep(1);
    let s = 1;
    autoRef.current = setInterval(() => {
      s++;
      setStep(s);
      if (s >= total) clearInterval(autoRef.current);
    }, 900);
    return () => clearInterval(autoRef.current);
  }, [autoPlay, total]);

  const styles = `
    @keyframes popIn {
      from { opacity:0; transform:scale(0.78) translateY(10px); }
      to   { opacity:1; transform:scale(1)    translateY(0);    }
    }
    @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:0.75} }
  `;

  // ── Shared UI pieces ──────────────────────────────────────────
  const topBar = (
    <div style={{ background:C.maroon, color:'#fff', height:52, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
      <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:16 }}>
        🌳 {treeName||'Vansh Vriksha'}
      </span>
      <button onClick={e=>{ e.stopPropagation(); onClose&&onClose(); }}
        style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)',
          color:'#fff', borderRadius:6, padding:'8px 14px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
        ✕ 
      </button>
    </div>
  );

  const progressBar = started && (
    <div style={{ height:3, background:C.border, flexShrink:0 }}>
      <div style={{ height:'100%', background:C.gold,
        width:`${(step/total)*100}%`, transition:'width 0.4s' }} />
    </div>
  );

  const statusBar = started && (
    <div style={{ background:'#fdf5e0', borderBottom:`1px solid ${C.border}`,
      padding:'4px 16px', flexShrink:0,
      display:'flex', justifyContent:'space-between', alignItems:'center',
      fontSize:11, color:C.muted }}>
      <span>{step} / {total} log</span>
      <span style={{ color:done?C.green:C.maroon, fontWeight:600 }}>
        {done ? '✅ Poora!' : nextNodeName ? `Agla: ${nextNodeName}` : ''}
      </span>
    </div>
  );

  const tapZone = (
    <div onClick={handleTap} style={{ flexShrink:0, minHeight:72,
      display:'flex', alignItems:'center', justifyContent:'center',
      borderTop:`1px solid ${C.border}`,
      background: done ? '#f0fdf4' : C.cream,
      cursor: done ? 'default' : 'pointer',
      userSelect:'none', WebkitTapHighlightColor:'transparent',
      paddingBottom:'env(safe-area-inset-bottom, 0px)' }}>
      {done ? (
        <div style={{ textAlign:'center', padding:'8px 0',
          display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
          <div style={{ fontSize:14, color:C.green, fontWeight:700 }}>✅ Poora Vansh Vriksha!</div>
          <div style={{ fontSize:12, color:C.muted }}>{total} log ka pura khandaan</div>
          {autoPlay && onDone && (
            <button onClick={e=>{ e.stopPropagation(); onDone(); }}
              style={{ marginTop:4, padding:'10px 28px', background:C.maroon, color:'#fff',
                border:'none', borderRadius:20, fontSize:14, fontWeight:700, cursor:'pointer',
                animation:'pulse 1.5s ease-in-out infinite' }}>
              📋 Table View dekho →
            </button>
          )}
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'6px 0' }}>
          <div style={{ fontSize:26, color:C.gold, animation:'pulse 1.2s ease-in-out infinite', lineHeight:1 }}>👆</div>
          <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>
            {!started ? 'Tap karo — tree shuru hoga'
              : nextNodeName ? `Tap — agla: ${nextNodeName}` : 'Tap karo'}
          </div>
        </div>
      )}
    </div>
  );

  const introScreen = (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:14, color:C.muted,
      textAlign:'center', padding:'0 24px', pointerEvents:'none' }}>
      <div style={{ fontSize:52 }}>🌳</div>
      <div style={{ fontSize:17, color:C.maroon, fontWeight:600 }}>{treeName||'Vansh Vriksha'}</div>
      <div style={{ fontSize:14, maxWidth:260, lineHeight:1.7 }}>
        {isMobile ? 'Tap karo — upar se neeche tree dikhega' : 'Click karo — right se left tak tree dikhega'}
      </div>
      <div style={{ fontSize:12, color:C.gold, background:'#fdf5e0',
        border:`1px solid ${C.border}`, borderRadius:20, padding:'5px 14px' }}>
        {total} log
      </div>
    </div>
  );

  // ── MOBILE UI ─────────────────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div style={{ position:'fixed', inset:0, zIndex:9999, background:C.bg,
        display:'flex', flexDirection:'column', fontFamily:"'DM Sans',sans-serif", overflow:'hidden' }}>
        <style>{styles}</style>
        {topBar}
        {progressBar}
        {statusBar}

        <MobilePanCanvas
          containerRef={containerRef}
          latestId={latestId}
          cardRefs={cardRefs}
          done={done}
          started={started}>
          {started ? (
            <>
              <MobileTreeNode
                node={tree}
                shownIds={shownIds}
                latestId={latestId}
                cardRefs={cardRefs}
              />
              <ConnectorOverlay
                edges={mobileEdges}
                cardRefs={cardRefs}
                containerRef={containerRef}
                vertical={true}
              />
            </>
          ) : introScreen}
        </MobilePanCanvas>

        {tapZone}
      </div>,
      document.body
    );
  }

  // ── DESKTOP UI ────────────────────────────────────────────────
  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:C.bg,
      display:'flex', flexDirection:'column', fontFamily:"'DM Sans',sans-serif", overflow:'hidden' }}>
      <style>{styles}</style>
      {topBar}
      {progressBar}
      {statusBar}

      <DesktopPanCanvas
        containerRef={containerRef}
        latestId={latestId}
        cardRefs={cardRefs}
        done={done}
        started={started}>
        {started ? (
          <>
            <div style={{ direction:'rtl' }}>
              <div style={{ direction:'ltr', display:'inline-block' }}>
                <DesktopNode
                  node={tree}
                  shownIds={shownIds}
                  latestId={latestId}
                  cardRefs={cardRefs}
                />
              </div>
            </div>
            <ConnectorOverlay
              edges={desktopEdges}
              cardRefs={cardRefs}
              containerRef={containerRef}
              vertical={false}
            />
          </>
        ) : introScreen}
      </DesktopPanCanvas>

      {tapZone}
    </div>,
    document.body
  );
}