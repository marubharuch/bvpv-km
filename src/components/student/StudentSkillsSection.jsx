import { useState, useEffect } from "react";

const SKILL_STEPS = [
  { key: "indoorSports",  title: "Indoor Sports",       emoji: "🏓", options: ["Chess", "Carrom", "TT", "Badminton (Indoor)", "Snooker"] },
  { key: "outdoorSports", title: "Outdoor Sports",      emoji: "🏏", options: ["Cricket", "Badminton", "Football", "Kabaddi", "Athletics"] },
  { key: "talents",       title: "Talents",             emoji: "🎤", options: ["Singing", "Dancing", "Anchoring", "Acting", "Public Speaking"] },
  { key: "creative",      title: "Creative Skills",     emoji: "🎨", options: ["Reel Making", "Content Writing", "Photography", "Drawing", "Craft"] },
  { key: "hobbies",       title: "Hobbies",             emoji: "📖", options: ["Trekking", "Reading", "Gardening", "Cooking", "Travel"] },
  { key: "funActivities", title: "Fun Activities",      emoji: "🎉", options: ["Antakshari", "Quiz", "One Minute Games", "Dumb Charades"] },
  { key: "about",         title: "About & Achievements",emoji: "🏆", options: [] }
];

export default function StudentSkillsSection({
  student,
  update,
  cardIndex,
  setCardIndex,
  exitSkillsMode
}) {
  const [customInput, setCustomInput] = useState("");

  const step = SKILL_STEPS[cardIndex];
  const isAboutCard = step.key === "about";

  // ✅ Clear custom input when switching cards
  useEffect(() => {
    setCustomInput("");
  }, [cardIndex]);

  const selected = student.skills?.[step.key] || [];
  const selectedCount = selected.length;

  const toggleSkill = (skill) => {
    const current = student.skills || {};
    const list = current[step.key] || [];
    const updated = list.includes(skill)
      ? list.filter(s => s !== skill)
      : [...list, skill];
    update("skills", { ...current, [step.key]: updated });
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    toggleSkill(trimmed);
    setCustomInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") addCustom();
  };

  const goNext = () => { if (cardIndex < SKILL_STEPS.length - 1) setCardIndex(cardIndex + 1); };
  const goPrev = () => { if (cardIndex > 0) setCardIndex(cardIndex - 1); };

  const progressPct = ((cardIndex + 1) / SKILL_STEPS.length) * 100;

  // Custom skills = selected items that aren't in the predefined options
  const customSkills = selected.filter(s => !step.options.includes(s));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── HEADER ── */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-400">
              Step {cardIndex + 1} of {SKILL_STEPS.length}
            </span>
            {/* ✅ Exit button always visible */}
            <button
              onClick={exitSkillsMode}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold leading-none"
              aria-label="Exit skills section"
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-400"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Title */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{step.emoji}</span>
            <h3 className="text-lg font-bold text-gray-800">{step.title}</h3>
          </div>

          {/* Selected count badge */}
          {!isAboutCard && (
            <p className="text-xs text-gray-400">
              {selectedCount === 0
                ? "Tap to select all that apply"
                : <span className="text-green-600 font-semibold">{selectedCount} selected ✓</span>
              }
            </p>
          )}
        </div>

        {/* ── SKILL CARDS ── */}
        <div className="px-5 pb-3 max-h-[50vh] overflow-y-auto">

          {!isAboutCard && (
            <>
              {/* Predefined options as tap cards */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {step.options.map(skill => {
                  const checked = selected.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm ${
                        checked
                          ? "border-green-400 bg-green-50 text-green-800 font-medium"
                          : "border-gray-200 bg-gray-50 text-gray-600"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs ${
                        checked ? "border-green-500 bg-green-500 text-white" : "border-gray-300"
                      }`}>
                        {checked && "✓"}
                      </span>
                      {skill}
                    </button>
                  );
                })}
              </div>

              {/* ✅ Show custom skills that have been added */}
              {customSkills.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Added by you:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customSkills.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2.5 py-1 rounded-full"
                      >
                        {skill}
                        <span className="text-indigo-400 ml-0.5">✕</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom input */}
              <div className="flex gap-2">
                <input
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add something else..."
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button
                  onClick={addCustom}
                  disabled={!customInput.trim()}
                  className="bg-green-600 text-white px-4 rounded-xl text-sm font-medium disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </>
          )}

          {/* ── ABOUT CARD ── */}
          {isAboutCard && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  🏅 Achievements
                </label>
                <textarea
                  placeholder="Competitions won, awards received, certificates..."
                  value={student.achievements || ""}
                  onChange={e => update("achievements", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  👤 About This Student
                </label>
                <textarea
                  placeholder="A short intro — personality, goals, interests..."
                  value={student.aboutMe || ""}
                  onChange={e => update("aboutMe", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER NAVIGATION ── */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={goPrev}
            disabled={cardIndex === 0}
            className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm font-medium text-gray-600 disabled:opacity-30"
          >
            ← Back
          </button>

          {cardIndex < SKILL_STEPS.length - 1 ? (
            <button
              onClick={goNext}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={exitSkillsMode}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold"
            >
              ✅ Done
            </button>
          )}
        </div>

      </div>
    </div>
  );
}