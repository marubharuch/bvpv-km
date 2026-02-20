import RelationStrip from "./RelationStrip";

// ─────────────────────────────────────────────────────────────
// ContactRow
//
// One editable contact row: Name + Number inputs, RelationStrip below.
//
// Props:
//   contact   — { name, number, relation }
//   index     — row index (for labels and accessibility)
//   onChange  — (field: string, value: string) => void
//   onRemove  — () => void
//   autoFocus — bool — focus name input on mount (for newly added rows)
// ─────────────────────────────────────────────────────────────

export default function ContactRow({ contact, index, onChange, onRemove, autoFocus = false }) {
  return (
    <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 space-y-3">

      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          Contact {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-400 border border-red-200 px-3 py-1 rounded-full hover:bg-red-50 transition-colors active:scale-95"
        >
          Remove
        </button>
      </div>

      {/* Name + Number — side by side */}
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="words"
          autoFocus={autoFocus}
          placeholder="Name"
          value={contact.name}
          onChange={e => {
            // English characters only — show value, parent validates
            onChange("name", e.target.value);
          }}
          className="flex-1 min-w-0 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none bg-white transition-colors"
          aria-label={`Contact ${index + 1} name`}
        />
        <input
          type="tel"
          inputMode="tel"
          placeholder="Mobile"
          value={contact.number}
          onChange={e => {
            // Digits, +, spaces, dashes only
            if (/^[0-9+\s\-()]*$/.test(e.target.value)) {
              onChange("number", e.target.value);
            }
          }}
          className="w-36 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-500 focus:outline-none bg-white transition-colors"
          aria-label={`Contact ${index + 1} mobile number`}
        />
      </div>

      {/* Relation horizontal strip */}
     {/* <RelationStrip
        selected={contact.relation}
        onSelect={val => onChange("relation", val)}
      />*/}
    </div>
  );
}
