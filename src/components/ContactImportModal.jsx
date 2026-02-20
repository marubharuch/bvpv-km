import { useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

/**
 * ContactImportModal
 * ✅ FIX: Uses /mobileIndex for O(1) phone lookup — no full families scan
 */
export default function ContactImportModal({ onClose, onFound }) {
  const [mobile, setMobile] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const search = async () => {
    const clean = mobile.replace(/\D/g, "").slice(-10);
    if (clean.length !== 10) {
      alert("Enter a valid 10-digit mobile number");
      return;
    }

    setSearching(true);
    setResult(null);
    setNotFound(false);

    // ✅ Single tiny read — /mobileIndex/{mobile}
    const snap = await get(ref(db, `mobileIndex/${clean}`));

    if (snap.exists()) {
      const { familyId, memberId } = snap.val();
      // Fetch only this member's data
      const memberSnap = await get(ref(db, `families/${familyId}/members/${memberId}`));
      if (memberSnap.exists()) {
        setResult({ familyId, memberId, ...memberSnap.val() });
      }
    } else {
      setNotFound(true);
    }

    setSearching(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 space-y-4">
        <h3 className="text-lg font-bold">Find by Mobile</h3>

        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="Enter mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="flex-1 border rounded-lg p-2.5 text-sm"
          />
          <button
            onClick={search}
            disabled={searching}
            className="bg-blue-600 text-white px-4 rounded-lg text-sm disabled:opacity-60"
          >
            {searching ? "..." : "Search"}
          </button>
        </div>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="font-semibold text-green-800">{result.name}</p>
            <p className="text-sm text-gray-600">{result.relation} · {result.mobile}</p>
            <button
              onClick={() => { onFound?.(result); onClose?.(); }}
              className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm"
            >
              Select
            </button>
          </div>
        )}

        {notFound && (
          <p className="text-sm text-gray-500 text-center">No member found with this number.</p>
        )}

        <button onClick={onClose} className="w-full border rounded-lg p-2.5 text-sm text-gray-600">
          Close
        </button>
      </div>
    </div>
  );
}
