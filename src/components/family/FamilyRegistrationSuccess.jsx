export function FamilyRegistrationSuccess({ city, contacts, familyId, familyPin, onDone }) {
  return (
    <div className="p-6 pb-10 flex flex-col items-center text-center">
      <div className="text-6xl mb-4 animate-bounce">🎉</div>
      <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Family Registered!</h2>
      <p className="text-sm text-gray-500 mb-6">
        Welcome, <span className="font-bold text-gray-700">{contacts[0]?.name}</span>
      </p>

      {/* Summary card */}
      <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left mb-5 divide-y divide-gray-100">
        {[
          ["Family",    `${city} Family`],
          ["Family ID", familyId],
          ["PIN",       familyPin],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</span>
            <span className={`text-sm font-bold ${label === "PIN" ? "text-green-700 font-mono text-lg tracking-widest" : "text-gray-900 font-mono"}`}>
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* Members */}
      <div className="w-full text-left mb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
          Members ({contacts.length})
        </p>
        <div className="flex flex-col gap-2">
          {contacts.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${i === 0 ? "bg-amber-50 border border-amber-200" : "bg-gray-50 border border-gray-100"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${i === 0 ? "bg-amber-200 text-amber-800" : "bg-gray-200 text-gray-500"}`}>
                {i === 0 ? "👑" : i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.phone}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PIN note */}
      <div className="w-full bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-left text-xs text-yellow-800 font-medium mb-6 leading-relaxed">
        📌 Save your PIN <strong className="font-black">{familyPin}</strong> — you may need it to manage your family.
      </div>

      {onDone && (
        <button
          onClick={onDone}
          className="w-full py-4 bg-green-500 hover:bg-green-600 text-white text-base font-extrabold rounded-2xl transition active:scale-[0.98]"
        >
          Go to Home →
        </button>
      )}
    </div>
  );
}
