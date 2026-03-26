// hooks/useInvite.js
// ─────────────────────────────────────────────────────────────────────────────
// Complete invite flow in one hook.
//
// FLOW:
//   1. pickContact()     → Contact Picker API (or manual input fallback)
//   2. setRelation()     → chips select (ભાઈ, કાકા, etc.)
//   3. sendInvite()      → createInvite() → buildWhatsAppLink() → openWhatsApp()
//
// Handles:
//   - Contact Picker API (Chrome/Android)
//   - Manual fallback (iPhone/Safari)
//   - Gujarati relationship auto-suggest via LCA
//   - PIN generate + WhatsApp deep link
//   - Brute-force protection
//
// Usage:
//   const inv = useInvite({ familyId, memberId, familyName, senderUid, senderName });
//   inv.pickContact()        → open contact picker
//   inv.setContact({...})    → manual input
//   inv.setRelation("ભાઈ")  → relation set
//   inv.sendInvite()         → WhatsApp open
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useContactPicker }    from "./useContactPicker";
import { createInvite, buildWhatsAppLink, openWhatsApp } from "../db/inviteDb";
import { toFullMobile }        from "../lib/phone";
import { getRelationship }     from "../utils/treeGraph";

// ── Gujarati relation chips ───────────────────────────────────────────────────
export const RELATION_CHIPS = [
  "પિતા", "માતા", "ભાઈ", "બહેન",
  "પુત્ર", "દીકરી", "કાકા", "ફોઈ",
  "મામા", "માસી", "ભત્રીજો", "ભત્રીજી",
  "પિતરાઈ ભાઈ", "પિતરાઈ બહેન", "દાદા", "દાદી",
  "નાના", "નાની", "અન્ય",
];

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {string} params.familyId    - current family
 * @param {string} params.senderUid   - uid of person sending invite
 * @param {string} params.senderName  - name for WhatsApp message
 * @param {string} params.familyName  - e.g. "પટેલ ફેમિલી"
 * @param {'create'|'join'} params.type - invite type
 * @param {object} [params.members]   - family members map (for LCA auto-suggest)
 * @param {string} [params.senderMemberId] - sender's memberId in tree (for LCA)
 */
