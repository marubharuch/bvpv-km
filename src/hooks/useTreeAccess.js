// hooks/useTreeAccess.js
// ─────────────────────────────────────────────────────────────────────────────
// Poora editor access flow ek hook mein:
//
//   STEP 1 — phone enter karo
//   STEP 2 — isPhoneInvited() check
//   STEP 3 — PIN enter karo
//   STEP 4 — verifyPinAndSaveEditor()
//   STEP 5 — access granted → localForage mein save
//
// Next visit:
//   localForage se phone + treeId mile → isVerifiedEditor() → skip PIN
//
// State machine:
//   idle → checking → not_invited
//                   → enter_pin → verifying → granted
//                                           → wrong_pin
//                                           → not_invited (race)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';
import {
  isPhoneInvited,
  isVerifiedEditor,
  verifyPinAndSaveEditor,
} from '../db/treeDb';

// localForage keys
const LOCAL_PHONE_KEY  = (treeId) => `treeAccess_phone_${treeId}`;
const LOCAL_ACCESS_KEY = (treeId) => `treeAccess_granted_${treeId}`;

// ─────────────────────────────────────────────────────────────────────────────
export function useTreeAccess(treeId) {
  const [step,       setStep]       = useState('idle');
  // idle | checking | not_invited | enter_pin | verifying | granted | error

  const [phone,      setPhone]      = useState('');
  const [editorName, setEditorName] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [loading,    setLoading]    = useState(true);

  // ── On mount: check localForage for saved phone ───────────────────────────
  useEffect(() => {
    if (!treeId) return;

    async function checkSaved() {
      try {
        const savedPhone   = await localforage.getItem(LOCAL_PHONE_KEY(treeId));
        const savedGranted = await localforage.getItem(LOCAL_ACCESS_KEY(treeId));

        if (savedPhone && savedGranted) {
          // Double check with RTDB (in case access was revoked)
          const stillValid = await isVerifiedEditor(treeId, savedPhone);
          if (stillValid) {
            setPhone(savedPhone);
            setStep('granted');
            setLoading(false);
            return;
          }
          // Access revoked — clear local
          await clearLocalAccess(treeId);
        }
      } catch (e) {
        console.warn('useTreeAccess: localForage read failed', e);
      }
      setStep('idle');
      setLoading(false);
    }

    checkSaved();
  }, [treeId]);

  // ── Step 1: Phone submit → check if invited ───────────────────────────────
  const submitPhone = useCallback(async (enteredPhone) => {
    if (!enteredPhone || !treeId) return;

    setPhone(enteredPhone);
    setStep('checking');
    setErrorMsg('');

    try {
      const { invited, name } = await isPhoneInvited(treeId, enteredPhone);

      if (!invited) {
        setStep('not_invited');
        setErrorMsg('Aapka number is tree mein invited nahi hai.');
        return;
      }

      setEditorName(name);
      setStep('enter_pin');

    } catch (e) {
      setStep('error');
      setErrorMsg('Network error. Dobara try karein.');
      console.error('submitPhone error:', e);
    }
  }, [treeId]);

  // ── Step 2: PIN submit → verify ───────────────────────────────────────────
  const submitPin = useCallback(async (enteredPin, editorDisplayName = '') => {
    if (!phone || !treeId) return;

    setStep('verifying');
    setErrorMsg('');

    try {
      const result = await verifyPinAndSaveEditor(
        treeId,
        enteredPin,
        phone,
        editorDisplayName || editorName,
      );

      if (result.ok) {
        // Save to localForage for next visit
        await localforage.setItem(LOCAL_PHONE_KEY(treeId),  phone);
        await localforage.setItem(LOCAL_ACCESS_KEY(treeId), true);
        setStep('granted');

      } else {
        const msgs = {
          wrong_pin:      'PIN galat hai. Dobara try karein.',
          not_invited:    'Aapka number is tree mein nahi hai.',
          tree_not_found: 'Tree nahi mili. Link check karein.',
        };
        setErrorMsg(msgs[result.reason] || 'Kuch galat hua.');
        setStep('enter_pin');   // back to PIN entry
      }

    } catch (e) {
      setStep('error');
      setErrorMsg('Network error. Dobara try karein.');
      console.error('submitPin error:', e);
    }
  }, [treeId, phone, editorName]);

  // ── Logout / revoke access ────────────────────────────────────────────────
  const revokeAccess = useCallback(async () => {
    await clearLocalAccess(treeId);
    setStep('idle');
    setPhone('');
    setEditorName('');
  }, [treeId]);

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isGranted    = step === 'granted';
  const isChecking   = step === 'checking' || step === 'verifying';
  const isNotInvited = step === 'not_invited';
  const needsPhone   = step === 'idle';
  const needsPin     = step === 'enter_pin';

  return {
    // State
    step,
    phone,
    editorName,
    errorMsg,
    loading,

    // Derived
    isGranted,
    isChecking,
    isNotInvited,
    needsPhone,
    needsPin,

    // Actions
    submitPhone,
    submitPin,
    revokeAccess,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR ACCESS HOOK — UID wale ke liye (no PIN needed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creator ke liye simple hook.
 * UID match karo Firestore treesByUid se.
 */
export function useCreatorAccess(uid, treeId) {
  const [isCreator, setIsCreator] = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!uid || !treeId) { setLoading(false); return; }

    import('../db/treeDb').then(({ getTreesByUid }) => {
      getTreesByUid(uid).then(trees => {
        setIsCreator(!!trees[treeId]);
        setLoading(false);
      });
    });
  }, [uid, treeId]);

  return { isCreator, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
async function clearLocalAccess(treeId) {
  if (!treeId) return;
  await localforage.removeItem(LOCAL_PHONE_KEY(treeId));
  await localforage.removeItem(LOCAL_ACCESS_KEY(treeId));
}