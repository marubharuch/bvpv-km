# Mobile Number Rule — Entire App

## One Format. Everywhere. No Exceptions.

| Location | Format | Example |
|----------|--------|---------|
| `members/{id}/mobile` | full | `+919974021397` |
| `users/{uid}/mobile` | full | `+919974021397` |
| `honoraryIndex/.../mobile` | full | `+919974021397` |
| `mobileIndex/` **KEY** | full | `+919974021397` |
| `mobileIndex/{key}/countryCode` | code only | `+91` |

## Helper Functions (lib/phone.js)

```js
toFullMobile("+91", "9974021397")    → "+919974021397"  // build
toMobileKey("+919974021397")         → "+919974021397"  // key (same — full number)
splitMobile("+919974021397")         → { countryCode: "+91", digits: "9974021397" }
```

## RTDB Example

```
mobileIndex/
  +919974021397/         ← key = full number
    countryCode: "+91"
    memberIds/MEM_123: true
    familyIds/FAM_abc: true
    isUser: true
    userUid: "uid_xyz"

members/MEM_123/
  mobile: "+919974021397"   ← same full format
  countryCode: "+91"

users/uid_xyz/
  mobile: "+919974021397"   ← same full format
  countryCode: "+91"
```

## Never do this

```js
// ❌ 10-digit anywhere
members/MEM_123/mobile: "9974021397"

// ❌ Separate fullMobile + mobile fields
members/MEB_123/mobile: "9974021397"
members/MEM_123/fullMobile: "+919974021397"

// ✅ One field, full format
members/MEM_123/mobile: "+919974021397"
```
