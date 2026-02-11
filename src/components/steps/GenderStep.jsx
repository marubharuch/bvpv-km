export default function GenderStep({ student, update }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Gender</h2>

      <div className="flex flex-col gap-3">
        {["Male", "Female"].map(g => (
          <label key={g} className="flex items-center gap-2 text-lg">
            <input
              type="radio"
              name="gender"
              value={g}
              checked={student.gender === g}
              onChange={() => update("gender", g)}
            />
            {g}
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-3">
        You can skip if you prefer not to say.
      </p>
    </div>
  );
}
