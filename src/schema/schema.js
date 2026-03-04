/**
 * schema/schema.js
 *
 * FIX BUG 2: familySchema native defaults to city
 * FIX BUG 3: native added to memberSchema
 * FIX BUG 7: userSchema has no familyPin
 *
 * SCHEMA FIXES:
 *  - memberSchema:      honoraryOrgs default [] → null  (RTDB drops empty arrays)
 *  - mobileIndexSchema: added name, city, phone, addedBy, addedAt, memberId, userId
 *                       to match what ConnectorsPage actually writes
 *  - honoraryIndexSchema: added city field (rendered in Leaders/About page)
 *  - All schemas:       consistent indentation & spacing
 */

// ─────────────────────────────────────────────
// MEMBER
// ─────────────────────────────────────────────
export const memberSchema = (fields = {}) => ({
  name:         fields.name         || "",
  mobile:       fields.mobile       || "",
  mobileKey:    fields.mobileKey    || "",
  countryCode:  fields.countryCode  || "",
  email:        fields.email        || "",
  photoURL:     fields.photoURL     || "",
  familyId:     fields.familyId     || null,
  native:       fields.native       || "",        // FIX BUG 3
  gender:       fields.gender       || "",
  dob:          fields.dob          || "",
  honoraryOrgs: fields.honoraryOrgs || null,      // FIX: RTDB silently drops [] — use null
  isHead:       fields.isHead       || false,
  isSelf:       fields.isSelf       || false,
  isStudent:    fields.isStudent    || false,
  createdAt:    fields.createdAt    || Date.now(),
});

// ─────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────
export const userSchema = (fields = {}) => ({
  email:     fields.email     || null,
  mobile:    fields.mobile    || null,
  role:      fields.role      || "guest",
  familyId:  fields.familyId  || null,
  memberId:  fields.memberId  || null,
  status:    fields.status    || "pendingRegistration",
  createdAt: fields.createdAt || Date.now(),
  // familyPin NOT here — lives at families/{id}/familyPin  (FIX BUG 7)
});

// ─────────────────────────────────────────────
// FAMILY
// ─────────────────────────────────────────────
export const familySchema = (fields = {}) => ({
  familyName:        fields.familyName             || "",
  city:              fields.city                   || "",
  native:            fields.native                 || "",  // FIX BUG 2
  address:           fields.address                || "",
  familyPin:         fields.familyPin              || null,
  members:           fields.members                || {},
  headMemberId:      fields.headMemberId           || null,
  createdByMemberId: fields.createdByMemberId      || null,
});

// ─────────────────────────────────────────────
// MOBILE INDEX
// Previously missing: name, city, phone, addedBy, addedAt, memberId, userId
// ConnectorsPage writes all these fields — schema must match
// ─────────────────────────────────────────────
export const mobileIndexSchema = (fields = {}) => ({
  // identity
  name:      fields.name      || "",
  phone:     fields.phone     || "",
  city:      fields.city      || "",

  // relationships
  memberIds: fields.memberIds || {},
  familyIds: fields.familyIds || {},
  memberId:  fields.memberId  || null,   // single resolved memberId (ConnectorsPage)
  userId:    fields.userId    || null,   // resolved userId once registered

  // source tracking
  sources:   fields.sources   || {},
  addedBy:   fields.addedBy   || null,   // uid of user who uploaded via ConnectorsPage
  addedAt:   fields.addedAt   || null,   // ISO string

  // status
  isUser:    fields.isUser    || false,
  userUid:   fields.userUid   || null,
  createdAt: fields.createdAt || Date.now(),

  // invite (set by ConnectorsPage sendInvite)
  invite:    fields.invite    || null,   // { sentBy, sentAt, expiresAt }
});

// ─────────────────────────────────────────────
// HONORARY INDEX
// Added city — rendered in About/Leaders page (MemberCard & invite list)
// ─────────────────────────────────────────────
export const honoraryIndexSchema = (fields = {}) => ({
  memberId:   fields.memberId   || "",
  familyId:   fields.familyId   || "",
  memberName: fields.memberName || "",
  mobile:     fields.mobile     || "",
  photoURL:   fields.photoURL   || "",
  city:       fields.city       || "",   // FIX: was missing; rendered in Leaders page
  post:       fields.post       || "",
  orgName:    fields.orgName    || "",
  updatedAt:  fields.updatedAt  || Date.now(),
});