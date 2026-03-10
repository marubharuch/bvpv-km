// components/SyncBadge.jsx
// Shows sync status: unsynced changes, syncing, synced, offline.
// Tap to manually trigger sync.

const mono = "'JetBrains Mono', monospace";

export default function SyncBadge({ meta, status, isOnline, syncError, onSyncNow }) {
  const isSyncing = status === "syncing";
  const isSaving  = status === "saving";

  // ── Derive display state ──────────────────────────────────────────────────
  let icon, label, bg, color, border, pulse;

  if (!isOnline) {
    icon="📵"; label="Offline"; bg="#FFF8F0"; color="#C0A0A0"; border="#f0e6e6"; pulse=false;
  } else if (syncError) {
    icon="⚠️"; label="Sync failed"; bg="#FFF0F0"; color="#C0302A"; border="#f0b0b0"; pulse=false;
  } else if (isSyncing) {
    icon="🔄"; label="Syncing…"; bg="#F0F8FF"; color="#1565C0"; border="#90CAF9"; pulse=true;
  } else if (isSaving) {
    icon="💾"; label="Saving…"; bg="#FFFDF0"; color="#C9A84C"; border="#f0e090"; pulse=true;
  } else if (meta?.isDirty) {
    icon="🟡"; label="Unsynced"; bg="#FFFBF0"; color="#C9A84C"; border="#f0d870"; pulse=false;
  } else if (meta?.lastSyncedAt) {
    const mins = Math.floor((Date.now() - meta.lastSyncedAt) / 60000);
    const ago  = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
    icon="✅"; label=`Synced ${ago}`; bg="#F0FFF4"; color="#2E7D32"; border="#A5D6A7"; pulse=false;
  } else {
    icon="☁️"; label="Not saved"; bg="#F8F8F8"; color="#C0A0A0"; border="#e0e0e0"; pulse=false;
  }

  return (
    <button
      onClick={meta?.isDirty && isOnline && !isSyncing ? onSyncNow : undefined}
      style={{
        display:        "inline-flex",
        alignItems:     "center",
        gap:            5,
        padding:        "4px 10px",
        borderRadius:   20,
        border:         `1px solid ${border}`,
        background:     bg,
        color:          color,
        fontSize:       "0.6rem",
        fontFamily:     mono,
        fontWeight:     700,
        cursor:         meta?.isDirty && isOnline ? "pointer" : "default",
        letterSpacing:  "0.05em",
        transition:     "all 0.2s",
        animation:      pulse ? "pulse 1.2s infinite" : "none",
        userSelect:     "none",
      }}
      title={meta?.isDirty && isOnline ? "Tap to sync now" : label}
    >
      <span style={{ fontSize:"0.75rem" }}>{icon}</span>
      {label}
      {meta?.isDirty && isOnline && !isSyncing && (
        <span style={{ fontSize:"0.55rem", opacity:0.7 }}>· tap to sync</span>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </button>
  );
}