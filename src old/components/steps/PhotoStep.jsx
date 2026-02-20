import StudentPaperPhoto from "../../components/StudentPaperPhoto";

export default function PhotoStep({ student, update }) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Student Photo</h2>

      <div className="flex justify-center">
        <StudentPaperPhoto
          photo={student.photo}
          onChange={(v) => update("photo", v)}
        />
      </div>

      <p className="text-xs text-gray-500 mt-3 text-center">
        You can skip this and add later.
      </p>
    </div>
  );
}
