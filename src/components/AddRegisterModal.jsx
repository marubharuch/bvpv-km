import { useState } from "react";
import { ref, push } from "firebase/database";
import { db } from "../firebase";

export default function AddRegisterModal({ close }) {
  const [form, setForm] = useState({
    caseReceivedDate: "",
    branch: "",
    applicantName: "",
    contact: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!form.applicantName || !form.contact) {
      alert("Name and Contact required");
      return;
    }

    push(ref(db, "register"), form);
    close(); // close modal
  };

  return (
   <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">

      <div className="bg-white p-6 rounded-lg w-96 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Add Register Case</h2>

        <input
          type="date"
          name="caseReceivedDate"
          onChange={handleChange}
          className="border p-2 w-full mb-2"
        />

        <input
          type="text"
          name="branch"
          placeholder="Branch"
          onChange={handleChange}
          className="border p-2 w-full mb-2"
        />

        <input
          type="text"
          name="applicantName"
          placeholder="Applicant Name"
          onChange={handleChange}
          className="border p-2 w-full mb-2"
        />

        <input
          type="text"
          name="contact"
          placeholder="Contact"
          onChange={handleChange}
          className="border p-2 w-full mb-4"
        />

        <div className="flex justify-end gap-2">
          <button onClick={close} className="px-4 py-2 bg-gray-400 text-white rounded">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
