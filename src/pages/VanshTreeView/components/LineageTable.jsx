// components/LineageTable.jsx
// Renders the lineage table using rows/spanMap from buildLineageRows().
// UI matches the proven HTML design: maroon headers, gold merged-cell borders,
// alternating cream rows, avatar circles.

import { Cell, TH, tdStyle, Dash } from './LineageCell';

const MAROON = '#6b1f1f';
const GOLD   = '#c4993a';
const CREAM  = '#f9f5e7';

const GEN_LABELS = [
  'Self / Parent', 'Father', 'Grandfather', 'Great-GF',
  '2x Great-GF', '3x Great-GF', '4x Great-GF', '5x Great-GF',
];

function genColLabel(g, minGen) {
  const i = g - minGen;
  return GEN_LABELS[i] ?? `Gen +${i}`;
}

// Clickable td wrapper
function ClickableTd({ children, node, onCellClick, style, rowSpan, merged }) {
  const clickable = !!onCellClick && !!node?.name;
  return (
    <td
      rowSpan={rowSpan || 1}
      onClick={clickable ? () => onCellClick(node) : undefined}
      title={clickable ? `${node.name} · tap to edit` : undefined}
      style={{
        ...style,
        borderLeft:  merged ? `3px solid ${GOLD}` : style?.borderLeft,
        cursor:      clickable ? 'pointer' : 'default',
        transition:  'background 0.12s',
      }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = '#fdf3e3'; }}
      onMouseLeave={e => { if (clickable) e.currentTarget.style.background = ''; }}
    >
      {children}
    </td>
  );
}

export default function LineageTable({ rows, spanMap, colGens, minGen, maxGen, onCellClick }) {
  if (!rows || rows.length === 0) return (
    <div style={{
      padding: '40px 24px', textAlign: 'center',
      color: '#b8a898', fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem',
    }}>
      No lineage data yet. Add members to get started.
    </div>
  );

  return (
    <div style={{ overflowX: 'auto', padding: '0 0 40px' }}>
      {/* Info bar */}
      <div style={{
        padding: '6px 16px', fontSize: '0.65rem',
        color: '#8b6a4a', fontFamily: "'DM Sans', sans-serif",
        background: '#fffbf2', borderBottom: '1px solid #e8dcc8',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: '0.75rem' }}>ℹ️</span>
        Lineage Table · spouses appear inside their partner's cell
        {onCellClick && (
          <span style={{ color: MAROON, fontWeight: 700 }}> · click <b>Edit</b> to make changes</span>
        )}
      </div>

      <table style={{
        borderCollapse: 'collapse',
        fontSize:       '0.82rem',
        minWidth:       'max-content',
        width:          '100%',
      }}>
        <thead>
          <tr>
            <TH>Sr.</TH>
            <TH>Descendant</TH>
            {colGens.map(g => <TH key={g}>{genColLabel(g, minGen)}</TH>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const { chainMap, leafGen } = row;

            return (
              <tr key={ri} style={{ background: ri % 2 === 0 ? '#ffffff' : CREAM }}>
                {/* Sr */}
                <td style={{
                  ...tdStyle,
                  color: '#b8a898', textAlign: 'center',
                  fontSize: '0.72rem', minWidth: 40, fontFamily: "'DM Sans', sans-serif",
                }}>
                  {ri + 1}
                </td>

                {/* Descendant column: younger-gen descendants of the leaf */}
                <td style={{ ...tdStyle, minWidth: 120 }}>
                  {(() => {
                    const leafMember = chainMap[leafGen];
                    if (!leafMember) return <Dash />;
                    const descIds = leafMember.descendants || [];
                    const youngKids = descIds
                      .map(id => ({ id, ...((row._members || {})[id] || {}) }))
                      .filter(c => c.name);
                    if (youngKids.length === 0) return <Dash />;
                    return youngKids.map((c, ci) => (
                      <Cell key={ci} data={c} />
                    ));
                  })()}
                </td>

                {/* Generation columns */}
                {colGens.map(g => {
                  const spanKey = `${g}_${ri}`;
                  const span    = spanMap[spanKey];
                  if (span === 0) return null;

                  const person  = chainMap[g];
                  const merged  = span > 1;
                  const isYou   = person?.isRegisteredUser || (g === minGen && ri === 0 && person?.id);

                  // Build cell data shape { name, gender, spouse }
                  const cellData = person ? {
                    name:   person.name,
                    gender: person.gender,
                    spouse: person.spouseId ? { name: person.spouseName, gender: person.spouseGender } : null,
                  } : null;

                  return (
                    <ClickableTd
                      key={g}
                      rowSpan={span}
                      merged={merged}
                      node={person ? { ...person, nodeType: g === minGen ? 'self' : 'anc' } : null}
                      onCellClick={onCellClick}
                      style={{
                        ...tdStyle,
                        minWidth:      140,
                        verticalAlign: merged ? 'middle' : 'top',
                      }}
                    >
                      {person ? <Cell data={{ ...person, spouse: person._spouse }} isYou={!!isYou} /> : <Dash />}
                    </ClickableTd>
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
