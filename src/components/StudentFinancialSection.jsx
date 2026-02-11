export default function StudentFinancialSection({ student, update }) {
  const isNeedy = student.needsScholarship === true;

  const handleNeedChange = (e) => {
    const value = e.target.value;
    const needsSchol = value === "yes";
    update("needsScholarship", needsSchol);
    
    if (!needsSchol) {
      update("supportType", {});
    }
  };

  const toggleSupport = (key) => {
    const current = student.supportType || {};
    update("supportType", { 
      ...current, 
      [key]: !current[key] 
    });
  };

  const supportOptions = [
    { id: "fees", label: "Fees" },
    { id: "books", label: "Books" },
    { id: "coaching", label: "Coaching" },
    { id: "counseling", label: "Counseling" },
  ];

  return (
    <div className="mt-4 p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="font-bold text-lg mb-4 text-gray-800">Educational Support Requirements</h3>
      
      {/* Dropdown for Yes/No */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Do you need educational support?
        </label>
        <select
          value={isNeedy ? "yes" : "no"}
          onChange={handleNeedChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Select --</option>
          <option value="yes">Yes, I need support</option>
          <option value="no">No, I don't need support</option>
        </select>
      </div>

      {isNeedy && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-md transition-all duration-300">
          <p className="text-sm font-medium text-gray-700">
            What type of support do you need? (Select all that apply)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {supportOptions.map(({ id, label }) => (
              <label key={id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={!!(student.supportType || {})[id]}
                  onChange={() => toggleSupport(id)}
                />
                <span className="text-sm text-gray-700">{label} Support</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}