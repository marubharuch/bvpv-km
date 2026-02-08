import { useState } from "react";
import StudentPaperField from "./StudentPaperField";

export default function StudentContactField({
  label,
  nameKey,
  phoneKey,
  student,
  update
}) {
  const [manualMode, setManualMode] = useState(false);

  const isContactSupported =
    typeof navigator !== "undefined" &&
    navigator.contacts &&
    typeof navigator.contacts.select === "function";

  const pickContact = async () => {
    try {
      const contacts = await navigator.contacts.select(
        ["name", "tel"],
        { multiple: false }
      );

      if (contacts.length > 0) {
        const c = contacts[0];
        update(nameKey, c.name?.[0] || "");
        update(phoneKey, c.tel?.[0] || "");
      }
    } catch {
      setManualMode(true);
    }
  };

  if (!isContactSupported || manualMode) {
    return (
      <>
        <StudentPaperField
          label={`${label} Name:`}
          value={student[nameKey]}
          onSave={(v)=>update(nameKey, v)}
        />
        <StudentPaperField
          label={`${label} Mobile:`}
          value={student[phoneKey]}
          onSave={(v)=>update(phoneKey, v)}
        />
      </>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-2">
      <span>{label}:</span>
      <div
        className="border-b border-black flex-1 cursor-pointer"
        onClick={pickContact}
      >
        {student[nameKey] || "Tap to select contact"}
      </div>
      <button onClick={()=>setManualMode(true)} className="text-xs text-blue-600">
        Type
      </button>
    </div>
  );
}
