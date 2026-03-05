// db/registrationDb.js
// Family registration — one atomic batch write.
// mobile on ALL nodes = fullMobile "+91XXXXXXXXXX"

import { push, ref }              from "firebase/database";
import { db }                     from "../lib/firebase";
import { rtdb }                   from "./rtdb";
import { memberDoc, familyDoc }   from "./schema";
import { emailToKey }             from "../lib/text";
import { toFullMobile, toMobileKey, splitMobile } from "../lib/phone";
import { checkDuplicateMobile, buildMobileIndexWrites } from "./mobileIndexDb";
import { generatePin }            from "./familyDb";

export async function registerFamily({ city, contacts, user }) {
  if (!contacts?.length) throw new Error("Add at least one family member.");

  const existing = await rtdb.get(`users/${user.uid}/familyId`);
  if (existing) throw new Error("ALREADY_IN_FAMILY");

  // Ensure one member is isSelf
  const hasSelf  = contacts.some(c => c.isSelf);
  const members  = hasSelf ? contacts : contacts.map((c, i) => ({ ...c, isSelf: i === 0 }));

  // Pre-flight duplicate check
  for (const c of members) {
    const raw  = c.phone || c.mobile || "";
    if (!raw) continue;
    const cc   = c.countryCode || splitMobile(raw).countryCode || "+91";
    const full = toFullMobile(cc, raw);
    const dup  = await checkDuplicateMobile(full, null);
    if (dup.duplicate) throw new Error(`Mobile of "${c.name}" is already registered in another family.`);
  }

  const familyId  = push(ref(db, "families")).key;
  const familyPin = await generatePin();
  const ts        = Date.now();
  const writes    = {};
  const membersMap = {};
  let headMemberId = null;
  let selfMemberId = null;

  members.forEach((contact, index) => {
    const memberId  = `MEM_${ts + index}`;
    membersMap[memberId] = true;
    if (index === 0)     headMemberId = memberId;
    if (contact.isSelf)  selfMemberId = memberId;

    const raw  = contact.phone || contact.mobile || "";
    const cc   = contact.countryCode || splitMobile(raw).countryCode || "+91";
    const full = raw ? toFullMobile(cc, raw) : "";   // "+91XXXXXXXXXX"

    // ── Member node: mobile = fullMobile ──────────────────────
    writes[`members/${memberId}`] = memberDoc({
      name:        contact.name.trim(),
      mobile:      full,          // fullMobile — always
      countryCode: cc,
      native:      city,
      isHead:      index === 0,
      isSelf:      contact.isSelf || false,
      familyId,
      email:       contact.isSelf && user?.email ? user.email : "",
      createdAt:   ts,
    });

    // ── mobileIndex: key=10-digit, inside=full ────────────────
    if (full) {
      Object.assign(writes, buildMobileIndexWrites(full, cc, {
        memberId, familyId, source: "familyRegistration",
      }));
    }
  });

  writes[`families/${familyId}`] = familyDoc({
    familyName: `${city} Family`,
    city, familyPin,
    members: membersMap,
    headMemberId,
    createdByMemberId: selfMemberId,
  });
  writes[`familiesByPin/${familyPin}`] = familyId;

  // ── User node: link to family ─────────────────────────────
  if (user?.uid) {
    const self = members.find(c => c.isSelf);
    const raw  = self?.phone || self?.mobile || "";
    const cc   = self?.countryCode || splitMobile(raw).countryCode || "+91";
    const full = raw ? toFullMobile(cc, raw) : "";

    writes[`users/${user.uid}/familyId`]    = familyId;
    writes[`users/${user.uid}/memberId`]    = selfMemberId;
    writes[`users/${user.uid}/mobile`]      = full;    // fullMobile on user too
    writes[`users/${user.uid}/countryCode`] = cc;
    writes[`users/${user.uid}/role`]        = "member";
    writes[`users/${user.uid}/status`]      = "active";

    if (full) {
      Object.assign(writes, buildMobileIndexWrites(full, cc, {
        isUser: true, userUid: user.uid,
        memberId: selfMemberId, familyId,
      }));
    }
  }

  if (user?.email) {
    writes[`usersByEmail/${emailToKey(user.email)}`] = user.uid;
  }

  await rtdb.batch(writes);
  return { familyId, familyPin, headMemberId, selfMemberId };
}
