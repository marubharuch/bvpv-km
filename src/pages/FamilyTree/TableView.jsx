// pages/FamilyTree/TableView.jsx
import { useState, useMemo, useEffect } from 'react';

const C = {
  maroon: '#6b1f1f', gold: '#c4993a', border: '#d6c99a',
  cream: '#fefcf5', bg: '#f9f5e7', muted: '#9c7c5a',
  spouse: '#8b5e3c', green: '#2e7d32',
};

const GEN_LABELS = ['Self', 'Father', 'Grandfather', 'Great-GF', '2x Great-GF', '3x Great-GF', '4x Great-GF'];

// ── Build rows from nodes ─────────────────────────────────────────────────────
// Each row = one leaf node + its ancestor chain placed in columns by gen
function buildRows(nodes) {
  if (!nodes?.length) return { rows: [], numCols: 0, minGen: 1, maxGen: 1 };

  const byId = {};
  nodes.forEach(n => { byId[n.id] = n; });

  const ns = nodes.filter(n => !n.spouseOf);
  if (!ns.length) return { rows: [], numCols: 0, minGen: 1, maxGen: 1 };

  // Build parentOf map from descendants arrays
  const parentOf = {};
  ns.forEach(n => {
    (n.descendants || []).forEach(childId => {
      parentOf[childId] = n.id;
    });
  });

  const genVals = ns.map(n => n.gen).filter(g => typeof g === 'number');
  const minGen = Math.min(...genVals);
  const maxGen = Math.max(...genVals);
  const numCols = maxGen - minGen + 1;

  // Leaf nodes = nodes that are NOT a parent of anyone
  const parentIds = new Set(Object.values(parentOf));
  const leafNodes = ns.filter(n => !parentIds.has(n.id));

  // Sort: siblings grouped (same ancestorId), then by name
  leafNodes.sort((a, b) => {
    const pa = a.ancestorId || '';
    const pb = b.ancestorId || '';
    if (pa !== pb) return pa.localeCompare(pb);
    return (a.name || '').localeCompare(b.name || '');
  });

  // Build one row per leaf: cells array indexed by column (gen - minGen)
  function buildCells(leafId) {
    const cells = Array(numCols).fill(null);
    let cur = leafId;
    const visited = new Set();
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const node = byId[cur];
      if (!node) break;
      const colIdx = node.gen - minGen;
      if (colIdx >= 0 && colIdx < numCols) {
        const spouse = nodes.find(x => x.spouseOf === cur) || null;
        cells[colIdx] = { node, spouse };
      }
      cur = parentOf[cur];
    }
    return cells;
  }

  const rows = leafNodes.map((leaf, i) => ({
    sr: i + 1,
    leafId: leaf.id,         // for ordering
    cells: buildCells(leaf.id),
  }));

  return { rows, numCols, minGen, maxGen };
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Av({ name, bg, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      fontSize: Math.floor(size * 0.42), fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

// ── Compact Toolbar: Stats + Move + View Toggle ───────────────────────────────
function Toolbar({ nodes, viewMode, setViewMode, selectedIdx, total, onMoveUp, onMoveDown, dirty, onSave, onReset }) {
  if (!nodes?.length) return null;

  const ns = nodes.filter(n => !n.spouseOf);
  const totalCount = nodes.length;

  // Accurate gen count: max depth from any leaf to its topmost ancestor
  const parentOf = {};
  ns.forEach(n => (n.descendants || []).forEach(c => { parentOf[c] = n.id; }));
  const parentIds = new Set(Object.values(parentOf));
  const leafNodes = ns.filter(n => !parentIds.has(n.id));
  const gens = leafNodes.length
    ? Math.max(...leafNodes.map(leaf => {
        let depth = 1, cur = leaf.ancestorId;
        const seen = new Set();
        while (cur && !seen.has(cur)) { seen.add(cur); depth++; cur = ns.find(x => x.id === cur)?.ancestorId; }
        return depth;
      }))
    : 1;

  const pill = (label, value) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: '#f5ede0', borderRadius: 20,
      padding: '4px 11px', border: `1px solid ${C.border}`, flexShrink: 0,
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.maroon, fontFamily: "'DM Serif Display',serif", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );

  const iconBtn = (icon, onClick, enabled) => (
    <button onClick={onClick} disabled={!enabled} style={{
      width: 30, height: 30, borderRadius: 7,
      border: `1px solid ${enabled ? C.maroon : C.border}`,
      background: enabled ? C.maroon : '#ede8dc',
      color: enabled ? '#fff' : '#ccc',
      fontSize: 12, cursor: enabled ? 'pointer' : 'not-allowed',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontFamily: 'inherit', lineHeight: 1,
    }}>{icon}</button>
  );

  const toggleBtn = (label, mode) => (
    <button onClick={() => setViewMode(mode)} style={{
      padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 700,
      border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: 'inherit',
      background: viewMode === mode ? C.maroon : 'transparent',
      color: viewMode === mode ? '#fff' : C.muted,
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>{label}</button>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '7px 12px', borderBottom: `1px solid ${C.border}`,
      background: C.cream, overflowX: 'auto',
      WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
    }}>
      {pill('Total', totalCount)}
      {pill('Gens', gens)}
      <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
      {iconBtn('▲', onMoveUp, selectedIdx !== null && selectedIdx > 0)}
      {iconBtn('▼', onMoveDown, selectedIdx !== null && selectedIdx < total - 1)}
      {dirty && (
        <>
          <button onClick={onSave} style={{
            padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700,
            background: C.gold, color: '#fff', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}>💾 Save</button>
          <button onClick={onReset} style={{
            padding: '5px 9px', borderRadius: 7, fontSize: 12,
            background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, cursor: 'pointer',
            fontFamily: 'inherit', flexShrink: 0,
          }}>↺</button>
        </>
      )}
      <div style={{ flex: 1, minWidth: 8 }} />
      {toggleBtn('🃏 Cards', 'cards')}
      {toggleBtn('📋 Table', 'table')}
    </div>
  );
}

// ── Main TableView ────────────────────────────────────────────────────────────
export default function TableView({
  nodes = [],
  onEditPerson,
  savedRowOrder,
  onSaveRowOrder,
  onResetRowOrder,
  onFlushToFirestore,
}) {
  const { rows, numCols } = useMemo(() => buildRows(nodes), [nodes]);

  const [order, setOrder]           = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dirty, setDirty]           = useState(false);
  const [viewMode, setViewMode]     = useState('table');

  useEffect(() => {
    if (savedRowOrder?.length) { setOrder(savedRowOrder); setDirty(false); }
    else { setOrder(null); setDirty(false); }
  }, [savedRowOrder]);

  // Apply saved order — keyed by leafId (first cell's node id)
  const displayRows = useMemo(() => {
    if (!order || !rows.length) return rows.map((r, i) => ({ ...r, sr: i + 1 }));
    const byLeafId = {};
    rows.forEach(r => { byLeafId[r.leafId] = r; });
    const result = order.map(id => byLeafId[id]).filter(Boolean);
    // append any new rows not in saved order
    rows.forEach(r => { if (!order.includes(r.leafId)) result.push(r); });
    return result.map((r, i) => ({ ...r, sr: i + 1 }));
  }, [rows, order]);

  const handleMoveUp = () => {
    if (selectedIdx === null || selectedIdx === 0) return;
    const next = [...displayRows];
    [next[selectedIdx - 1], next[selectedIdx]] = [next[selectedIdx], next[selectedIdx - 1]];
    setOrder(next.map(r => r.leafId));
    setSelectedIdx(selectedIdx - 1);
    setDirty(true);
  };

  const handleMoveDown = () => {
    if (selectedIdx === null || selectedIdx >= displayRows.length - 1) return;
    const next = [...displayRows];
    [next[selectedIdx], next[selectedIdx + 1]] = [next[selectedIdx + 1], next[selectedIdx]];
    setOrder(next.map(r => r.leafId));
    setSelectedIdx(selectedIdx + 1);
    setDirty(true);
  };

  const handleSave  = () => { onSaveRowOrder?.(displayRows.map(r => r.leafId)); setDirty(false); };
  const handleReset = () => { setOrder(null); setSelectedIdx(null); setDirty(false); onResetRowOrder?.(); };

  const colLabels = Array.from({ length: numCols || 0 }, (_, i) => GEN_LABELS[i] ?? `G${i + 1}`);

  if (!nodes.length) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: C.muted, fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🌳</div>
        <div style={{ fontSize: 15 }}>Koi member nahi mila.</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: C.bg, minHeight: '60vh' }}>
      <Toolbar
        nodes={nodes} viewMode={viewMode} setViewMode={setViewMode}
        selectedIdx={selectedIdx} total={displayRows.length}
        onMoveUp={handleMoveUp} onMoveDown={handleMoveDown}
        dirty={dirty} onSave={handleSave} onReset={handleReset}
      />
      {viewMode === 'table'
        ? <TableMode displayRows={displayRows} colLabels={colLabels} numCols={numCols || 1} selectedIdx={selectedIdx} onSelectRow={setSelectedIdx} onEditPerson={onEditPerson} />
        : <CardsMode displayRows={displayRows} colLabels={colLabels} selectedIdx={selectedIdx} onSelectRow={setSelectedIdx} onEditPerson={onEditPerson} />
      }
    </div>
  );
}

