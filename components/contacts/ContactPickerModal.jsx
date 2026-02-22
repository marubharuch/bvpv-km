import { useEffect, useRef } from "react";
import ContactRow from "./ContactRow";

export default function ContactPickerModal({
  members = [],   // ✅ default empty array — prevents undefined crash
  loading,
  error,
  onPickFromDevice,
  onAddManual,
  onUpdateMember,
  onRemoveMember,
  onConfirm,
  onClose,
}) {

  // Track newly added row
  const prevLengthRef = useRef(members.length);

  const newRowIndex =
    members.length > prevLengthRef.current
      ? members.length - 1
      : null;

  useEffect(() => {
    prevLengthRef.current = members.length;
  }, [members.length]);

  // Scroll to new row
  const newRowRef = useRef(null);

  useEffect(() => {
    if (newRowRef.current) {
      newRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [members.length]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="flex-shrink-0 px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Family Members</h3>
            <p className="text-xs text-gray-400">
              {members.length === 0
                ? "Pick from phone or add manually"
                : `${members.length} member${
                    members.length > 1 ? "s" : ""
                  } — fill name & mobile`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 text-xl"
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {members.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-5xl mb-3">👨‍👩‍👧</p>
              <p className="text-sm text-gray-400">
                No members yet
              </p>
            </div>
          ) : (
            members.map((m, i) => (
              <div
                key={i}
                ref={i === members.length - 1 ? newRowRef : null}
              >
                <ContactRow
                  member={m}
                  index={i}
                  onChange={(field, value) =>
                    onUpdateMember(i, field, value)
                  }
                  onRemove={() => onRemoveMember(i)}
                  autoFocus={i === newRowIndex}
                />
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="px-4 pb-6 pt-3 border-t space-y-3">

          {/* Pick + Manual Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onPickFromDevice}
              disabled={loading}
              className="flex-1 border-2 py-3 rounded-xl"
            >
              {loading ? "Loading..." : "📱 Pick from Phone"}
            </button>

            <button
              onClick={onAddManual}
              className="flex-1 border-2 py-3 rounded-xl"
            >
              ➕ Add Manual
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border rounded-xl px-4 py-2">
              <p className="text-red-600 text-sm">
                ⚠ {error}
              </p>
            </div>
          )}

          {/* Confirm */}
          {members.length > 0 && (
            <button
              onClick={onConfirm}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold"
            >
              Confirm Members →
            </button>
          )}

        </div>
      </div>
    </div>
  );
}