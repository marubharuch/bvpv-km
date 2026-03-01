export default function StudentFinancialSection({ student, update }) {
  const needsScholarship = student.needsScholarship;
  const isNeedy = needsScholarship === true;

  const handleNeedChange = (e) => {
    const value = e.target.value;
    if (value === "") return;
    const needsSchol = value === "yes";
    update("needsScholarship", needsSchol);
    if (!needsSchol) {
      update("supportType", {});
    }
  };

  const toggleSupport = (key) => {
    const current = student.supportType || {};
    const updated = { ...current, [key]: !current[key] };
    // ✅ Only save keys that are true — don't pollute Firebase with false values
    const cleaned = Object.fromEntries(
      Object.entries(updated).filter(([, v]) => v === true)
    );
    update("supportType", cleaned);
  };

  const supportOptions = [
    { id: "fees",       label: "Fees",       icon: "💳" },
    { id: "books",      label: "Books",       icon: "📚" },
    { id: "coaching",   label: "Coaching",    icon: "🎯" },
    { id: "counseling", label: "Counseling",  icon: "🧠" },
  ];

  // ✅ Derive select value cleanly — no inline triple condition
  const selectValue =
    needsScholarship === true  ? "yes" :
    needsScholarship === false ? "no"  : "";

  const selectedCount = Object.values(student.supportType || {}).filter(Boolean).length;

  return (
    <div className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <h3 className="font-semibold text-sm text-gray-800">📋 Educational Support</h3>
        <p className="text-xs text-gray-500 mt-0.5">Does this student need any financial or academic help?</p>
      </div>

      <div className="p-4 space-y-4">

        {/* Yes / No selector as pill buttons instead of dropdown */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Need support?</p>
          <div className="flex gap-2">
            {[
              { value: "yes", label: "Yes, need help", color: "bg-red-50 border-red-200 text-red-700" },
              { value: "no",  label: "No, all good",   color: "bg-green-50 border-green-200 text-green-700" },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleNeedChange({ target: { value: opt.value } })}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${
                  selectValue === opt.value
                    ? opt.color + " scale-[1.02] shadow-sm"
                    : "bg-gray-50 border-gray-200 text-gray-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Support type checkboxes — only shown if needy */}
        {isNeedy && (
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              What kind of support? {selectedCount > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-xs">
                  {selectedCount} selected
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {supportOptions.map(({ id, label, icon }) => {
                const checked = !!(student.supportType || {})[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleSupport(id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      checked
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    <span className="text-base">{icon}</span>
                    <span className="text-xs font-medium">{label}</span>
                    {checked && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirmation message */}
        {selectValue === "no" && (
          <p className="text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2 text-center">
            ✅ Great! No support needed.
          </p>
        )}

      </div>
    </div>
  );
}