// ── Table Mode ────────────────────────────────────────────────────────────────
function TableMode({ displayRows, colLabels, numCols, selectedIdx, onSelectRow, onEditPerson }) {

  // Build cellMap with rowspan merging for ancestor columns
  const cellMap = useMemo(() => {
    const map = displayRows.map(row =>
      row.cells.map(cell => ({
        node:    cell?.node   ?? null,
        spouse:  cell?.spouse ?? null,
        rowspan: 1,
        skip:    false,
      }))
    );

    // Merge consecutive rows that share the same ancestor node in col >= 1
    for (let col = 1; col < numCols; col++) {
      let i = 0;
      while (i < displayRows.length) {
        const nodeId = map[i]?.[col]?.node?.id;
        if (!nodeId) { i++; continue; }
        let span = 1;
        while (i + span < displayRows.length && map[i + span]?.[col]?.node?.id === nodeId) {
          map[i + span][col].skip = true;
          span++;
        }
        map[i][col].rowspan = span;
        i += span;
      }
    }
    return map;
  }, [displayRows, numCols]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: C.cream, tableLayout: 'auto' }}>
        <thead>
          <tr style={{ background: C.maroon }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', borderRight: '1px solid rgba(255,255,255,0.15)', width: 40 }}>SR.</th>
            {colLabels.map((label, i) => (
              <th key={i} style={{
                padding: '10px 14px', textAlign: 'left',
                color: i === 0 ? C.gold : 'rgba(255,255,255,0.85)',
                fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                borderRight: i < colLabels.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
              }}>
                {i === 0 ? 'SELF' : label.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, rowIdx) => {
            const isSelected = selectedIdx === rowIdx;
            return (
              <tr
                key={row.leafId || rowIdx}
                onClick={() => onSelectRow(isSelected ? null : rowIdx)}
                style={{ borderBottom: `1px solid ${C.border}`, background: isSelected ? '#fdf5dc' : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fdf8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#fdf5dc' : 'transparent'; }}
              >
                {/* SR */}
                <td style={{ padding: '10px 14px', color: C.muted, fontSize: 12, fontWeight: 600, borderRight: `1px solid ${C.border}`, verticalAlign: 'middle', background: isSelected ? '#fdf5dc' : C.cream }}>
                  {row.sr}
                </td>

                {/* Cells */}
                {colLabels.map((_, colIdx) => {
                  const cell = cellMap[rowIdx]?.[colIdx];
                  if (!cell || cell.skip) return null;

                  const isYou = colIdx === 0 && row.cells[0]?.node?.isYoungest;

                  return (
                    <td
                      key={colIdx}
                      rowSpan={cell.rowspan}
                      onClick={e => { if (colIdx === 0 && onEditPerson && cell.node) { e.stopPropagation(); onEditPerson(cell.node.id); } }}
                      style={{
                        padding: '10px 14px',
                        borderRight: colIdx < colLabels.length - 1 ? `1px solid ${C.border}` : 'none',
                        verticalAlign: 'middle',
                        background: cell.rowspan > 1 ? `${C.gold}10` : isSelected ? '#fdf5dc' : C.cream,
                        cursor: colIdx === 0 && onEditPerson ? 'pointer' : 'default',
                      }}
                    >
                      {cell.node ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Av name={cell.node.name} bg={colIdx === 0 ? C.maroon : '#9c7c5a'} size={26} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: colIdx === 0 ? C.maroon : '#5a3e28', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                              {cell.node.name}
                              {isYou && <span style={{ background: '#fdebd0', color: '#a04000', fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '1px 4px', borderRadius: 3 }}>YOU</span>}
                            </div>
                            {cell.spouse && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                <Av name={cell.spouse.name} bg={C.spouse} size={16} />
                                <span style={{ fontSize: 11, color: C.spouse, whiteSpace: 'nowrap' }}>{cell.spouse.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: C.border, fontSize: 18 }}>—</span>
                      )}
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

// ── Cards Mode ────────────────────────────────────────────────────────────────
function CardsMode({ displayRows, colLabels, selectedIdx, onSelectRow, onEditPerson }) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {displayRows.map((row, rowIdx) => {
        const isSelected = selectedIdx === rowIdx;
        const selfCell = row.cells[0]; // col 0 = self

        return (
          <div
            key={row.leafId || rowIdx}
            onClick={() => onSelectRow(isSelected ? null : rowIdx)}
            style={{
              background: isSelected ? '#fdf5dc' : C.cream,
              border: `1.5px solid ${isSelected ? C.gold : C.border}`,
              borderRadius: 10, padding: '12px 14px',
              boxShadow: '0 1px 4px rgba(60,15,15,0.06)', cursor: 'pointer',
            }}
          >
            {/* Self header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: selfCell ? 10 : 0 }}>
              <span style={{ background: C.maroon, color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{row.sr}</span>
              {selfCell?.node && (
                <>
                  <Av name={selfCell.node.name} bg={C.maroon} size={30} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.maroon }}>
                      {selfCell.node.name}
                      {selfCell.node.isYoungest && <span style={{ background: '#fdebd0', color: '#a04000', fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '1px 5px', borderRadius: 3, marginLeft: 5 }}>YOU</span>}
                    </div>
                    {selfCell.spouse && <div style={{ fontSize: 11, color: C.spouse }}>{selfCell.spouse.name}</div>}
                  </div>
                </>
              )}
            </div>

            {/* Ancestor chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {row.cells.slice(1).map((cell, i) => {
                if (!cell?.node) return null;
                return (
                  <div key={i} style={{ background: '#fdf0e0', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
                    <div style={{ color: C.gold, fontWeight: 700, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>
                      {colLabels[i + 1] || `G${i + 2}`}
                    </div>
                    <div style={{ color: C.maroon, fontWeight: 600 }}>{cell.node.name}</div>
                    {cell.spouse && <div style={{ color: C.spouse, fontSize: 10 }}>{cell.spouse.name}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}