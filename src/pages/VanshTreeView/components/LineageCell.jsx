// components/LineageCell.jsx — UI primitives matching our HTML design

const MAROON = '#6b1f1f';
const GOLD   = '#c4993a';
const CREAM  = '#f9f5e7';

export function TH({ children }) {
  return (
    <th style={{
      padding:       '10px 14px',
      background:    MAROON,
      color:         '#f0d080',
      fontSize:      '0.65rem',
      fontFamily:    "'DM Sans', sans-serif",
      fontWeight:    700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      textAlign:     'left',
      borderRight:   '1px solid rgba(240,208,128,0.2)',
      borderBottom:  `2px solid ${GOLD}`,
      whiteSpace:    'nowrap',
    }}>
      {children}
    </th>
  );
}

export const tdStyle = {
  padding:       '10px 12px',
  borderRight:   '1px solid #e8dcc8',
  borderBottom:  '1px solid #e8dcc8',
  verticalAlign: 'middle',
  background:    'transparent',
};

export function Dash() {
  return (
    <span style={{ color: '#b8a898', fontSize: '0.85rem', fontFamily: "'DM Sans', sans-serif" }}>
      —
    </span>
  );
}

// Avatar circle
function Avatar({ name, isSpouse }) {
  const letter = (name || '?')[0].toUpperCase();
  return (
    <div style={{
      width:           32,
      height:          32,
      borderRadius:    '50%',
      background:      isSpouse ? '#8b5e3c' : MAROON,
      color:           '#fff',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      fontSize:        '0.75rem',
      fontWeight:      700,
      fontFamily:      "'DM Sans', sans-serif",
      flexShrink:      0,
    }}>
      {letter}
    </div>
  );
}

// Cell — renders person + optional YOU tag + spouse row
export function Cell({ data, isYou }) {
  if (!data?.name) return <Dash />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Person row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name={data.name} isSpouse={false} />
        <span style={{
          fontFamily:  "'DM Sans', sans-serif",
          fontWeight:  isYou ? 700 : 600,
          color:       MAROON,
          fontSize:    '0.85rem',
        }}>
          {data.name}
        </span>
        {isYou && (
          <span style={{
            fontSize:     '0.5rem',
            background:   GOLD,
            color:        '#fff',
            padding:      '2px 6px',
            borderRadius: 4,
            fontWeight:   700,
            fontFamily:   "'DM Sans', sans-serif",
            letterSpacing:'0.05em',
          }}>
            YOU
          </span>
        )}
      </div>
      {/* Spouse row */}
      {data.spouse?.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
          <Avatar name={data.spouse.name} isSpouse={true} />
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontStyle:  'italic',
            color:      '#8b5e3c',
            fontSize:   '0.78rem',
          }}>
            {data.spouse.name}
          </span>
        </div>
      )}
    </div>
  );
}
