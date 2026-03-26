// components/ui/MobileInput.jsx
//
// Single reusable phone input used everywhere in the project.
// Style matches the image: [ IN +91 ▼ | 9974021397        ]
//
// ── Props ──────────────────────────────────────────────────────────────────────
//   countryCode          string    e.g. '+91'         (controlled)
//   onCountryCodeChange  fn        called with new cc string
//   value                string    digits only, no cc  (controlled)
//   onChange             fn        called with digits-only string
//   placeholder          string    default 'Mobile number'
//   label                string    optional label above input
//   disabled             bool
//   style                object    applied to wrapper div
//
// ── Phone format contract ──────────────────────────────────────────────────────
//   This component stores/emits ONLY the local number digits (no country code).
//   Caller combines with countryCode via toFullMobile() before saving to DB.
//   e.g.  countryCode='+91'  value='9974021397'
//         → toFullMobile('+91', '9974021397') = '+919974021397'  ← saved to DB

import { useState, useRef } from 'react';
import { COUNTRY_CODES }    from '../../lib/phone';

// ── Styles matching the image ─────────────────────────────────────────────────
const gold   = '#C9A84C';
const maroon = '#7B1C2E';
const bg     = '#FAF6F0';
const border = '#E8D8A0';

export default function MobileInput({
  countryCode         = '+91',
  onCountryCodeChange,
  value               = '',
  onChange,
  placeholder         = 'Mobile number',
  label,
  disabled            = false,
  style               = {},
  // Legacy prop aliases (backward compat)
  number,
  onNumberChange,
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Support both prop naming styles
  const currentVal   = value          ?? number          ?? '';
  const handleChange = onChange       ?? onNumberChange   ?? (() => {});
  const handleCcChange = onCountryCodeChange ?? (() => {});

  const selectedCc = COUNTRY_CODES.find(c => c.code === countryCode)
    || COUNTRY_CODES[0];

  const wrapperStyle = {
    display:      'flex',
    flexDirection: 'column',
    gap:           6,
    ...style,
  };

  const inputRowStyle = {
    display:      'flex',
    alignItems:   'center',
    border:       `1.5px solid ${focused ? gold : border}`,
    borderRadius:  10,
    background:    disabled ? '#F5F0E8' : bg,
    overflow:      'hidden',
    transition:    'border-color 0.15s',
    boxShadow:     focused ? `0 0 0 3px ${gold}22` : 'none',
  };

  const ccStyle = {
    display:        'flex',
    alignItems:     'center',
    gap:            4,
    padding:        '11px 10px 11px 14px',
    borderRight:    `1.5px solid ${border}`,
    background:     'transparent',
    cursor:         disabled ? 'default' : 'pointer',
    flexShrink:     0,
    fontSize:       13,
    fontWeight:     700,
    color:          maroon,
    fontFamily:     'inherit',
    whiteSpace:     'nowrap',
    userSelect:     'none',
  };

  const selectStyle = {
    position:   'absolute',
    inset:       0,
    opacity:     0,
    cursor:      disabled ? 'default' : 'pointer',
    width:       '100%',
    height:      '100%',
  };

  const numStyle = {
    flex:        1,
    padding:     '11px 14px',
    border:      'none',
    background:  'transparent',
    fontSize:     15,
    fontFamily:  'inherit',
    color:        maroon,
    outline:     'none',
    minWidth:     0,
  };

  return (
    <div style={wrapperStyle}>
      {label && (
        <label style={{
          fontSize:      11,
          fontWeight:    700,
          color:         gold,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          {label}
        </label>
      )}

      <div style={inputRowStyle} onClick={() => inputRef.current?.focus()}>

        {/* Country code selector — shows "IN +91 ▾" like the image */}
        <div style={{ position: 'relative' }}>
          <div style={ccStyle}>
            <span style={{ fontSize: 12, color: '#888' }}>{selectedCc.country}</span>
            <span>{selectedCc.code}</span>
            <span style={{ fontSize: 10, color: '#888' }}>▾</span>
          </div>
          {/* Invisible native select on top for accessibility */}
          <select
            value={countryCode}
            onChange={e => handleCcChange(e.target.value)}
            disabled={disabled}
            style={selectStyle}
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.code} value={c.code}>
                {c.country} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Number input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={currentVal}
          onChange={e => handleChange(e.target.value.replace(/\D/g, '').slice(0, 15))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          style={numStyle}
        />
      </div>
    </div>
  );
}
