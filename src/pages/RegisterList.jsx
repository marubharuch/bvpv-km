import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

export default function RegisterList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    setLoading(true);
    // ✅ FIX: Use get() instead of onValue() — no continuous stream
    const snap = await get(ref(db, "register"));
    if (snap.exists()) {
      const list = Object.entries(snap.val()).map(([id, value]) => ({
        id,
        ...value,
      }));
      setRecords(list);
    } else {
      setRecords([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  if (loading) return <p className="p-6 text-gray-500">Loading...</p>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Register Records</h1>
        <button
          onClick={loadRecords}
          className="text-sm text-blue-600 border border-blue-300 px-3 py-1 rounded"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid gap-3">
        {records.map((item) => (
          <div key={item.id} className="bg-white shadow p-4 rounded">
            <div><b>Name:</b> {item.applicantName}</div>
            <div><b>Contact:</b> {item.contact}</div>
            <div><b>Branch:</b> {item.branch}</div>
            <div><b>Date:</b> {item.caseReceivedDate}</div>
          </div>
        ))}
        {records.length === 0 && (
          <p className="text-gray-500 text-sm">No records found.</p>
        )}
      </div>
    </div>
  );
}
