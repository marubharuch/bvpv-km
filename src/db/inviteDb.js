// db/inviteDb.js
// ─────────────────────────────────────────────────────────────────────────────
// Invite system — WhatsApp PIN-based invite flow.
//
// RTDB path: /invites/{pin}
//
// FLOW:
//   Admin/Member
//     → picks contact (Contact Picker API)
//     → createInvite()  → generates 6-digit PIN
//     → buildWhatsAppLink() → opens WhatsApp
//
//   Receiver clicks link → /join?pin=XXXXXX
//     → getInvite(pin) → validate
//     → type "create" → createFamilyTree() → new family
//     → type "join"   → joins existing family tree
//     → markInviteUsed(pin)
//
// BRUTE-FORCE PROTECTION:
//   /invitePinAttempts/{deviceId} → { count, lockedUntil }
//   3 wrong attempts → 10 min lockout
// ─────────────────────────────────────────────────────────────────────────────

import { rtdb }         from "./rtdb";
import { inviteDoc, newInvitePin, isInviteUsable } from "./schema";
import { toFullMobile } from "../lib/phone";
import { logAudit, AUDIT_ACTIONS, ACTOR_TYPES } from "../utils/auditLogger";

// ── Config ────────────────────────────────────────────────────────────────────
const INVITE_EXPIRY_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_PIN_ATTEMPTS  = 3;
const LOCKOUT_DURATION  = 10 * 60 * 1000;            // 10 minutes
const APP_URL           = import.meta.env.VITE_APP_URL || window.location.origin;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE INVITE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new invite and save to RTDB.
 * Generates unique 6-digit PIN (retries if collision).
 *
 * @param {object} params
 * @param {string} params.familyId   - which family
 * @param {string} params.memberId   - pre-existing member this invite is for
 * @param {string} params.name       - invitee name (from contact picker)
 * @param {string} params.phone      - invitee phone (E.164)
 * @param {string} params.countryCode
 * @param {'create'|'join'} params.type - "create" = admin, "join" = member
 * @param {string} params.sentBy     - uid of sender
 * @param {number} params.maxUses    - default 1
 *
 * @returns {{ pin: string }}
 */
export async function createInvite({
  familyId,
  memberId,
  name,
  phone,
  countryCode = "+91",
  type = "join",
  sentBy,
  maxUses = 1,
}) {
  const fullPhone = phone ? toFullMobile(countryCode, phone) : "";

  // Generate unique PIN
  let pin;
  let attempts = 0;
  do {
    pin = newInvitePin();
    const existing = await rtdb.get(`invites/${pin}`);
    if (!existing) break;
    attempts++;
  } while (attempts < 20);

  if (attempts >= 20) throw new Error("Could not generate unique invite PIN. Try again.");

  const data = inviteDoc({
    familyId,
    memberId:  memberId  || null,
    name:      (name || "").trim(),
    phone:     fullPhone,
    type,
    sentBy:    sentBy    || null,
    maxUses,
    usedCount: 0,
    expiresAt: Date.now() + INVITE_EXPIRY_MS,
    status:    "pending",
  });

  await rtdb.set(`invites/${pin}`, data);

  // Audit log
  if (familyId) {
    logAudit(familyId, {
      action:     AUDIT_ACTIONS.INVITE_SENT,
      doneBy:     sentBy || null,
      doneByType: ACTOR_TYPES.REGISTERED,
      targetName: name || "",
    }).catch(console.warn);
  }

  return { pin };
}

// ─────────────────────────────────────────────────────────────────────────────
// READ & VALIDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch invite by PIN.
 * Returns null if not found.
 */
export async function getInvite(pin) {
  if (!pin) return null;
  return rtdb.get(`invites/${pin}`);
}

/**
 * Validate an invite PIN.
 * Returns { valid: true, invite } or { valid: false, reason }
 *
 * Reasons: "not_found" | "expired" | "used_up" | "already_used"
 */
