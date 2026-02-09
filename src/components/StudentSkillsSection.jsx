import { useState } from "react";

const skillOptions = {
  indoorSports: ["Chess", "Carrom", "TT"],
  outdoorSports: ["Cricket", "Badminton"],
  talents: ["Singing", "Dancing", "Anchoring", "Acting"],
  creative: ["Reel Making", "Content Writing"],
  hobbies: ["Tracking"],
  funActivities: ["Antakshari", "Quiz", "One Minute"]
};

export default function StudentSkillsSection({ student, update }) {

  const [customInput, setCustomInput] = useState({});

  const toggleSkill = (category, skill) => {
    const current = student.skills || {};
    const list = current[category] || [];

    const updatedList = list.includes(skill)
      ? list.filter(s => s !== skill)
      : [...list, skill];

    update("skills", { ...current, [category]: updatedList });
  };

  const addCustomSkill = (category) => {
    const value = customInput[category]?.trim();
    if (!value) return;

    const current = student.skills || {};
    const list = current[category] || [];

    if (!list.includes(value)) {
      update("skills", { ...current, [category]: [...list, value] });
    }

    setCustomInput({ ...customInput, [category]: "" });
  };

  const removeSkill = (category, skill) => {
    const current = student.skills || {};
    const list = (current[category] || []).filter(s => s !== skill);
    update("skills", { ...current, [category]: list });
  };

  const renderCategory = (title, key) => {
    const selected = student.skills?.[key] || [];

    return (
      <div className="mb-5 border-b pb-3">
        <h4 className="font-semibold mb-2">{title}</h4>

        {/* Default Options */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
          {skillOptions[key].map(skill => (
            <label key={skill} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(skill)}
                onChange={() => toggleSkill(key, skill)}
              />
              {skill}
            </label>
          ))}
        </div>

        {/* Custom Add */}
        <div className="flex gap-2 mb-2">
          <input
            value={customInput[key] || ""}
            onChange={(e)=>setCustomInput({...customInput, [key]: e.target.value})}
            placeholder="Add other..."
            className="border-b border-black bg-transparent flex-1 text-sm"
          />
          <button onClick={()=>addCustomSkill(key)} className="bg-blue-600 text-white px-2 rounded text-sm">Add</button>
        </div>

        {/* Selected Skills Display */}
        <div className="flex flex-wrap gap-2">
          {selected.map(skill => (
            <span key={skill} className="bg-yellow-200 px-2 py-1 rounded text-xs flex items-center gap-1">
              {skill}
              <button onClick={()=>removeSkill(key, skill)} className="text-red-600">✕</button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4">
      <h3 className="font-bold text-lg mb-3">Skills, Talents & Activities</h3>

      {renderCategory("Indoor Sports", "indoorSports")}
      {renderCategory("Outdoor Sports", "outdoorSports")}
      {renderCategory("Talents", "talents")}
      {renderCategory("Creative Skills", "creative")}
      {renderCategory("Hobbies", "hobbies")}
      {renderCategory("Fun Event Activities", "funActivities")}
    </div>
  );
}
