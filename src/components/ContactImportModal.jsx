    import { useState } from "react";

export default function ContactImportModal({ contact, onSave }) {
  const [data, setData] = useState(contact);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded w-80 shadow-lg">
        <h2 className="font-semibold mb-3 text-center">Confirm Contact</h2>

        <input
          className="border w-full mb-2 p-2"
          value={data.name}
          onChange={(e)=>setData({...data, name:e.target.value})}
          placeholder="Name"
        />

        <input
          className="border w-full mb-2 p-2"
          value={data.phone}
          onChange={(e)=>setData({...data, phone:e.target.value})}
          placeholder="Mobile Number"
        />

        <select
          className="border w-full mb-3 p-2"
          value={data.relation}
          onChange={(e)=>setData({...data, relation:e.target.value})}
        >
          <option value="">Select Relation</option>
          <option>Father</option>
          <option>Mother</option>
          <option>Guardian</option>
        </select>

        <button
          className="bg-green-600 text-white w-full p-2 rounded"
          onClick={()=>onSave(data)}
        >
          Save & Next
        </button>
      </div>
    </div>
  );
}
