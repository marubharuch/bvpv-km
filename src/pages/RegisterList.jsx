import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

export default function RegisterList() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const registerRef = ref(db, "register");

    onValue(registerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        setRecords(list);
      } else {
        setRecords([]);
      }
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Register Records</h1>

      <div className="grid gap-3">
        {records.map((item) => (
          <div key={item.id} className="bg-white shadow p-4 rounded">
            <div><b>Name:</b> {item.applicantName}</div>
            <div><b>Contact:</b> {item.contact}</div>
            <div><b>Branch:</b> {item.branch}</div>
            <div><b>Date:</b> {item.caseReceivedDate}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