export async function validateInvite(pin) {
  if (!pin) return { valid: false, reason: "not_found" };

  const invite = await getInvite(pin);
  if (!invite) return { valid: false, reason: "not_found" };

  if (invite.status === "expired" || Date.now() > invite.expiresAt) {
    return { valid: false, reason: "expired", invite };
  }

  if (invite.usedCount >= invite.maxUses) {
    return { valid: false, reason: "used_up", invite };
  }

  return { valid: true, invite };
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK USED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mark invite as used after receiver joins.
 * Increments usedCount. Sets status to "used" if maxUses reached.
 *
 * @param {string} pin
 * @param {string} joinedUid - Firebase Auth UID of person who joined
 */
export async function markInviteUsed(pin, joinedUid) {
  if (!pin) return;

  const invite = await getInvite(pin);
  if (!invite) return;

  const newCount = (invite.usedCount || 0) + 1;
  const isExhausted = newCount >= invite.maxUses;

  await rtdb.update(`invites/${pin}`, {
    usedCount:  newCount,
    status:     isExhausted ? "used" : "pending",
    joinedUid:  joinedUid || null,
    joinedAt:   Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP LINK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a WhatsApp deep link with the invite PIN.
 *
 * @param {object} params
 * @param {string} params.pin
 * @param {string} params.name       - invitee name
 * @param {string} params.familyName - e.g. "પટેલ ફેમિલી"
 * @param {'create'|'join'} params.type
 * @returns {string} WhatsApp URL
 */
export function buildWhatsAppLink({ pin, name, familyName, type = "join" }) {
  const link = `${APP_URL}/join?pin=${pin}`;

  const message = type === "create"
    ? `🌳 *${familyName || "Family Tree App"}*\n\n` +
      `નમસ્તે ${name || ""}! 🙏\n\n` +
      `આપને Family Tree create કરવા invitation મળ્યું છે.\n\n` +
      `👉 Link: ${link}\n\n` +
      `Link ખોલો અને ફેમિલી tree બનાવો.`
    : `🌳 *${familyName || "Family Tree App"}*\n\n` +
      `નમસ્તે ${name || ""}! 🙏\n\n` +
      `આપને Family Tree માં join થવા invitation મળ્યું છે.\n\n` +
      `👉 Link: ${link}\n\n` +
      `Link ખોલો અને ફેમિલી tree join કરો.`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Open WhatsApp directly with pre-filled message.
 * Pass phone to send to specific contact, omit for "share" style.
 *
 * @param {string} whatsappUrl - from buildWhatsAppLink()
 * @param {string} [phone]     - E.164 format if sending to specific person
 */
export function openWhatsApp(whatsappUrl, phone) {
  if (phone) {
    // Send to specific phone number
    const stripped  = phone.replace(/\D/g, "");
    const msgParam  = whatsappUrl.split("text=")[1] || "";
    const directUrl = `https://wa.me/${stripped}?text=${msgParam}`;
    window.open(directUrl, "_blank");
  } else {
    window.open(whatsappUrl, "_blank");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BRUTE-FORCE PROTECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a failed PIN attempt for a device.
 * Returns { locked: boolean, attemptsLeft: number, lockedUntil?: number }
 */
export async function recordFailedAttempt(deviceId) {
  if (!deviceId) return { locked: false, attemptsLeft: MAX_PIN_ATTEMPTS };

  const path = `invitePinAttempts/${deviceId}`;
  const data = await rtdb.get(path);
  const count = (data?.count || 0) + 1;

  if (count >= MAX_PIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION;
    await rtdb.set(path, { count, lockedUntil, lastAttempt: Date.now() });
    return { locked: true, attemptsLeft: 0, lockedUntil };
  }

  await rtdb.set(path, { count, lockedUntil: null, lastAttempt: Date.now() });
  return { locked: false, attemptsLeft: MAX_PIN_ATTEMPTS - count };
}

/**
 * Check if a device is currently locked out.
 * Returns { locked: boolean, lockedUntil?: number }
 */
export async function checkLockout(deviceId) {
  if (!deviceId) return { locked: false };

  const data = await rtdb.get(`invitePinAttempts/${deviceId}`);
  if (!data?.lockedUntil) return { locked: false };

  if (Date.now() > data.lockedUntil) {
    // Lockout expired — clear it
    await rtdb.remove(`invitePinAttempts/${deviceId}`);
    return { locked: false };
  }

  return { locked: true, lockedUntil: data.lockedUntil };
}

/**
 * Clear failed attempts after successful PIN entry.
 */
export async function clearFailedAttempts(deviceId) {
  if (!deviceId) return;
  await rtdb.remove(`invitePinAttempts/${deviceId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// USER DB WRITE — after invite accepted
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save/update user record in RTDB after invite accepted + registration.
 * Called from JoinPage after Google/Email login.
 *
 * @param {string} uid
 * @param {object} userData
 */
export async function saveUserAfterInvite(uid, userData) {
  if (!uid) return;

  const existing = await rtdb.get(`users/${uid}`) || {};
  const ts       = Date.now();

  const updated = {
    ...existing,
    name:        userData.name        || existing.name        || "",
    email:       userData.email       || existing.email       || null,
    phone:       userData.phone       || existing.phone       || null,
    countryCode: userData.countryCode || existing.countryCode || "+91",
    photoURL:    userData.photoURL    || existing.photoURL    || "",
    familyId:    userData.familyId    || existing.familyId    || null,
    memberId:    userData.memberId    || existing.memberId    || null,
    role:        existing.role        || "member",
    updatedAt:   ts,
    ...(!existing.createdAt ? { createdAt: ts } : {}),
  };

  // Merge familyIds array
  const existingFamilyIds = existing.familyIds || [];
  if (userData.familyId && !existingFamilyIds.includes(userData.familyId)) {
    updated.familyIds = [...existingFamilyIds, userData.familyId];
  } else {
    updated.familyIds = existingFamilyIds;
  }

  await rtdb.set(`users/${uid}`, updated);
  return updated;
}