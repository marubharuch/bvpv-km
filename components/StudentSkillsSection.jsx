import { useState } from "react";

const steps = [
  { key: "indoorSports", title: "Indoor Sports", options: ["Chess", "Carrom", "TT"] },
  { key: "outdoorSports", title: "Outdoor Sports", options: ["Cricket", "Badminton"] },
  { key: "talents", title: "Talents", options: ["Singing", "Dancing", "Anchoring", "Acting"] },
  { key: "creative", title: "Creative Skills", options: ["Reel Making", "Content Writing"] },
  { key: "hobbies", title: "Hobbies", options: ["Tracking"] },
  { key: "funActivities", title: "Fun Activities", options: ["Antakshari", "Quiz", "One Minute"] },
  { key: "about", title: "Achievements & About", options: [] }
];

export default function StudentSkillsSection({
  student,
  update,
  cardIndex,
  setCardIndex,
  exitSkillsMode
}) {

  const EMPTY_SKILLS = {
  indoorSports: [],
  outdoorSports: [],
  talents: [],
  creative: [],
  hobbies: [],
  funActivities: []
};
  const step = steps[cardIndex];
  const [customInput, setCustomInput] = useState("");

  const selected = student.skills?.[step.key] || [];

  const toggleSkill = (skill) => {
    const current = student.skills || EMPTY_SKILLS;
    const list = current[step.key] || [];

    const updated = list.includes(skill)
      ? list.filter(s => s !== skill)
      : [...list, skill];

    update("skills", { ...current, [step.key]: updated });
  };

  const addCustom = () => {
    if (!customInput.trim()) return;
    toggleSkill(customInput.trim());
    setCustomInput("");
  };

  const nextCard = () => {
    if (cardIndex < steps.length - 1) setCardIndex(cardIndex + 1);
  };

  const prevCard = () => {
    if (cardIndex > 0) setCardIndex(cardIndex - 1);
  };

  return (
    <div className="fixed inset-0 bg-[#ece9e1] flex items-center justify-center z-40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 transition-all duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevCard} disabled={cardIndex===0} className="text-blue-600 text-xl">⬅</button>
          <div className="text-center">
            <h3 className="font-bold text-green-700">{step.title}</h3>
            <p className="text-xs text-gray-500">{cardIndex+1} / {steps.length}</p>
          </div>
          <button onClick={nextCard} disabled={cardIndex===steps.length-1} className="text-blue-600 text-xl">➡</button>
        </div>

        <div className="h-1 bg-gray-200 rounded mb-4">
          <div
            className="h-1 bg-green-500 rounded"
            style={{ width: `${((cardIndex+1)/steps.length)*100}%` }}
          />
        </div>

        {/* Normal skill cards */}
        {step.key !== "about" && (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              {step.options.map(skill => (
                <label key={skill} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selected.includes(skill)}
                    onChange={() => toggleSkill(skill)}
                  />
                  {skill}
                </label>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <input
                value={customInput}
                onChange={(e)=>setCustomInput(e.target.value)}
                placeholder="Add other..."
                className="border-b border-black bg-transparent flex-1"
              />
              <button onClick={addCustom} className="bg-blue-600 text-white px-3 rounded">Add</button>
            </div>
          </>
        )}

        {/* Achievements card */}
        {step.key === "about" && (
          <>
            <h4 className="font-semibold mb-2">Achievements</h4>
            <textarea
              placeholder="Competitions, awards..."
              value={student.achievements || ""}
              onChange={(e)=>update("achievements", e.target.value)}
              className="border w-full p-2 rounded text-sm mb-3"
            />

            <h4 className="font-semibold mb-2">About Student</h4>
            <textarea
              placeholder="Write something..."
              value={student.aboutMe || ""}
              onChange={(e)=>update("aboutMe", e.target.value)}
              className="border w-full p-2 rounded text-sm"
            />
          </>
        )}

        {/* Finish Button */}
        {cardIndex === steps.length - 1 && (
          <button
            onClick={exitSkillsMode}
            className="w-full bg-green-600 text-white p-2 rounded mt-4"
          >
            Finish Skills Section
          </button>
        )}

      </div>
    </div>
  );
}
