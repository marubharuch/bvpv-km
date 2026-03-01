/**
 * schema/schema.js
 * ─────────────────────────────────────────────────────────────────
 * Defines the shape of every RTDB node.
 * Every service uses these to build writes — no field name typos possible.
 * ─────────────────────────────────────────────────────────────────
 */

export const memberSchema = (fields = {}) => ({
  name:         fields.name         || "",
  mobile:       fields.mobile       || "",
  email:        fields.email        || "",
  photoURL:     fields.photoURL     || "",
  familyId:     fields.familyId     || null,
  gender:       fields.gender       || "",
  dob:          fields.dob          || "",
  honoraryOrgs: fields.honoraryOrgs || [],
  isHead:       fields.isHead       || false,
  isSelf:       fields.isSelf       || false,
  isStudent:    fields.isStudent    || false,
  createdAt:    fields.createdAt    || Date.now(),
});

export const userSchema = (fields = {}) => ({
  email:     fields.email     || null,
  mobile:    fields.mobile    || null,
  role:      fields.role      || "guest",
  familyId:  fields.familyId  || null,
  memberId:  fields.memberId  || null,
  status:    fields.status    || "pendingRegistration",
  createdAt: fields.createdAt || Date.now(),
});

export const familySchema = (fields = {}) => ({
  familyName:         fields.familyName         || "",
  city:               fields.city               || "",
  native:             fields.native             || "",
  address:            fields.address            || "",
  familyPin:          fields.familyPin          || null,
  members:            fields.members            || {},
  headMemberId:       fields.headMemberId       || null,
  createdByMemberId:  fields.createdByMemberId  || null,
});

export const mobileIndexSchema = (fields = {}) => ({
  memberIds: fields.memberIds || {},
  familyIds: fields.familyIds || {},
  sources:   fields.sources   || {},
  isUser:    fields.isUser    || false,
  userUid:   fields.userUid   || null,
  createdAt: fields.createdAt || Date.now(),
});

export const honoraryIndexSchema = (fields = {}) => ({
  memberId:   fields.memberId   || "",
  familyId:   fields.familyId   || "",
  memberName: fields.memberName || "",
  mobile:     fields.mobile     || "",
  photoURL:   fields.photoURL   || "",
  post:       fields.post       || "",
  orgName:    fields.orgName    || "",
  updatedAt:  fields.updatedAt  || Date.now(),
});
