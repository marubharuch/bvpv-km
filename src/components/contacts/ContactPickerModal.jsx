import { useEffect, useRef } from "react";
import ContactRow from "./ContactRow";

// ─────────────────────────────────────────────────────────────
// ContactPickerModal
//
// Thin modal shell — no logic, only rendering.
// All state comes from useContactPicker() called in StudentFormPage.
//
// Props:
//   contacts        — from useContactPicker
//   loading         — from useContactPicker
//   error           — from useContactPicker
//   onPickFromDevice  — pickFromDevice from hook
//   onAddManual       — addManual from hook
//   onUpdateContact   — updateContact from hook
//   onRemoveContact   — removeContact from hook
//   onConfirm         — calls confirmContacts(), then closes if valid
//   onClose           — close modal without confirming
// ─────────────────────────────────────────────────────────────

export default function ContactPickerModal({
  contacts,
  loading,
  error,
  onPickFromDevice,
  onAddManual,
  onUpdateContact,
  onRemoveContact,
  onConfirm,
  onClose,
}) {
  // Track index of most-recently-added contact to autoFocus it
  const prevLengthRef = useRef(contacts.length);
  const newRowIndex = contacts.length > prevLengthRef.current
    ? contacts.length - 1
    : null;
  useEffect(() => {
    prevLengthRef.current = contacts.length;
  }, [contacts.length]);

  // Scroll new row into view
  const newRowRef = useRef(null);
  useEffect(() => {
    if (newRowRef.current) {
      newRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [contacts.length]);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end justify-center z-[9999]"
      style={{ animation: "fadeIn 0.2s ease-out" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: "92vh", animation: "slideUp 0.28s cubic-bezier(.22,.61,.36,1)" }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Sticky Header ── */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Family Contacts</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {contacts.length === 0
                ? "Pick from phone or add manually"
                : `${contacts.length} contact${contacts.length > 1 ? "s" : ""} — fill name & mobile`}

            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xl hover:bg-gray-200 transition-colors"
          >×</button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {contacts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-5xl mb-3">👨‍👩‍👧</p>
              <p className="text-sm text-gray-400">No contacts yet — use the buttons below</p>
            </div>
          ) : (
            contacts.map((c, i) => (
              <div
                key={i}
                ref={i === contacts.length - 1 ? newRowRef : null}
                style={{ animation: "rowIn 0.2s ease-out both", animationDelay: `${i * 0.04}s` }}
              >
                <ContactRow
                  contact={c}
                  index={i}
                  onChange={(field, value) => onUpdateContact(i, field, value)}
                  onRemove={() => onRemoveContact(i)}
                  autoFocus={i === newRowIndex}
                />
              </div>
            ))
          )}
        </div>

        {/* ── Sticky Footer ── */}
        <div className="flex-shrink-0 px-4 pb-6 pt-3 border-t border-gray-100 space-y-3 bg-white">

          {/* Pick + Add Manual */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onPickFromDevice}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold text-sm hover:border-indigo-400 hover:text-indigo-600 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              {loading
                ? <span className="animate-spin">⏳</span>
                : <><span>📱</span><span>Pick from Phone</span></>}
            </button>
            <button
              type="button"
              onClick={onAddManual}
              className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-2xl font-semibold text-sm hover:border-indigo-400 hover:text-indigo-600 active:scale-95 transition-all shadow-sm"
            >
              <span className="text-base font-bold">+</span>
              <span>Add Manual</span>
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <p className="text-red-600 text-sm font-medium">⚠ {error}</p>
            </div>
          )}

          {/* Confirm — only when contacts exist */}
          {contacts.length > 0 && (
            <button
              type="button"
              onClick={onConfirm}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-green-700 active:scale-95 transition-all shadow-lg"
            >
              Confirm {contacts.length} Contact{contacts.length > 1 ? "s" : ""} →
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes rowIn   { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
