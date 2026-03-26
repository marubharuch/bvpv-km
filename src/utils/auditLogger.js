// utils/auditLogger.js
// Central audit logging utility.
// Every member edit, tree change, permission change goes through here.
//
// RTDB structure:
//   auditLogs/{treeId}/{logId}/
//     action:       "MEMBER_UPDATED"
//     field:        "city"
//     oldValue:     "Ahmedabad"
//     newValue:     "Surat"
//     doneBy:       "memberId_xyz" or uid
//     doneByName:   "Rajesh Patel"
//     doneByType:   "PIN" | "REGISTERED" | "CREATOR" | "SUPERADMIN"
//     targetId:     memberId or treeId
//     targetName:   "Suresh Patel"
//     timestamp:    1234567890
//     reversed:     false
//     reversedBy:   null
//     reversedAt:   null

import { rtdb } from '../db/rtdb';

// ── Action constants ──────────────────────────────────────────────────────────
export const AUDIT_ACTIONS = {
  // Member
  MEMBER_CREATED:       'MEMBER_CREATED',
  MEMBER_UPDATED:       'MEMBER_UPDATED',
  MEMBER_DELETED:       'MEMBER_DELETED',
  MEMBER_BLOCKED:       'MEMBER_BLOCKED',
  MEMBER_UNBLOCKED:     'MEMBER_UNBLOCKED',
  MEMBER_PHOTO_UPDATED: 'MEMBER_PHOTO_UPDATED',

  // Invite
  INVITE_SENT:          'INVITE_SENT',
  INVITE_OPENED:        'INVITE_OPENED',
  INVITE_ACCEPTED:      'INVITE_ACCEPTED',

  // Permission
  PERMISSION_CHANGED:   'PERMISSION_CHANGED',

  // Admin
  ADMIN_REVERSED:       'ADMIN_REVERSED',

  // User
  USER_REGISTERED:      'USER_REGISTERED',
  USER_LOGIN:           'USER_LOGIN',
  PIN_VERIFIED:         'PIN_VERIFIED',
  PIN_FAILED:           'PIN_FAILED',

  // Tree
  TREE_CREATED:         'TREE_CREATED',
  TREE_LINKED:          'TREE_LINKED',
  SPOUSE_TREE_CREATED:  'SPOUSE_TREE_CREATED',
};

// ── Actor types ───────────────────────────────────────────────────────────────
export const ACTOR_TYPES = {
  PIN:        'PIN',
  REGISTERED: 'REGISTERED',
  CREATOR:    'CREATOR',
  SUPERADMIN: 'SUPERADMIN',
};

// ── Core log function ─────────────────────────────────────────────────────────

/**
 * Write a single audit log entry.
 *
 * @param {string} treeId       - which tree this log belongs to
 * @param {object} entry        - log fields
 * @param {string} entry.action - one of AUDIT_ACTIONS
 * @param {string} [entry.field]       - which field changed (for MEMBER_UPDATED)
 * @param {*}      [entry.oldValue]    - value before change
 * @param {*}      [entry.newValue]    - value after change
 * @param {string} [entry.doneBy]      - memberId or uid of actor
 * @param {string} [entry.doneByName]  - display name of actor
 * @param {string} [entry.doneByType]  - one of ACTOR_TYPES
 * @param {string} [entry.targetId]    - memberId being acted on
 * @param {string} [entry.targetName]  - name of target member
 */
export async function logAudit(treeId, entry) {
  if (!treeId || !entry?.action) return;

  const logId = `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const logEntry = {
    action:      entry.action,
    field:       entry.field       || null,
    oldValue:    entry.oldValue    ?? null,
    newValue:    entry.newValue    ?? null,
    doneBy:      entry.doneBy      || null,
    doneByName:  entry.doneByName  || null,
    doneByType:  entry.doneByType  || ACTOR_TYPES.REGISTERED,
    targetId:    entry.targetId    || null,
    targetName:  entry.targetName  || null,
    timestamp:   Date.now(),
    reversed:    false,
    reversedBy:  null,
    reversedAt:  null,
  };

  try {
    await rtdb.set(`auditLogs/${treeId}/${logId}`, logEntry);
  } catch (err) {
    // Audit log failure should NEVER break the main operation
    console.warn('[auditLogger] Failed to write log:', err);
  }

  return logId;
}

/**
 * Log multiple field changes for a single member update.
 * Generates one log entry per changed field.
 *
 * @param {string} treeId
 * @param {object} actor      - { doneBy, doneByName, doneByType }
 * @param {object} target     - { targetId, targetName }
 * @param {object} changes    - { fieldName: { old: oldVal, new: newVal } }
 */
export async function logMemberUpdate(treeId, actor, target, changes) {
  if (!treeId || !changes) return;

  const entries = Object.entries(changes).map(([field, { old: oldValue, new: newValue }]) =>
    logAudit(treeId, {
      action:     AUDIT_ACTIONS.MEMBER_UPDATED,
      field,
      oldValue,
      newValue,
      doneBy:     actor.doneBy,
      doneByName: actor.doneByName,
      doneByType: actor.doneByType,
      targetId:   target.targetId,
      targetName: target.targetName,
    })
  );

  await Promise.allSettled(entries);
}

// ── Admin reverse ─────────────────────────────────────────────────────────────

/**
 * Reverse a logged change. Restores oldValue to RTDB and marks log as reversed.
 *
 * @param {string} treeId
 * @param {string} logId          - the log entry to reverse
 * @param {string} adminId        - uid of admin doing the reversal
 * @param {string} adminName
 */
export async function reverseAuditLog(treeId, logId, adminId, adminName) {
  const logEntry = await rtdb.get(`auditLogs/${treeId}/${logId}`);
  if (!logEntry) throw new Error('Log entry not found');
  if (logEntry.reversed) throw new Error('Already reversed');
  if (!logEntry.targetId || logEntry.field === null) {
    throw new Error('This log entry cannot be reversed automatically');
  }

  const ts = Date.now();

  // Restore oldValue to RTDB member
  await rtdb.update(`members/${logEntry.targetId}`, {
    [logEntry.field]: logEntry.oldValue,
    updatedAt:        ts,
  });

  // Mark original log as reversed
  await rtdb.update(`auditLogs/${treeId}/${logId}`, {
    reversed:   true,
    reversedBy: adminId,
    reversedAt: ts,
  });

  // Write a new ADMIN_REVERSED log entry
  await logAudit(treeId, {
    action:      AUDIT_ACTIONS.ADMIN_REVERSED,
    field:       logEntry.field,
    oldValue:    logEntry.newValue,  // what it was before reversal
    newValue:    logEntry.oldValue,  // what it was restored to
    doneBy:      adminId,
    doneByName:  adminName,
    doneByType:  ACTOR_TYPES.SUPERADMIN,
    targetId:    logEntry.targetId,
    targetName:  logEntry.targetName,
  });
}

/**
 * Fetch audit logs for a tree, newest first.
 * @param {string}  treeId
 * @param {number}  limit  - max entries to return (default 50)
 */
export async function getAuditLogs(treeId, limit = 50) {
  if (!treeId) return [];
  const logs = await rtdb.getList(`auditLogs/${treeId}`);
  return logs
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}