// ─────────────────────────────────────────────────────────────
// ConfirmedContactLabels
//
// Read-only display of confirmed contacts as green label cards.
// Reused in two places in StudentFormPage:
//   1. Section "contacts" — after confirming, before moving on
//   2. Review section — summary before final submit
//
// Props:
//   contacts  — array of { name, number, relation }
//   onEdit    — optional () => void — shows "Edit" button to reopen modal
//   compact   — bool — smaller labels for review section (default false)
// ─────────────────────────────────────────────────────────────

export default function ConfirmedContactLabels({ contacts = [], onEdit, compact = false }) {
  if (!contacts.length) return null;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <p className={`font-bold text-gray-800 ${compact ? "text-xs" : "text-sm"}`}>
          Family Contacts
          <span className="ml-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
            {contacts.length} added
          </span>
        </p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-indigo-500 border border-indigo-200 px-3 py-1 rounded-full hover:bg-indigo-50 transition-colors font-semibold"
          >
            Edit
          </button>
        )}
      </div>

      {/* Label chips */}
      <div className={`flex flex-wrap gap-2 ${compact ? "" : ""}`}>
        {contacts.map((c, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 bg-green-50 border-2 border-green-200 rounded-2xl shadow-sm
              ${compact ? "px-3 py-1.5" : "px-4 py-2.5"}`}
          >
            <span className={`text-green-500 ${compact ? "text-xs" : "text-sm"}`}>✓</span>
            <div className="min-w-0">
              <p className={`font-bold text-gray-900 leading-tight truncate ${compact ? "text-xs" : "text-sm"}`}>
                {c.name || "—"}
              </p>
              <p className={`text-gray-500 ${compact ? "text-xs" : "text-xs"}`}>
                {c.relation}
                {c.number ? ` · ${c.number}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
