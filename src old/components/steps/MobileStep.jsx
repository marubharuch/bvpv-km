import StudentMobileField from "../../components/StudentMobileField";

export default function MobileStep({ student, update }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Mobile Number</h2>

      <StudentMobileField
        value={student.mobile}
        onSave={(v) => update("mobile", v)}
      />

      <p className="text-xs text-gray-500 mt-3">
        Used for important communication & student identification.
      </p>
    </div>
  );
}
