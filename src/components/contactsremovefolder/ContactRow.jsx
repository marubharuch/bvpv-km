import RelationStrip from "./RelationStrip";

export default function ContactRow({
  member,
  index,
  onChange,
  onRemove,
  autoFocus = false
}) {
  return (
    <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          Member {index + 1}
        </span>

        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-500 border border-red-200 px-3 py-1 rounded-full hover:bg-red-50"
        >
          Remove
        </button>
      </div>

      {/* Name + Mobile */}
      <div className="flex gap-2">
        {/* NAME */}
        <input
          type="text"
          autoFocus={autoFocus}
          placeholder="Full name"
          value={member.name || ""}
          onChange={(e) => onChange("name", e.target.value)}
          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 outline-none bg-white"
        />

        {/* MOBILE — GLOBAL SUPPORT */}
        <input
          type="tel"
          placeholder="Mobile"
          value={member.mobile || ""}
          onChange={(e) => {
            // Allow international numbers
            if (/^[0-9+\s\-()]*$/.test(e.target.value)) {
              onChange("mobile", e.target.value);
            }
          }}
          className="w-40 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 outline-none bg-white"
        />
      </div>

      {/* Relation (optional) */}
      {/* Uncomment if you want relation selection */}
      {/*
      <RelationStrip
        selected={member.relation}
        onSelect={(val) => onChange("relation", val)}
      />
      */}
    </div>
  );
}