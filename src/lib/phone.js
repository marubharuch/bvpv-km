// lib/phone.js — Phone number utilities
//
// ── ONE standard format used everywhere in this project ───────────────────────
//
//   Storage format:  +919974021397   (E.164 — plus + country code + number)
//   Display format:  +91 9974021397  (with space after country code)
//   RTDB key format: 919974021397    (no plus, no spaces)
//
// ALL phone numbers saved to Firestore / RTDB must go through toFullMobile()
// before saving. This ensures invited[], treeEditors, users all match.

const DEFAULT_CC = '+91';

// ─── Country code list ────────────────────────────────────────────────────────
// Used by MobileInput dropdown
export const COUNTRY_CODES = [
  { code: '+91',  country: 'IN', name: 'India'         },
  { code: '+1',   country: 'US', name: 'USA/Canada'    },
  { code: '+44',  country: 'GB', name: 'UK'            },
  { code: '+61',  country: 'AU', name: 'Australia'     },
  { code: '+971', country: 'AE', name: 'UAE'           },
  { code: '+65',  country: 'SG', name: 'Singapore'     },
  { code: '+60',  country: 'MY', name: 'Malaysia'      },
  { code: '+27',  country: 'ZA', name: 'South Africa'  },
  { code: '+49',  country: 'DE', name: 'Germany'       },
  { code: '+33',  country: 'FR', name: 'France'        },
  { code: '+81',  country: 'JP', name: 'Japan'         },
  { code: '+86',  country: 'CN', name: 'China'         },
  { code: '+92',  country: 'PK', name: 'Pakistan'      },
  { code: '+880', country: 'BD', name: 'Bangladesh'    },
  { code: '+94',  country: 'LK', name: 'Sri Lanka'     },
  { code: '+977', country: 'NP', name: 'Nepal'         },
];

/**
 * toFullMobile — converts cc + number → standard E.164 storage string
 *
 * Examples:
 *   toFullMobile('+91', '9974021397')  → '+919974021397'
 *   toFullMobile('+1',  '4155552671')  → '+14155552671'
 *   toFullMobile(null,  '9974021397')  → '+919974021397'  (uses DEFAULT_CC)
 *
 * Safe to call multiple times — won't double-add country code.
 */
export function toFullMobile(countryCode, number) {
  const cc  = (countryCode || DEFAULT_CC).trim();
  const num = (number      || '').trim().replace(/\D/g, ''); // digits only
  if (!num) return '';

  const ccDigits = cc.replace(/\D/g, '');

  // Already has country code prefixed → don't add again
  if (num.startsWith(ccDigits) && num.length > 10) {
    return `+${num}`;
  }

  return `${cc}${num}`;  // e.g. '+91' + '9974021397' = '+919974021397'
}

/**
 * toMobileKey — converts full mobile to RTDB-safe key (no + or spaces)
 *
 * Example:
 *   toMobileKey('+919974021397') → '919974021397'
 */
export function toMobileKey(phone) {
  return (phone || '').replace(/\+/g, '').replace(/\s/g, '').trim();
}

/**
 * splitMobile — splits a stored full mobile back into { cc, number }
 * Useful for pre-filling the MobileInput from a saved value.
 *
 * Example:
 *   splitMobile('+919974021397') → { cc: '+91', number: '9974021397' }
 *   splitMobile('+14155552671')  → { cc: '+1',  number: '4155552671' }
 */
export function splitMobile(fullPhone) {
  if (!fullPhone) return { cc: DEFAULT_CC, number: '' };

  const known = COUNTRY_CODES.map(c => c.code).sort((a, b) => b.length - a.length);
  for (const cc of known) {
    if (fullPhone.startsWith(cc)) {
      return { cc, number: fullPhone.slice(cc.length) };
    }
  }
  return { cc: DEFAULT_CC, number: fullPhone.replace(/^\+/, '') };
}

/**
 * generatePin — random 4-digit PIN string
 */
export function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * generateTreeId — random 6-char uppercase alphanumeric
 */
export function generateTreeId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
