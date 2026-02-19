// ─────────────────────────────────────────────────────────────
// RelationStrip
//
// Props:
//   selected  — currently selected relation string
//   onSelect  — (relation: string) => void
// ─────────────────────────────────────────────────────────────

const RELATIONS = [
  "Father", "Mother", "Son", "Daughter", "Brother", "Sister",
  "Husband", "Wife", "Head", "Father-in-law", "Mother-in-law",
  "Brother-in-law", "Sister-in-law", "Son-in-law", "Daughter-in-law",
  "Grandfather", "Grandmother", "Grandson", "Granddaughter",
  "Uncle", "Aunt", "Nephew", "Niece", "Cousin", "Guardian", "Other"
];

export default function RelationStrip({ selected, onSelect }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1.5">
        Relation <span className="text-red-400">*</span>
        {selected && (
          <span className="ml-2 text-indigo-600 font-bold">— {selected}</span>
        )}
      </p>

      {/* Horizontal scroll strip — hidden scrollbar on all browsers */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {RELATIONS.map(r => (
          <button
            key={r}
            type="button"
            onClick={() => onSelect(r)}
            className={`
              flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold
              border-2 transition-all active:scale-95
              ${selected === r
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              }
            `}
            style={{ whiteSpace: "nowrap" }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
