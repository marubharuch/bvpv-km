export default function DobStep({ student, update }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Date of Birth</h2>

      <input
        type="date"
        value={student.dob || ""}
        onChange={(e) => update("dob", e.target.value)}
        className="border w-full p-2 rounded text-lg"
      />

      <p className="text-xs text-gray-500 mt-3">
        This helps us understand student age group.
      </p>
    </div>
  );
}
