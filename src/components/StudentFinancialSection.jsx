export default function StudentFinancialSection({ student, update }) {

  const toggleNeed = (val) => {
    update("needsScholarship", val);
    if (!val) update("supportType", {});
  };

  const toggleSupport = (key) => {
    const current = student.supportType || {};
    update("supportType", { ...current, [key]: !current[key] });
  };

  return (
    <div className="mt-4">
      <h3 className="font-bold text-lg mb-2">Scholarship / Financial Support</h3>

      <div className="flex gap-4 mb-3">
        <label>
          <input
            type="radio"
            checked={student.needsScholarship === true}
            onChange={()=>toggleNeed(true)}
          /> Yes
        </label>
        <label>
          <input
            type="radio"
            checked={student.needsScholarship === false}
            onChange={()=>toggleNeed(false)}
          /> No
        </label>
      </div>

      {student.needsScholarship && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {["fees","books","coaching","counseling"].map(type => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={student.supportType?.[type] || false}
                onChange={()=>toggleSupport(type)}
              />
              {type.charAt(0).toUpperCase()+type.slice(1)} Support
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
