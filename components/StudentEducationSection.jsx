import StudentPaperField from "./StudentPaperField";

export default function StudentEducationSection({ student, update }) {

  const educationTypes = [
    "School Student",
    "College Student",
    "Postgraduate",
    "Diploma / ITI",
    "Professional Course",
    "Competitive Prep"
  ];

  const schoolStandards = [
    "Nursery","Jr KG","Sr KG",
    "1st","2nd","3rd","4th","5th","6th","7th","8th",
    "9th","10th","11th","12th"
  ];

  const collegeYears = ["1st Year","2nd Year","3rd Year","Final Year"];
  const pgYears = ["PG Year 1","PG Final Year"];
  const diplomaYears = ["Year 1","Year 2","Year 3"];

  const degreePrograms = [
    "BSc","BCom","BA","BBA","BE/BTech","MBBS","BDS","BPharma","Law","Other"
  ];

  const professionalCourses = ["CA","CS","CMA","CFA","Other"];
  const professionalStages = ["Foundation","Inter","Final"];

  const isSchool = student.educationType === "School Student";
  const isCollege = student.educationType === "College Student";
  const isPG = student.educationType === "Postgraduate";
  const isDiploma = student.educationType === "Diploma / ITI";
  const isProfessional = student.educationType === "Professional Course";
  const isCompetitive = student.educationType === "Competitive Prep";

  const numericGrade = parseInt(student.standard);
  const needsSchoolStream = isSchool && numericGrade >= 11;

  return (
    <div className="space-y-3">

      {/* Education Type */}
      <div>
        <label className="text-sm">Education Level:</label>
        <select
          value={student.educationType || ""}
          onChange={(e)=>update("educationType", e.target.value)}
          className="border-b border-black ml-2"
        >
          <option value="">Select</option>
          {educationTypes.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* SCHOOL STUDENT */}
      {isSchool && (
        <>
          <div>
            <label className="text-sm">Class / Grade:</label>
            <select
              value={student.standard || ""}
              onChange={(e)=>update("standard", e.target.value)}
              className="border-b border-black ml-2"
            >
              <option value="">Select</option>
              {schoolStandards.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {needsSchoolStream && (
            <div>
              <label className="text-sm">Stream:</label>
              <select
                value={student.stream || ""}
                onChange={(e)=>update("stream", e.target.value)}
                className="border-b border-black ml-2"
              >
                <option value="">Select</option>
                <option>Science</option>
                <option>Commerce</option>
                <option>Arts</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-sm">Medium of Instruction:</label>
            <select
              value={student.medium || ""}
              onChange={(e)=>update("medium", e.target.value)}
              className="border-b border-black ml-2"
            >
              <option value="">Select</option>
              <option>English</option>
              <option>Gujarati</option>
              <option>Hindi</option>
            </select>
          </div>
        </>
      )}

      {/* COLLEGE STUDENT */}
      {isCollege && (
        <>
          <div>
            <label className="text-sm">Year of Study:</label>
            <select
              value={student.year || ""}
              onChange={(e)=>update("year", e.target.value)}
              className="border-b border-black ml-2"
            >
              <option value="">Select</option>
              {collegeYears.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm">Degree Program:</label>
            <select
              value={student.degree || ""}
              onChange={(e)=>update("degree", e.target.value)}
              className="border-b border-black ml-2"
            >
              <option value="">Select</option>
              {degreePrograms.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          <StudentPaperField
            label="Branch / Major Subject:"
            value={student.specialization}
            onSave={(v)=>update("specialization", v)}
          />

          <StudentPaperField
            label="College Name:"
            value={student.collegeName}
            onSave={(v)=>update("collegeName", v)}
          />
        </>
      )}

      {/* POSTGRADUATE */}
      {isPG && (
        <>
          <div>
            <label className="text-sm">Year:</label>
            <select
              value={student.year || ""}
              onChange={(e)=>update("year", e.target.value)}
              className="border-b border-black ml-2"
            >
              <option value="">Select</option>
              {pgYears.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>

          <StudentPaperField
            label="Major / Specialization:"
            value={student.specialization}
            onSave={(v)=>update("specialization", v)}
          />
        </>
      )}

      {/* DIPLOMA / ITI */}
      {isDiploma && (
        <>
          <div>
            <label className="text-sm">Year:</label>
            <select
              value={student.year || ""}
              onChange={(e)=>update("year", e.target.value)}
              className="border-b border-black ml-2"
            >
              <option value="">Select</option>
              {diplomaYears.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>

          <StudentPaperField
            label="Branch / Trade:"
            value={student.specialization}
            onSave={(v)=>update("specialization", v)}
          />
        </>
      )}

      {/* PROFESSIONAL COURSE */}
      {isProfessional && (
        <>
          <div>
            <label className="text-sm">Professional Course:</label>
            <select
              value={student.courseName || ""}
              onChange={(e)=>update("courseName", e.target.value)}
              className="border-b border-black ml-2"
            >
              <option value="">Select</option>
              {professionalCourses.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm">Stage / Level:</label>
            <select
              value={student.courseStage || ""}
              onChange={(e)=>update("courseStage", e.target.value)}
              className="border-b border-black ml-2"
            >
              <option value="">Select</option>
              {professionalStages.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </>
      )}

      {/* COMPETITIVE PREP */}
      {isCompetitive && (
        <StudentPaperField
          label="Exam Name:"
          value={student.exam}
          onSave={(v)=>update("exam", v)}
        />
      )}

    </div>
  );
}
