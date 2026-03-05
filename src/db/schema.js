// db/schema.js
// ─────────────────────────────────────────────────────────────────
// UNIFORM MOBILE RULE:
//
//   members/{id}/mobile     = "+919974021397"   fullMobile always
//   users/{uid}/mobile      = "+919974021397"   fullMobile always
//   mobileIndex KEY         = "+919974021397"   full number as key
//   mobileIndex/countryCode = "+91"
//
// No 10-digit keys. No fullMobile/mobile split. One field. One format.
// ─────────────────────────────────────────────────────────────────

const ts = () => Date.now();

/** members/{memberId} */
export function memberDoc(f = {}) {
  return {
    name:          f.name          || "",
    mobile:        f.mobile        || "",   // "+919974021397" always
    countryCode:   f.countryCode   || "+91",
    email:         f.email         || "",
    photoURL:      f.photoURL      || "",
    familyId:      f.familyId      || null,
    native:        f.native        || "",
    gender:        f.gender        || "",
    dob:           f.dob           || "",
    maritalStatus: f.maritalStatus || "",
    occupation:    f.occupation    || "",
    isHead:        f.isHead        || false,
    isSelf:        f.isSelf        || false,
    isStudent:     f.isStudent     || false,
    stayAway:      f.stayAway      || false,
    stayCity:      f.stayCity      || "",
    honoraryOrgs:  f.honoraryOrgs  || null,
    createdAt:     f.createdAt     || ts(),
  };
}

/** users/{uid} */
export function userDoc(f = {}) {
  return {
    email:       f.email       || null,
    mobile:      f.mobile      || null,   // "+919974021397" always
    countryCode: f.countryCode || "+91",
    role:        f.role        || "guest",
    familyId:    f.familyId    || null,
    memberId:    f.memberId    || null,
    status:      f.status      || "pendingRegistration",
    createdAt:   f.createdAt   || ts(),
  };
}

/** families/{familyId} */
export function familyDoc(f = {}) {
  return {
    familyName:        f.familyName        || "",
    city:              f.city              || "",
    native:            f.native            || "",
    address:           f.address           || "",
    familyPin:         f.familyPin         || null,
    members:           f.members           || {},
    headMemberId:      f.headMemberId      || null,
    createdByMemberId: f.createdByMemberId || null,
  };
}

/**
 * mobileIndex/"+919974021397"
 * Key IS the full mobile — no fullMobile field needed inside.
 */
export function mobileIndexDoc(f = {}) {
  return {
    countryCode: f.countryCode || "+91",
    memberIds:   f.memberIds   || {},
    familyIds:   f.familyIds   || {},
    isUser:      f.isUser      || false,
    userUid:     f.userUid     || null,
    sources:     f.sources     || {},
    createdAt:   f.createdAt   || ts(),
  };
}

/** honoraryIndex/{orgId}/{memberId} */
export function honoraryIndexDoc(f = {}) {
  return {
    memberId:   f.memberId   || "",
    familyId:   f.familyId   || "",
    memberName: f.memberName || "",
    mobile:     f.mobile     || "",   // "+919974021397" always
    photoURL:   f.photoURL   || "",
    city:       f.city       || "",
    post:       f.post       || "",
    orgName:    f.orgName    || "",
    updatedAt:  f.updatedAt  || ts(),
  };
}
