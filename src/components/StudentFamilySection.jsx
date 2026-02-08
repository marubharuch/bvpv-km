import { useState, useEffect } from "react";

export default function StudentFamilySection({ student, update }) {
  const [contacts, setContacts] = useState([]);
  const [errors, setErrors] = useState({});

  // Sync when draft loads
  useEffect(() => {
    setContacts(student.familyContacts || []);
  }, [student.familyContacts]);

  const isContactSupported =
    typeof navigator !== "undefined" &&
    navigator.contacts &&
    typeof navigator.contacts.select === "function";

  const openContactPicker = async () => {
    try {
      const picked = await navigator.contacts.select(
        ["name", "tel"],
        { multiple: true }
      );

      const formatted = picked.map(c => ({
        name: c.name?.[0] || "",
        phone: c.tel?.[0] || "",
        relation: ""
      }));

      const updated = [...contacts, ...formatted];
      setContacts(updated);
      update("familyContacts", updated);

    } catch {}
  };

  const addEmptyCard = () => {
    const updated = [...contacts, { name: "", phone: "", relation: "" }];
    setContacts(updated);
    update("familyContacts", updated);
  };

  const updateCard = (index, key, value) => {
    const updated = [...contacts];
    updated[index][key] = value;
    setContacts(updated);
    update("familyContacts", updated);

    // Clear error on change
    setErrors(prev => ({ ...prev, [`${key}${index}`]: "" }));
  };

  const deleteCard = (index) => {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    update("familyContacts", updated);
  };

  const validate = (key, value, index) => {
    let error = "";

    if (!value) error = "Required";
    else if (key === "phone" && !/^[6-9]\d{9}$/.test(value))
      error = "Invalid 10-digit mobile";

    setErrors(prev => ({ ...prev, [`${key}${index}`]: error }));
  };

  return (
    <div className="space-y-3">

      {isContactSupported && (
        <button
          onClick={openContactPicker}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Import Contacts
        </button>
      )}

      <button
        onClick={addEmptyCard}
        className="bg-gray-200 px-3 py-1 rounded text-sm"
      >
        Add Contact Manually
      </button>

      {contacts.map((c, i) => (
        <div key={i} className="bg-white p-3 rounded shadow relative">

          <button
            onClick={() => deleteCard(i)}
            className="absolute top-1 right-2 text-red-500 text-sm"
          >
            ✕
          </button>

          {/* NAME */}
          <input
            className="border w-full mb-1 p-1"
            placeholder="Name"
            value={c.name}
            onChange={(e)=>updateCard(i, "name", e.target.value)}
            onBlur={(e)=>validate("name", e.target.value, i)}
          />
          {errors[`name${i}`] && (
            <p className="text-red-500 text-xs">{errors[`name${i}`]}</p>
          )}

          {/* PHONE */}
          <input
            className="border w-full mb-1 p-1"
            placeholder="Mobile Number"
            value={c.phone}
            inputMode="numeric"
            maxLength={10}
            onChange={(e)=>{
              const val = e.target.value.replace(/\D/g, "");
              updateCard(i, "phone", val);
            }}
            onBlur={(e)=>validate("phone", e.target.value, i)}
          />
          {errors[`phone${i}`] && (
            <p className="text-red-500 text-xs">{errors[`phone${i}`]}</p>
          )}

          {/* RELATION */}
          <select
            className="border w-full p-1"
            value={c.relation}
            onChange={(e)=>updateCard(i, "relation", e.target.value)}
            onBlur={(e)=>validate("relation", e.target.value, i)}
          >
            <option value="">Select Relation</option>
            <option>Father</option>
            <option>Mother</option>
            <option>Guardian</option>
            <option>Sibling</option>
            <option>Other</option>
          </select>
          {errors[`relation${i}`] && (
            <p className="text-red-500 text-xs">{errors[`relation${i}`]}</p>
          )}

        </div>
      ))}

    </div>
  );
}
