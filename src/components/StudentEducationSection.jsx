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

  const collegeYears     = ["1st Year","2nd Year","3rd Year","Final Year"];
  const pgYears          = ["PG Year 1","PG Final Year"];
  const diplomaYears     = ["Year 1","Year 2","Year 3"];
  const degreePrograms   = ["BSc","BCom","BA","BBA","BE/BTech","MBBS","BDS","BPharma","Law","Other"];
  const professionalCourses = ["CA","CS","CMA","CFA","Other"];
  const professionalStages  = ["Foundation","Inter","Final"];

  const isSchool      = student.educationType === "School Student";
  const isCollege     = student.educationType === "College Student";
  const isPG          = student.educationType === "Postgraduate";
  const isDiploma     = student.educationType === "Diploma / ITI";
  const isProfessional= student.educationType === "Professional Course";
  const isCompetitive = student.educationType === "Competitive Prep";

  const numericGrade = parseInt(student.standard);
  const needsSchoolStream = isSchool && numericGrade >= 11;

  // ✅ Reset child fields when education type changes
  const handleEducationTypeChange = (value) => {
    update("educationType", value);
    // Clear all education-specific fields to prevent stale data
    update("standard", "");
    update("stream", "");
    update("medium", "");
    update("year", "");
    update("degree", "");
    update("specialization", "");
    update("collegeName", "");
    update("courseName", "");
    update("courseStage", "");
    update("exam", "");
  };

  // Reusable styled select
  const StyledSelect = ({ label, value, onChange, options }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none"
      >
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-3 mt-2">

      {/* Education Type */}
      <StyledSelect
        label="Education Level"
        value={student.educationType}
        onChange={handleEducationTypeChange}
        options={educationTypes}
      />

      {/* SCHOOL STUDENT */}
      {isSchool && (
        <>
          <StyledSelect
            label="Class / Grade"
            value={student.standard}
            onChange={v => update("standard", v)}
            options={schoolStandards}
          />

          {needsSchoolStream && (
            <StyledSelect
              label="Stream"
              value={student.stream}
              onChange={v => update("stream", v)}
              options={["Science","Commerce","Arts"]}
            />
          )}

          <StyledSelect
            label="Medium of Instruction"
            value={student.medium}
            onChange={v => update("medium", v)}
            options={["English","Gujarati","Hindi"]}
          />
        </>
      )}

      {/* COLLEGE STUDENT */}
      {isCollege && (
        <>
          <StyledSelect
            label="Year of Study"
            value={student.year}
            onChange={v => update("year", v)}
            options={collegeYears}
          />

          <StyledSelect
            label="Degree Program"
            value={student.degree}
            onChange={v => update("degree", v)}
            options={degreePrograms}
          />

          <StudentPaperField
            label="Branch / Major Subject"
            value={student.specialization}
            onSave={v => update("specialization", v)}
          />

          <StudentPaperField
            label="College Name"
            value={student.collegeName}
            onSave={v => update("collegeName", v)}
          />
        </>
      )}

      {/* POSTGRADUATE */}
      {isPG && (
        <>
          <StyledSelect
            label="Year"
            value={student.year}
            onChange={v => update("year", v)}
            options={pgYears}
          />

          <StudentPaperField
            label="Major / Specialization"
            value={student.specialization}
            onSave={v => update("specialization", v)}
          />
        </>
      )}

      {/* DIPLOMA / ITI */}
      {isDiploma && (
        <>
          <StyledSelect
            label="Year"
            value={student.year}
            onChange={v => update("year", v)}
            options={diplomaYears}
          />

          <StudentPaperField
            label="Branch / Trade"
            value={student.specialization}
            onSave={v => update("specialization", v)}
          />
        </>
      )}

      {/* PROFESSIONAL COURSE */}
      {isProfessional && (
        <>
          <StyledSelect
            label="Professional Course"
            value={student.courseName}
            onChange={v => update("courseName", v)}
            options={professionalCourses}
          />

          <StyledSelect
            label="Stage / Level"
            value={student.courseStage}
            onChange={v => update("courseStage", v)}
            options={professionalStages}
          />
        </>
      )}

      {/* COMPETITIVE PREP */}
      {isCompetitive && (
        <StudentPaperField
          label="Exam Name"
          value={student.exam}
          onSave={v => update("exam", v)}
        />
      )}

    </div>
  );
}