export function useInvite({
  familyId,
  senderUid,
  senderName,
  familyName,
  type       = "join",
  members    = {},
  senderMemberId = null,
}) {
  // Contact state
  const [contact,      setContact]      = useState(null);
  // { name: string, phone: string, countryCode: string }

  // Relation state
  const [relation,     setRelation]     = useState("");
  const [autoRelation, setAutoRelation] = useState(""); // LCA suggested

  // Target memberId (pre-existing member in tree this invite is for)
  const [targetMemberId, setTargetMemberId] = useState(null);

  // UI state
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState("");
  const [lastPin,  setLastPin]  = useState(null);

  // Contact Picker
  const { pick, picking, isSupported } = useContactPicker();

  // ── Pick contact from device ────────────────────────────────────────────
  const pickContact = useCallback(async () => {
    setError("");
    const picked = await pick();
    if (!picked.length) return;

    const first = picked[0];
    setContact({
      name:        first.name        || "",
      phone:       first.phone       || "",
      countryCode: first.countryCode || "+91",
    });

    // If we have a matching memberId in tree, auto-suggest relation
    if (senderMemberId && members && Object.keys(members).length > 0) {
      _tryAutoRelation(first.phone, first.countryCode);
    }
  }, [pick, members, senderMemberId]);

  // ── Manual contact input ────────────────────────────────────────────────
  const setManualContact = useCallback((name, phone, countryCode = "+91") => {
    setError("");
    setContact({ name: name.trim(), phone: phone.trim(), countryCode });
  }, []);

  // ── Auto-suggest relation via LCA ────────────────────────────────────────
  const _tryAutoRelation = useCallback((phone, countryCode = "+91") => {
    if (!senderMemberId || !members) return;

    // Find member by phone
    const fullPhone = toFullMobile(countryCode, phone);
    const targetEntry = Object.entries(members).find(([, m]) => m.phone === fullPhone);
    if (!targetEntry) return;

    const [targetId] = targetEntry;
    setTargetMemberId(targetId);

    // LCA relation
    try {
      const rel = getRelationship(members, senderMemberId, targetId);
      if (rel) {
        setAutoRelation(rel);
        setRelation(rel); // pre-fill
      }
    } catch { /* LCA failed — no auto suggest */ }
  }, [members, senderMemberId]);

  // ── Set relation manually ────────────────────────────────────────────────
  const selectRelation = useCallback((rel) => {
    setRelation(rel);
  }, []);

  // ── Update contact name ──────────────────────────────────────────────────
  const updateName = useCallback((name) => {
    setContact(prev => prev ? { ...prev, name } : prev);
  }, []);

  // ── Send invite ──────────────────────────────────────────────────────────
  /**
   * Creates invite in RTDB + opens WhatsApp.
   * @returns {{ pin: string }} or throws
   */
  const sendInvite = useCallback(async () => {
    if (!contact?.phone) { setError("Phone number જોઈએ"); return; }
    if (!contact?.name)  { setError("નામ જોઈએ"); return; }
    if (!familyId)       { setError("Family ID missing"); return; }

    setSending(true);
    setError("");

    try {
      const fullPhone = toFullMobile(contact.countryCode || "+91", contact.phone);

      const { pin } = await createInvite({
        familyId,
        memberId:  targetMemberId || null,
        name:      contact.name,
        phone:     fullPhone,
        countryCode: contact.countryCode || "+91",
        type,
        sentBy:    senderUid,
        maxUses:   1,
      });

      setLastPin(pin);

      // Build + open WhatsApp
      const waUrl = buildWhatsAppLink({
        pin,
        name:       contact.name,
        familyName: familyName || "Family Tree",
        type,
      });

      openWhatsApp(waUrl, fullPhone);
      setSent(true);
      return { pin };

    } catch (e) {
      setError(e.message || "Invite send નથી થઈ. Try again.");
      throw e;
    } finally {
      setSending(false);
    }
  }, [contact, familyId, targetMemberId, type, senderUid, familyName]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setContact(null);
    setRelation("");
    setAutoRelation("");
    setTargetMemberId(null);
    setSent(false);
    setError("");
    setLastPin(null);
  }, []);

  // ── Computed ─────────────────────────────────────────────────────────────
  const canSend = !!(contact?.name && contact?.phone && !sending);
  const hasContact = !!contact;

  return {
    // Contact
    contact,
    hasContact,
    pickContact,
    setManualContact,
    updateName,
    picking,
    isContactPickerSupported: isSupported,

    // Relation
    relation,
    autoRelation,
    selectRelation,
    RELATION_CHIPS,

    // Send
    sendInvite,
    sending,
    sent,
    canSend,
    lastPin,

    // Error
    error,
    setError,

    // Reset
    reset,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useJoinInvite — receiver side (validates PIN on join page)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for the /join?pin=XXXXXX page.
 * Validates the invite PIN and returns invite data.
 *
 * Usage:
 *   const join = useJoinInvite(pin);
 *   join.loading → bool
 *   join.invite  → { name, phone, type, familyId }
 *   join.error   → "not_found" | "expired" | "used_up"
 */
export function useJoinInvite(pin) {
  const [invite,  setInvite]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  // error: null | "not_found" | "expired" | "used_up" | "unknown"

  // Validate on mount
  useState(() => {
    if (!pin) {
      setError("not_found");
      setLoading(false);
      return;
    }

    import("../db/inviteDb").then(({ validateInvite }) => {
      validateInvite(pin)
        .then(({ valid, reason, invite: inv }) => {
          if (valid) {
            setInvite(inv);
          } else {
            setError(reason || "not_found");
          }
        })
        .catch(() => setError("unknown"))
        .finally(() => setLoading(false));
    });
  }, [pin]);

  const isCreate = invite?.type === "create";
  const isJoin   = invite?.type === "join";

  return {
    invite,
    loading,
    error,
    isCreate,
    isJoin,
    inviteeName: invite?.name  || "",
    inviteePhone: invite?.phone || "",
    familyId:   invite?.familyId || null,
    memberId:   invite?.memberId || null,
  };
}